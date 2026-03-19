from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import SQLTemplate, User
from app.schemas.template import SQLTemplateCreate, SQLTemplateDeleteResponse, SQLTemplateResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=List[SQLTemplateResponse])
def list_templates(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(SQLTemplate, User.full_name)
        .join(User, User.id == SQLTemplate.created_by)
        .filter((SQLTemplate.created_by == current_user.id) | (User.role.has(name="admin")))
        .order_by(SQLTemplate.created_at.desc())
        .all()
    )
    return [
        SQLTemplateResponse(
            id=template.id,
            name=template.name,
            category=template.category,
            sql_content=template.sql_content,
            parameter_schema=template.parameter_schema,
            created_at=template.created_at,
            created_by_name=creator_name,
        )
        for template, creator_name in rows
    ]


@router.post("", response_model=SQLTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(payload: SQLTemplateCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.name.strip() == "":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Template title is required")
    if payload.sql_content.strip() == "":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SQL content is required")

    template = SQLTemplate(
        name=payload.name.strip(),
        category=payload.category.strip() or "default",
        sql_content=payload.sql_content,
        parameter_schema=payload.parameter_schema,
        created_by=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return SQLTemplateResponse(
        id=template.id,
        name=template.name,
        category=template.category,
        sql_content=template.sql_content,
        parameter_schema=template.parameter_schema,
        created_at=template.created_at,
        created_by_name=current_user.full_name,
    )


@router.delete("/{template_id}", response_model=SQLTemplateDeleteResponse)
def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = db.query(SQLTemplate).filter(SQLTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    if template.created_by != current_user.id and current_user.role.name != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    db.delete(template)
    db.commit()
    return SQLTemplateDeleteResponse(detail="Template deleted")
