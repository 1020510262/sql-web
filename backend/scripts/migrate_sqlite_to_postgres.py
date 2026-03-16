import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.models import models

SQLITE_URL = os.environ.get("SQLITE_DATABASE_URL", "sqlite:///./sql_central_console.db")
POSTGRES_URL = os.environ.get("DATABASE_URL")


def main() -> None:
    if not POSTGRES_URL:
        raise SystemExit("DATABASE_URL is required and must point to PostgreSQL")
    if "postgres" not in POSTGRES_URL:
        raise SystemExit("DATABASE_URL must be a PostgreSQL DSN")

    sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    pg_engine = create_engine(POSTGRES_URL)

    sqlite_session = sessionmaker(bind=sqlite_engine)()
    pg_session = sessionmaker(bind=pg_engine)()

    try:
        # Ensure schema exists on Postgres.
        models.Base.metadata.create_all(bind=pg_engine)

        # Clear destination tables in a safe order.
        pg_session.execute(
            text(
                "TRUNCATE TABLE query_history, sql_templates, database_permissions, databases, users, roles RESTART IDENTITY CASCADE"
            )
        )
        pg_session.commit()

        def copy_table(model) -> None:
            rows = sqlite_session.query(model).all()
            for row in rows:
                pg_session.merge(row)
            pg_session.commit()

        copy_table(models.Role)
        copy_table(models.User)
        copy_table(models.Database)
        copy_table(models.DatabasePermission)
        copy_table(models.SQLTemplate)
        copy_table(models.QueryHistory)
    finally:
        sqlite_session.close()
        pg_session.close()

    print("Migration complete.")


if __name__ == "__main__":
    sys.exit(main())
