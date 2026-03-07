from sqlalchemy import inspect, text

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, databases, history, templates, users
from app.core.config import settings
from app.db.session import Base, engine


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

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(databases.router)
app.include_router(templates.router)
app.include_router(history.router)
app.include_router(users.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
