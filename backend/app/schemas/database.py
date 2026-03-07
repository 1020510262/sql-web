from typing import Optional

from pydantic import BaseModel


class DatabaseResponse(BaseModel):
    id: int
    name: str
    group_name: Optional[str]
    type: str
    host: str
    port: int
    username: Optional[str]
    database_name: str
    description: Optional[str]

    class Config:
        from_attributes = True


class DatabaseCreate(BaseModel):
    name: str
    group_name: Optional[str] = None
    type: str
    host: str
    port: int
    username: Optional[str] = None
    database_name: str
    description: Optional[str] = None


class DatabaseUpdate(BaseModel):
    name: str
    group_name: Optional[str] = None
    type: str
    host: str
    port: int
    username: Optional[str] = None
    database_name: str
    description: Optional[str] = None
