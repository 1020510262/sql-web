from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Role, User
from app.schemas.auth import RoleResponse, UserCreate, UserSummary
from app.services.auth import require_admin
from app.services.security import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/roles", response_model=List[RoleResponse])
def list_roles(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Role).order_by(Role.name.asc()).all()


@router.post("", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    role = db.query(Role).filter(Role.name == payload.role_name).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    user = User(
        username=payload.username,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role_id=role.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserSummary(id=user.id, username=user.username, full_name=user.full_name, role=role.name)
