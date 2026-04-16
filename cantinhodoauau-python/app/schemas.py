from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Any

class VaccineRecordBase(BaseModel):
    type: str
    date: datetime
    notes: Optional[str] = None

class VaccineRecord(VaccineRecordBase):
    id: int
    class Config:
        from_attributes = True

class FleaRecordBase(BaseModel):
    date: datetime
    brand: str
    duration_months: int
    notes: Optional[str] = None

class FleaRecord(FleaRecordBase):
    id: int
    class Config:
        from_attributes = True

class HotelMealBase(BaseModel):
    date: datetime
    meal_type: str
    ate: bool = False

class HotelMeal(HotelMealBase):
    id: str
    class Config:
        from_attributes = True

class HotelMedicationBase(BaseModel):
    medication_name: str
    scheduled_time: str
    recurrence: str
    administered: bool = False
    administered_at: Optional[datetime] = None
    notes: Optional[str] = None

class HotelMedication(HotelMedicationBase):
    id: str
    class Config:
        from_attributes = True

class HotelStayBase(BaseModel):
    client_id: str
    dog_name: str
    tutor_name: str
    check_in: Optional[datetime] = None
    expected_checkout: Optional[datetime] = None
    observations: Optional[str] = None
    belonging_labels: Optional[Any] = None
    belongings_photos: Optional[List[str]] = None

class HotelStayCreate(HotelStayBase):
    pass

class HotelStay(HotelStayBase):
    id: str
    active: bool
    ate: bool
    check_out: Optional[datetime] = None
    meals: List[HotelMeal] = []
    medications: List[HotelMedication] = []
    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    name: str
    tutor_name: str
    tutor_phone: Optional[str] = None
    tutor_email: Optional[str] = None
    tutor_address: Optional[str] = None
    tutor_neighborhood: Optional[str] = None
    tutor_cpf: Optional[str] = None
    breed: Optional[str] = None
    pet_size: Optional[str] = None
    weight: Optional[float] = None
    birth_date: Optional[datetime] = None
    gender: Optional[str] = None
    castrated: Optional[bool] = False
    entry_date: Optional[datetime] = None
    photo: Optional[str] = None

    # Denormalized vaccine dates
    last_gripe: Optional[datetime] = None
    last_v10: Optional[datetime] = None
    last_raiva: Optional[datetime] = None
    last_giardia: Optional[datetime] = None
    last_antipulgas: Optional[datetime] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: str
    last_gripe: Optional[datetime] = None
    last_v10: Optional[datetime] = None
    last_raiva: Optional[datetime] = None
    last_giardia: Optional[datetime] = None
    last_antipulgas: Optional[datetime] = None
    
    vaccine_history: List[VaccineRecord] = []
    flea_history: List[FleaRecord] = []
    hotel_stays: List[HotelStay] = []

    class Config:
        from_attributes = True

class ActionLogBase(BaseModel):
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[Any] = None
    user_name: str

class ActionLog(ActionLogBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True
