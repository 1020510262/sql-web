from datetime import datetime

from pydantic import BaseModel, ConfigDict


class QueryHistoryCreate(BaseModel):
    database_id: int
    sql: str
    execution_time_ms: int
    status: str


class QueryHistoryResponse(BaseModel):
    id: int
    database_id: int
    database_name: str
    sql_text: str
    execution_time_ms: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
