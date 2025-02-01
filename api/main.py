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


# Instance globale du client
timely_client = TimelyClient()


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
    return await timely_client.get_events(account_id, since, upto, page)


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
                        "project": "",
                        "duration": "0",
                        "description": "",
                        "type": "empty"
                    })
                elif entries[0][1] == "WEEKEND":
                    formatted_data.append({
                        "date": date.strftime("%d/%m/%Y"),
                        "project": "",
                        "duration": "0",
                        "description": "WEEKEND",
                        "type": "weekend"
                    })
                else:
                    # Vérifier si c'est un jour OFF complet ou une demi-journée
                    all_off = all(note[1].strip() == "OFF" for note in entries)
                    has_off = any(note[1].strip() == "OFF" for note in entries)
                    
                    # Récupérer le client depuis les entrées
                    project = next(
                        (e[0].strip("[]") for e in entries if e[0]),
                        ""
                    )
                    
                    formatted_data.append({
                        "date": date.strftime("%d/%m/%Y"),
                        "project": project,
                        "duration": "0" if all_off else "0.5" if has_off else "1",
                        "description": "\n\n".join(
                            f"{prefix} {note}" if prefix else note 
                            for prefix, note in entries
                        ),
                        "type": "off" if all_off else "half_off" if has_off else "work"
                    })
            return JSONResponse(content=formatted_data)
            
        # Générer le fichier Excel en mémoire
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
