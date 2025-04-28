"""
FastAPI wrapper pour l'API Timely.
Se concentre sur la récupération des événements pour générer des rapports d'activité.
"""

from fastapi import FastAPI, HTTPException
from typing import List, Dict, Any
import httpx
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from io import BytesIO
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from timely_to_excel import TimelyReport

# Configuration
load_dotenv()
TIMELY_BASE_URL = "https://api.timelyapp.com/1.1"
OAUTH_CLIENT_ID = os.getenv("TIMELY_API_OAUTH_CLIENT_ID")
OAUTH_CLIENT_SECRET = os.getenv("TIMELY_API_OAUTH_SECRET")
TIMELY_EMAIL = os.getenv("TIMELY_EMAIL")
TIMELY_PASSWORD = os.getenv("TIMELY_PASSWORD")
TIMELY_ACCOUNT_ID = os.getenv("TIMELY_ACCOUNT_ID")
API_URL = os.getenv("API_URL")

app = FastAPI(
    title="Timely Events API",
    description="API simplifiée pour récupérer les événements Timely",
    version="1.0.0",
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En prod, il faudrait spécifier les domaines exacts
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TimelyClient:
    """Client pour interagir avec l'API Timely"""

    def __init__(self):
        self.access_token = None

    async def ensure_auth(self):
        """S'assure qu'un token valide est disponible"""
        if not self.access_token:
            await self.authenticate()

    async def authenticate(self):
        """Authentification auprès de l'API Timely"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TIMELY_BASE_URL}/oauth/token",
                data={
                    "grant_type": "password",
                    "username": TIMELY_EMAIL,
                    "password": TIMELY_PASSWORD,
                    "client_id": OAUTH_CLIENT_ID,
                    "client_secret": OAUTH_CLIENT_SECRET,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if response.status_code == 200:
                self.access_token = response.json()["access_token"]
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Échec de l'authentification Timely",
                )

    async def get_clients(self, account_id: str) -> List[Dict]:
        """Récupère la liste des clients depuis l'API Timely"""
        await self.ensure_auth()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TIMELY_BASE_URL}/{account_id}/clients",
                headers={"Authorization": f"Bearer {self.access_token}"},
            )

            if response.status_code == 200:
                clients = response.json()
                return [client for client in clients if client.get("external_id") is None]
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Échec de la récupération des clients: {response.text}",
                )
                
    async def get_events(
        self, account_id: str, since: str, upto: str, page: int = 1
    ) -> List[Dict]:
        """Récupère les événements Timely pour une période donnée"""
        await self.ensure_auth()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TIMELY_BASE_URL}/{account_id}/events",
                params={"since": since, "upto": upto, "page": page, "per_page": 250},
                headers={"Authorization": f"Bearer {self.access_token}"},
            )

            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Erreur lors de la récupération des événements",
                )


# Initialisation du client Timely
timely_client = TimelyClient()


@app.get("/clients")
async def list_clients() -> List[Dict[str, Any]]:
    """Récupère la liste des clients disponibles dans Timely"""
    try:
        clients = await timely_client.get_clients(TIMELY_ACCOUNT_ID)
        return clients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/{account_id}/events")
async def list_events(
    account_id: str, since: str, upto: str, page: int = 1
) -> List[Dict[str, Any]]:
    """
    Récupère les événements Timely.

    - account_id: ID du compte Timely
    - since: Date de début (YYYY-MM-DD)
    - upto: Date de fin (YYYY-MM-DD)
    - page: Numéro de page (défaut: 1)
    """
    try:
        events = await timely_client.get_events(account_id, since, upto, page)
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ReportRequest(BaseModel):
    from_date: str
    to_date: str
    format: str = "excel"  # "excel" ou "json"
    client_filter: List[str] | None = None


@app.post("/generate-report")
async def generate_report(request: ReportRequest):
    """Génère un rapport pour la période donnée au format Excel ou JSON"""
    try:
        report = TimelyReport(TIMELY_ACCOUNT_ID, API_URL)
        # Récupérer tous les événements
        events = await report.get_events(request.from_date, request.to_date)
        # Filtrer pour ne garder que les événements des clients spécifiés
        filtered_events = (
            [
                e for e in events 
                if (e.get("project", {}).get("client", {}).get("name", "") 
                    in request.client_filter)
            ]
            if request.client_filter
            else events
        )
        # Traiter les événements filtrés
        data = report.process_events(filtered_events, request.from_date, request.to_date)

        if request.format == "json":
            # Transformer les données au format attendu par le frontend
            formatted_data = []
            for date, entries in sorted(data.items()):
                if not entries:
                    formatted_data.append({
                        "date": date.strftime("%d/%m/%Y"),
                        "client": "",
                        "duration": "0",
                        "description": "",
                        "type": "empty"
                    })
                elif entries[0][1] in ["WEEKEND", "HOLIDAY"]:
                    formatted_data.append({
                        "date": date.strftime("%d/%m/%Y"),
                        "client": "",
                        "duration": "0",
                        "description": entries[0][1],
                        "type": entries[0][1].lower()
                    })
                else:
                    # Grouper les entrées par client
                    entries_by_client = {}
                    for prefix, note in entries:
                        client = prefix.strip("[]") if prefix else ""
                        if client not in entries_by_client:
                            entries_by_client[client] = []
                        entries_by_client[client].append(note)

                    # Calculer la durée totale et créer la description
                    total_duration = 0
                    descriptions = []
                    clients = []
                    separator = "\n\n― ― ― ― ― ― ― ― ― ―\n\n"

                    for client, client_entries in entries_by_client.items():
                        # Vérifier si c'est un jour OFF pour ce client
                        all_off = all(note.strip() == "OFF" for note in client_entries)
                        has_off = any(note.strip() == "OFF" for note in client_entries)
                        duration = 0 if all_off else 0.5 if has_off else 1
                        total_duration += duration

                        if duration > 0:
                            clients.append(client)
                            descriptions.append("\n\n".join(client_entries))

                    formatted_data.append({
                        "date": date.strftime("%d/%m/%Y"),
                        "client": " + ".join(clients),
                        "duration": total_duration,
                        "description": separator.join(descriptions),
                        "type": "off" if all_off else "half_off" if has_off else "work"
                    })
            return JSONResponse(content=formatted_data)

        output = BytesIO()
        report.generate_excel(data, output)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=imputations_"
                f"{request.from_date[5:7].lower()}_{request.from_date[2:4]}.xlsx"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération du rapport: {str(e)}"
        )


@app.get("/health")
async def health_check():
    return JSONResponse(content={"status": "OK"}, status_code=200)
