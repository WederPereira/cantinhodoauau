from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime
import uuid

class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tutor_name = Column(String)
    tutor_phone = Column(String)
    tutor_email = Column(String)
    tutor_address = Column(String)
    tutor_neighborhood = Column(String)
    tutor_cpf = Column(String)
    
    name = Column(String, index=True)
    breed = Column(String)
    pet_size = Column(String) 
    weight = Column(Float)
    birth_date = Column(DateTime)
    photo = Column(String)
    gender = Column(String) 
    castrated = Column(Boolean, default=False)
    entry_date = Column(DateTime, default=datetime.utcnow)
    
    last_gripe = Column(DateTime)
    last_v10 = Column(DateTime)
    last_raiva = Column(DateTime)
    last_giardia = Column(DateTime)
    last_antipulgas = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vaccine_history = relationship("VaccineRecord", back_populates="client", cascade="all, delete-orphan")
    flea_history = relationship("FleaRecord", back_populates="client", cascade="all, delete-orphan")
    hotel_stays = relationship("HotelStay", back_populates="client", cascade="all, delete-orphan")

class VaccineRecord(Base):
    __tablename__ = "vaccine_records"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String, ForeignKey("clients.id"))
    type = Column(String) 
    date = Column(DateTime)
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="vaccine_history")

class FleaRecord(Base):
    __tablename__ = "flea_records"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String, ForeignKey("clients.id"))
    date = Column(DateTime)
    brand = Column(String)
    duration_months = Column(Integer)
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="flea_history")

class HotelStay(Base):
    __tablename__ = "hotel_stays"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("clients.id"))
    dog_name = Column(String)
    tutor_name = Column(String)
    check_in = Column(DateTime, default=datetime.utcnow)
    check_out = Column(DateTime)
    expected_checkout = Column(DateTime)
    active = Column(Boolean, default=True)
    ate = Column(Boolean, default=False)
    observations = Column(String)
    belonging_labels = Column(JSON)
    belongings_photos = Column(JSON) # List of strings

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="hotel_stays")
    meals = relationship("HotelMeal", back_populates="stay", cascade="all, delete-orphan")
    medications = relationship("HotelMedication", back_populates="stay", cascade="all, delete-orphan")

class HotelMeal(Base):
    __tablename__ = "hotel_meals"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    hotel_stay_id = Column(String, ForeignKey("hotel_stays.id"))
    date = Column(DateTime, default=datetime.utcnow)
    meal_type = Column(String) # 'morning', 'afternoon', 'evening'
    ate = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stay = relationship("HotelStay", back_populates="meals")

class HotelMedication(Base):
    __tablename__ = "hotel_medications"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    hotel_stay_id = Column(String, ForeignKey("hotel_stays.id"))
    medication_name = Column(String)
    scheduled_time = Column(String)
    recurrence = Column(String)
    administered = Column(Boolean, default=False)
    administered_at = Column(DateTime)
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    stay = relationship("HotelStay", back_populates="medications")

class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    action = Column(String)
    entity_type = Column(String)
    entity_id = Column(String)
    details = Column(JSON)
    user_name = Column(String)
    user_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class QREntry(Base):
    __tablename__ = "qr_entries"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    dog = Column(String)
    tutor = Column(String)
    raca = Column(String)
    data_hora = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
