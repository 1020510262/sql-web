from sqlalchemy import inspect, text

from app.db.session import Base, SessionLocal, engine
from app.models.models import Database, DatabasePermission, Role, SQLTemplate, User
from app.services.security import hash_password


def ensure_column(table_name: str, column_name: str, ddl: str) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name not in columns:
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def ensure_runtime_schema() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_column("databases", "group_name", "group_name VARCHAR(100)")
    ensure_column("databases", "username", "username VARCHAR(100)")
    ensure_column("databases", "created_by_user_id", "created_by_user_id INTEGER")


ensure_runtime_schema()

db = SessionLocal()


def get_or_create_role(name: str, description: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role:
        return role
    role = Role(name=name, description=description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role



def get_or_create_user(username: str, full_name: str, password: str, role_id: int) -> User:
    user = db.query(User).filter(User.username == username).first()
    if user:
        return user
    user = User(
        username=username,
        full_name=full_name,
        password_hash=hash_password(password),
        role_id=role_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user



def get_or_create_database(
    name: str,
    group_name: str,
    db_type: str,
    host: str,
    port: int,
    username: str,
    database_name: str,
    description: str,
    created_by_user_id: int,
) -> Database:
    database = db.query(Database).filter(Database.name == name).first()
    if database:
        changed = False
        if database.group_name != group_name:
            database.group_name = group_name
            changed = True
        if database.username != username:
            database.username = username
            changed = True
        if database.created_by_user_id is None:
            database.created_by_user_id = created_by_user_id
            changed = True
        if changed:
            db.commit()
            db.refresh(database)
        return database
    database = Database(
        name=name,
        group_name=group_name,
        type=db_type,
        host=host,
        port=port,
        username=username,
        database_name=database_name,
        description=description,
        created_by_user_id=created_by_user_id,
    )
    db.add(database)
    db.commit()
    db.refresh(database)
    return database



def ensure_permission(role_id: int, database_id: int) -> None:
    exists = (
        db.query(DatabasePermission)
        .filter(DatabasePermission.role_id == role_id, DatabasePermission.database_id == database_id)
        .first()
    )
    if not exists:
        db.add(DatabasePermission(role_id=role_id, database_id=database_id))
        db.commit()


admin_role = get_or_create_role("admin", "Full access")
finance_role = get_or_create_role("finance", "Finance limited access")

admin = get_or_create_user("admin", "System Administrator", "admin123", admin_role.id)
get_or_create_user("finance", "Finance Analyst", "finance123", finance_role.id)

finance_db = get_or_create_database(
    "Finance System",
    "Business Systems",
    "mysql",
    "10.1.2.5",
    3306,
    "finance_user",
    "finance",
    "Finance production database",
    admin.id,
)
analytics_db = get_or_create_database(
    "Analytics Warehouse",
    "Data Platforms",
    "postgresql",
    "10.1.3.8",
    5432,
    "analytics_user",
    "analytics",
    "Analytics reporting warehouse",
    admin.id,
)
local_demo = get_or_create_database(
    "Local Demo SQLite",
    "Local Demos",
    "sqlite",
    "localhost",
    0,
    "",
    "demo.db",
    "Local demo database for MVP",
    admin.id,
)

ensure_permission(admin_role.id, finance_db.id)
ensure_permission(admin_role.id, analytics_db.id)
ensure_permission(admin_role.id, local_demo.id)
ensure_permission(finance_role.id, finance_db.id)

template = db.query(SQLTemplate).filter(SQLTemplate.name == "Query today's orders").first()
if not template:
    db.add(
        SQLTemplate(
            name="Query today's orders",
            category="orders",
            sql_content="SELECT * FROM orders WHERE created_at >= CURRENT_DATE;",
            parameter_schema='{"type":"object","properties":{}}',
            created_by=admin.id,
        )
    )
    db.commit()

print("Seed completed. Users: admin/admin123, finance/finance123")
db.close()
