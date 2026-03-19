from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SQLTemplateResponse(BaseModel):
    id: int
    name: str
    category: str
    sql_content: str
    parameter_schema: Optional[str]
    created_at: datetime
    created_by_name: str

    class Config:
        from_attributes = True


class SQLTemplateCreate(BaseModel):
    name: str
    category: str = "default"
    sql_content: str
    parameter_schema: Optional[str] = None


class SQLTemplateDeleteResponse(BaseModel):
    detail: str
