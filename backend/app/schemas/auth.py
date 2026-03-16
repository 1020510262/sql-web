from typing import Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserSummary"


class UserSummary(BaseModel):
    id: int
    username: str
    full_name: str
    role: str


class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role_name: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()
