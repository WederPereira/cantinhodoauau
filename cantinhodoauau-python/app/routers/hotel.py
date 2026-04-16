from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from datetime import datetime

router = APIRouter(prefix="/hotel", tags=["hotel"])

@router.get("/stays", response_model=List[schemas.HotelStay])
def get_hotel_stays(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(models.HotelStay)
    if active_only:
        query = query.filter(models.HotelStay.active == True)
    return query.all()

@router.post("/stays", response_model=schemas.HotelStay)
def create_hotel_stay(stay: schemas.HotelStayCreate, db: Session = Depends(get_db)):
    db_stay = models.HotelStay(**stay.model_dump())
    db.add(db_stay)
    db.commit()
    db.refresh(db_stay)
    return db_stay

@router.post("/stays/{stay_id}/meals", response_model=schemas.HotelMeal)
def add_meal(stay_id: str, meal: schemas.HotelMealBase, db: Session = Depends(get_db)):
    db_meal = models.HotelMeal(**meal.model_dump(), hotel_stay_id=stay_id)
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal

@router.post("/stays/{stay_id}/medications", response_model=schemas.HotelMedication)
def add_medication(stay_id: str, med: schemas.HotelMedicationBase, db: Session = Depends(get_db)):
    db_med = models.HotelMedication(**med.model_dump(), hotel_stay_id=stay_id)
    db.add(db_med)
    db.commit()
    db.refresh(db_med)
    return db_med

@router.put("/stays/{stay_id}/checkout")
def checkout(stay_id: str, db: Session = Depends(get_db)):
    db_stay = db.query(models.HotelStay).filter(models.HotelStay.id == stay_id).first()
    if not db_stay:
        raise HTTPException(status_code=404, detail="Estadia não encontrada")
    db_stay.active = False
    db_stay.check_out = datetime.utcnow()
    db.commit()
    return {"message": "Check-out realizado com sucesso"}
