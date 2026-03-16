from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Role, User
from app.schemas.auth import PasswordChangeRequest, RoleResponse, UserCreate, UserSummary
from app.services.auth import get_current_user, require_admin
from app.services.security import hash_password, verify_password

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


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different")

    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    return None
