import csv
import os
import sys
from datetime import datetime
import uuid

# Adiciona o diretório pai ao path para poder importar o app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Client

def parse_date(date_str):
    if not date_str:
        return None
    clean = date_str.replace('(', '').replace(')', '').strip()
    if not clean:
        return None
    try:
        # Tenta formato DD/MM/YYYY
        return datetime.strptime(clean, "%d/%m/%Y")
    except ValueError:
        return None

def run_import(csv_path):
    if not os.path.exists(csv_path):
        print(f"Arquivo não encontrado: {csv_path}")
        return

    db = SessionLocal()
    try:
        with open(csv_path, mode='r', encoding='utf-8') as f:
            # Detecta separador
            sample = f.read(1024)
            f.seek(0)
            dialect = csv.Sniffer().sniff(sample)
            reader = csv.DictReader(f, dialect=dialect)
            
            headers = [h.lower() for h in reader.fieldnames]
            print(f"Colunas encontradas: {headers}")

            count = 0
            for row in reader:
                # Normaliza chaves para minúsculo
                row = {k.lower(): v for k, v in row.items()}
                
                dog_name = row.get('dog', '').strip()
                tutor_name = row.get('tutor', '').strip()

                if not dog_name:
                    continue

                # Verifica duplicados
                existing = db.query(Client).filter(
                    Client.name == dog_name,
                    Client.tutor_name == tutor_name
                ).first()
                if existing:
                    continue

                # Peso
                weight_str = row.get('peso', '').replace(',', '.')
                weight = float(weight_str) if weight_str else None

                client = Client(
                    id=str(uuid.uuid4()),
                    name=dog_name,
                    tutor_name=tutor_name,
                    tutor_phone=row.get('telefone', ''),
                    tutor_email=row.get('email', ''),
                    tutor_cpf=row.get('cpf', ''),
                    tutor_address=row.get('endereço', row.get('endereco', '')),
                    breed=row.get('raça', row.get('raca', '')),
                    weight=weight,
                    pet_size=row.get('porte'),
                    gender=row.get('gênero', row.get('genero')),
                    castrated=(row.get('castrado', '').lower() == 'sim'),
                    birth_date=parse_date(row.get('nascimento')),
                    entry_date=parse_date(row.get('entrada')) or datetime.utcnow(),
                    
                    # Vacinas
                    last_gripe=parse_date(row.get('gripe')),
                    last_v10=parse_date(row.get('v10')),
                    last_raiva=parse_date(row.get('raiva')),
                    last_giardia=parse_date(row.get('giardia')),
                    last_antipulgas=parse_date(row.get('antipulgas'))
                )
                
                db.add(client)
                count += 1

            db.commit()
            print(f"Importação concluída: {count} novos clientes inseridos.")

    except Exception as e:
        print(f"Erro durante a importação: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    csv_file = r'C:\Users\weder\Downloads\clientes_2026-04-06.csv'
    run_import(csv_file)
