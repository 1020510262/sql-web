from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Database, DatabasePermission, QueryHistory, User
from app.schemas.history import QueryHistoryCreate, QueryHistoryResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])


def get_authorized_database(db: Session, role_id: int, database_id: int) -> Optional[Database]:
    return (
        db.query(Database)
        .join(DatabasePermission, DatabasePermission.database_id == Database.id)
        .filter(Database.id == database_id, DatabasePermission.role_id == role_id)
        .first()
    )


@router.post("", response_model=QueryHistoryResponse)
def create_history(payload: QueryHistoryCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    database = get_authorized_database(db, current_user.role_id, payload.database_id)
    if not database:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Database access denied")

    record = QueryHistory(
        user_id=current_user.id,
        database_id=payload.database_id,
        sql_text=payload.sql,
        execution_time_ms=payload.execution_time_ms,
        status=payload.status,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return QueryHistoryResponse(
        id=record.id,
        database_id=record.database_id,
        database_name=database.name,
        sql_text=record.sql_text,
        execution_time_ms=record.execution_time_ms,
        status=record.status,
        created_at=record.created_at,
    )


@router.get("", response_model=List[QueryHistoryResponse])
def list_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(QueryHistory, Database.name)
        .join(Database, Database.id == QueryHistory.database_id)
        .filter(QueryHistory.user_id == current_user.id)
        .order_by(QueryHistory.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        QueryHistoryResponse(
            id=record.id,
            database_id=record.database_id,
            database_name=database_name,
            sql_text=record.sql_text,
            execution_time_ms=record.execution_time_ms,
            status=record.status,
            created_at=record.created_at,
        )
        for record, database_name in rows
    ]
