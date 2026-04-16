from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/clients", tags=["clients"])

@router.get("/", response_model=List[schemas.Client])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    clients = db.query(models.Client).offset(skip).limit(limit).all()
    return clients

@router.post("/", response_model=schemas.Client)
def create_client(client: schemas.ClientCreate, db: Session = Depends(get_db)):
    db_client = models.Client(**client.model_dump())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@router.get("/{client_id}", response_model=schemas.Client)
def read_client(client_id: str, db: Session = Depends(get_db)):
    db_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if db_client is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return db_client

@router.post("/{client_id}/vaccines/", response_model=schemas.VaccineRecord)
def add_vaccine(client_id: str, record: schemas.VaccineRecordBase, db: Session = Depends(get_db)):
    db_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    db_record = models.VaccineRecord(**record.model_dump(), client_id=client_id)
    db.add(db_record)
    
    # Update latest date on client
    if record.type == "gripe": db_client.last_gripe = record.date
    elif record.type == "v10": db_client.last_v10 = record.date
    elif record.type == "raiva": db_client.last_raiva = record.date
    elif record.type == "giardia": db_client.last_giardia = record.date
    
    db.commit()
    db.refresh(db_record)
    return db_record
