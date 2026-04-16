from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("/", response_model=List[schemas.ActionLog])
def get_logs(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.ActionLog).order_by(models.ActionLog.created_at.desc()).limit(limit).all()

@router.post("/", response_model=schemas.ActionLog)
def create_log(log: schemas.ActionLogBase, db: Session = Depends(get_db)):
    db_log = models.ActionLog(**log.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
