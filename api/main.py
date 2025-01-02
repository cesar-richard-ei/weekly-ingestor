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

# Configuration
load_dotenv()
TIMELY_BASE_URL = "https://api.timelyapp.com/1.1"
OAUTH_CLIENT_ID = os.getenv("TIMELY_API_OAUTH_CLIENT_ID")
OAUTH_CLIENT_SECRET = os.getenv("TIMELY_API_OAUTH_SECRET")
TIMELY_EMAIL = os.getenv("TIMELY_EMAIL")
TIMELY_PASSWORD = os.getenv("TIMELY_PASSWORD")

app = FastAPI(
    title="Timely Events API",
    description="API simplifiée pour récupérer les événements Timely",
    version="1.0.0",
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
