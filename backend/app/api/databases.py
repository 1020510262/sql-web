from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Database, DatabasePermission, Role, User
from app.schemas.database import DatabaseCreate, DatabaseResponse, DatabaseUpdate
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/databases", tags=["databases"])


def get_manageable_query(current_user: User, db: Session):
    query = db.query(Database).filter(Database.is_active.is_(True))
    if current_user.role.name == "admin":
        return query
    return query.filter(Database.created_by_user_id == current_user.id)


def get_manageable_database(current_user: User, db: Session, database_id: int) -> Database:
    database = get_manageable_query(current_user, db).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Database not found or no permission")
    return database


@router.get("", response_model=List[DatabaseResponse])
def list_databases(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = (
        db.query(Database)
        .join(DatabasePermission, DatabasePermission.database_id == Database.id)
        .filter(DatabasePermission.role_id == current_user.role_id, Database.is_active.is_(True))
        .order_by(Database.name.asc())
    )
    return query.all()


@router.get("/manage", response_model=List[DatabaseResponse])
def list_manageable_databases(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_manageable_query(current_user, db).order_by(Database.name.asc()).all()


@router.post("", response_model=DatabaseResponse, status_code=status.HTTP_201_CREATED)
def create_database(payload: DatabaseCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exists = db.query(Database).filter(Database.name == payload.name).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Database name already exists")

    database = Database(
        name=payload.name,
        group_name=payload.group_name,
        type=payload.type,
        host=payload.host,
        port=payload.port,
        username=payload.username,
        database_name=payload.database_name,
        description=payload.description,
        is_active=True,
        created_by_user_id=current_user.id,
    )
    db.add(database)
    db.commit()
    db.refresh(database)

    role_ids = {current_user.role_id}
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if admin_role:
        role_ids.add(admin_role.id)
    for role_id in role_ids:
        exists = (
            db.query(DatabasePermission)
            .filter(DatabasePermission.role_id == role_id, DatabasePermission.database_id == database.id)
            .first()
        )
        if not exists:
            db.add(DatabasePermission(role_id=role_id, database_id=database.id))
    db.commit()

    return database


@router.patch("/{database_id}", response_model=DatabaseResponse)
def update_database(database_id: int, payload: DatabaseUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    database = get_manageable_database(current_user, db, database_id)

    duplicate = db.query(Database).filter(Database.name == payload.name, Database.id != database_id).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Database name already exists")

    database.name = payload.name
    database.group_name = payload.group_name
    database.type = payload.type
    database.host = payload.host
    database.port = payload.port
    database.username = payload.username
    database.database_name = payload.database_name
    database.description = payload.description
    db.commit()
    db.refresh(database)
    return database


@router.post("/{database_id}/disable", response_model=DatabaseResponse)
def disable_database(database_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    database = get_manageable_database(current_user, db, database_id)
    database.is_active = False
    db.commit()
    db.refresh(database)
    return database
