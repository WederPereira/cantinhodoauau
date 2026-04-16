from fastapi import FastAPI
from . import models
from .database import engine
from .routers import clients, hotel, logs
from fastapi.middleware.cors import CORSMiddleware

# Cria as tabelas no banco de dados automaticamente
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Cantinho do AuAu API - Python",
    description="Sistema completo de gestão para Pet Shop transcrito para Python/FastAPI",
    version="1.0.0"
)

# Configuração de CORS para permitir acesso do Frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro dos roteadores (separação de responsabilidades)
app.include_router(clients.router)
app.include_router(hotel.router)
app.include_router(logs.router)

@app.get("/")
def read_root():
    return {
        "message": "Bem-vindo à API Cantinho do AuAu (Python/FastAPI)",
        "docs": "/docs",
        "status": "online"
    }
