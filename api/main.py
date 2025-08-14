"""
FastAPI wrapper pour l'API Timely.
Se concentre sur la récupération des événements pour générer des rapports d'activité.
"""

from fastapi import FastAPI, HTTPException
from typing import List, Dict, Any, Optional
import httpx
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from io import BytesIO
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from timely_to_excel import TimelyReport
from datetime import datetime, timedelta
import statistics
from collections import defaultdict
import holidays

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


class DataAnalysisRequest(BaseModel):
    from_date: str
    to_date: str
    client_filter: List[str] | None = None


@app.post("/analyze-data")
async def analyze_data(request: DataAnalysisRequest):
    """Analyse intelligente des données pour détecter anomalies et incohérences"""
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
        
        # Analyser les données
        analysis_result = analyze_data_intelligence(data, request.from_date, request.to_date)
        
        return analysis_result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'analyse des données: {str(e)}"
        )


def analyze_data_intelligence(data: Dict[datetime, List], from_date: str, to_date: str) -> Dict[str, Any]:
    """Algorithme d'intelligence des données pour détecter anomalies et incohérences"""
    
    # === ANALYSE STATISTIQUE DES PATTERNS ===
    
    # Calculer les heures par jour (tous clients confondus)
    daily_hours = []
    daily_work_data = {}
    
    for date, entries in data.items():
        if not entries:
            daily_hours.append(0)
            daily_work_data[date] = {"total_hours": 0, "clients": {}}
            continue
            
        # Analyser les entrées par client pour ce jour
        day_total_hours = 0
        day_clients = {}
        
        if isinstance(entries[0], tuple):
            # Grouper par client
            entries_by_client = defaultdict(list)
            for prefix, note in entries:
                client = prefix.strip("[]") if prefix else ""
                entries_by_client[client].append(note)
            
            # Calculer les heures par client
            for client, client_entries in entries_by_client.items():
                # Vérifier si c'est un jour OFF pour ce client
                all_off = all(note.strip() == "OFF" for note in client_entries)
                has_off = any(note.strip() == "OFF" for note in client_entries)
                
                if all_off:
                    client_hours = 0
                elif has_off:
                    client_hours = 0.5
                else:
                    client_hours = 1
                
                day_clients[client] = {
                    "hours": client_hours,
                    "notes": client_entries,
                    "all_off": all_off,
                    "has_off": has_off
                }
                day_total_hours += client_hours
        
        daily_hours.append(day_total_hours)
        daily_work_data[date] = {
            "total_hours": day_total_hours,
            "clients": day_clients
        }
    
    # Statistiques de base
    work_days = [h for h in daily_hours if h > 0]
    if work_days:
        avg_hours_per_day = statistics.mean(work_days)
        std_hours_per_day = statistics.stdev(work_days) if len(work_days) > 1 else 0
    else:
        avg_hours_per_day = 0
        std_hours_per_day = 0
    
    # === DÉTECTION D'ANOMALIES ===
    
    anomalies = []
    incoherences = []
    gaps = []
    
    # 1. Détection d'heures impossibles
    for date, day_data in daily_work_data.items():
        total_hours = day_data["total_hours"]
        
        if total_hours > 24:
            anomalies.append({
                "type": "heures_impossibles",
                "severity": "error",
                "date": date.strftime("%d/%m/%Y"),
                "message": f"Jour avec {total_hours}h totales (impossible > 24h)",
                "details": {
                    "heures_totales": total_hours,
                    "clients": day_data["clients"]
                }
            })
        
        elif total_hours < 0:
            anomalies.append({
                "type": "heures_negatives",
                "severity": "error",
                "date": date.strftime("%d/%m/%Y"),
                "message": f"Jour avec {total_hours}h totales (impossible < 0h)",
                "details": {
                    "heures_totales": total_hours,
                    "clients": day_data["clients"]
                }
            })
    
    # 2. Détection de jours suspects (basé sur les statistiques)
    if std_hours_per_day > 0:
        lower_threshold = avg_hours_per_day - (2 * std_hours_per_day)
        upper_threshold = avg_hours_per_day + (2 * std_hours_per_day)
        
        for date, day_data in daily_work_data.items():
            total_hours = day_data["total_hours"]
            
            if total_hours > 0:  # Ignorer les jours vides
                if total_hours < lower_threshold:
                    anomalies.append({
                        "type": "sous_activite",
                        "severity": "warning",
                        "date": date.strftime("%d/%m/%Y"),
                        "message": f"Jour avec {total_hours}h vs moyenne {avg_hours_per_day:.1f}h",
                        "details": {
                            "heures": total_hours,
                            "moyenne": avg_hours_per_day,
                            "seuil_bas": lower_threshold,
                            "ecart": f"{((total_hours - avg_hours_per_day) / avg_hours_per_day * 100):.0f}%"
                        }
                    })
                
                elif total_hours > upper_threshold:
                    anomalies.append({
                        "type": "sur_activite",
                        "severity": "info",
                        "date": date.strftime("%d/%m/%Y"),
                        "message": f"Jour avec {total_hours}h vs moyenne {avg_hours_per_day:.1f}h",
                        "details": {
                            "heures": total_hours,
                            "moyenne": avg_hours_per_day,
                            "seuil_haut": upper_threshold,
                            "ecart": f"{((total_hours - avg_hours_per_day) / avg_hours_per_day * 100):.0f}%"
                        }
                    })
    
    # 3. Détection de jours complètement vides (tous clients à 0h)
    from datetime import date as date_today
    
    for date, day_data in daily_work_data.items():
        if day_data["total_hours"] == 0:
            # Ignorer les jours dans le futur
            if date.date() > date_today.today():
                continue
                
            # Vérifier si c'est un weekend ou jour férié
            if date.weekday() >= 5:  # Weekend
                continue
            elif date in holidays.FR():  # Jour férié
                continue
            else:
                # Vérifier si c'est un jour OFF déclaré ou vraiment vide
                has_off_clients = any(
                    client_data.get("all_off", False) 
                    for client_data in day_data["clients"].values()
                )
                
                if has_off_clients:
                    # Jour OFF déclaré - normal
                    continue
                elif len(day_data["clients"]) == 0:
                    # Vraiment aucun client - suspect
                    anomalies.append({
                        "type": "jour_vide",
                        "severity": "warning",
                        "date": date.strftime("%d/%m/%Y"),
                        "message": "Jour de semaine sans aucune donnée client",
                        "details": {
                            "type_jour": "semaine",
                            "clients": day_data["clients"],
                            "raison": "Aucun client configuré pour cette date"
                        }
                    })
                else:
                    # Clients configurés mais tous à 0h - vérifier si c'est normal
                    all_clients_off = all(
                        client_data.get("all_off", False) 
                        for client_data in day_data["clients"].values()
                    )
                    
                    if not all_clients_off:
                        # Certains clients devraient avoir des heures
                        anomalies.append({
                            "type": "jour_suspect",
                            "severity": "info",
                            "date": date.strftime("%d/%m/%Y"),
                            "message": "Jour avec clients configurés mais 0h totales",
                            "details": {
                                "type_jour": "semaine",
                                "clients": day_data["clients"],
                                "raison": "Vérifier si c'est normal ou oubli de saisie"
                            }
                        })
    
    # 4. Détection de gaps temporels (périodes sans données)
    dates_list = sorted(data.keys())
    if len(dates_list) > 1:
        for i in range(len(dates_list) - 1):
            current_date = dates_list[i]
            next_date = dates_list[i + 1]
            expected_next = current_date + timedelta(days=1)
            
            if next_date != expected_next:
                gap_days = (next_date - current_date).days - 1
                if gap_days > 0:
                    gaps.append({
                        "debut": current_date.strftime("%d/%m/%Y"),
                        "fin": next_date.strftime("%d/%m/%Y"),
                        "duree": gap_days,
                        "message": f"{gap_days} jour(s) sans données entre {current_date.strftime('%d/%m/%Y')} et {next_date.strftime('%d/%m/%Y')}"
                    })
    
    # 5. Détection d'incohérences logiques
    for date, day_data in daily_work_data.items():
        for client, client_data in day_data["clients"].items():
            # Vérifier la cohérence des notes
            notes = client_data["notes"]
            hours = client_data["hours"]
            
            # Si OFF mais avec des notes détaillées
            if client_data["all_off"] and any(len(note.strip()) > 3 for note in notes):
                incoherences.append({
                    "type": "off_avec_notes",
                    "date": date.strftime("%d/%m/%Y"),
                    "client": client,
                    "message": f"Client {client} déclaré OFF mais avec notes détaillées",
                    "details": {
                        "heures": hours,
                        "notes": notes
                    }
                })
            
            # Si demi-journée mais pas de note OFF
            elif client_data["has_off"] and not any(note.strip() == "OFF" for note in notes):
                incoherences.append({
                    "type": "demi_journee_sans_off",
                    "date": date.strftime("%d/%m/%Y"),
                    "client": client,
                    "message": f"Client {client} en demi-journée mais pas de note OFF",
                    "details": {
                        "heures": hours,
                        "notes": notes
                    }
                })
    
    # === STATISTIQUES ET PATTERNS ===
    
    # Pattern hebdomadaire
    weekly_pattern = defaultdict(list)
    for date, day_data in daily_work_data.items():
        if day_data["total_hours"] > 0:
            weekday = date.strftime("%A")
            weekly_pattern[weekday].append(day_data["total_hours"])
    
    weekly_stats = {}
    for day, hours_list in weekly_pattern.items():
        if hours_list:
            weekly_stats[day] = {
                "moyenne": statistics.mean(hours_list),
                "min": min(hours_list),
                "max": max(hours_list),
                "nb_jours": len(hours_list)
            }
    
    # Résumé des métriques
    summary = {
        "periode": {
            "debut": from_date,
            "fin": to_date,
            "nb_jours": len(daily_hours)
        },
        "activite": {
            "jours_avec_activite": len(work_days),
            "jours_vides": daily_hours.count(0),
            "moyenne_heures_jour": round(avg_hours_per_day, 1),
            "ecart_type": round(std_hours_per_day, 1),
            "total_heures": sum(daily_hours)
        },
        "anomalies": {
            "total": len(anomalies),
            "par_severite": {
                "error": len([a for a in anomalies if a["severity"] == "error"]),
                "warning": len([a for a in anomalies if a["severity"] == "warning"]),
                "info": len([a for a in anomalies if a["severity"] == "info"])
            }
        }
    }
    
    return {
        "summary": summary,
        "anomalies": anomalies,
        "incoherences": incoherences,
        "gaps": gaps,
        "statistiques": {
            "pattern_hebdomadaire": weekly_stats,
            "distribution_quotidienne": {
                "moyenne": avg_hours_per_day,
                "ecart_type": std_hours_per_day,
                "seuils": {
                    "bas": round(avg_hours_per_day - (2 * std_hours_per_day), 1) if std_hours_per_day > 0 else 0,
                    "haut": round(avg_hours_per_day + (2 * std_hours_per_day), 1) if std_hours_per_day > 0 else 0
                }
            }
        },
        "donnees_jour": {
            date.strftime("%d/%m/%Y"): {
                "total_hours": day_data["total_hours"],
                "clients": {
                    client: {
                        "hours": client_data["hours"],
                        "notes": client_data["notes"]
                    }
                    for client, client_data in day_data["clients"].items()
                }
            }
            for date, day_data in daily_work_data.items()
        }
    }


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
                        # Trier les entrées du client (sort() modifie la liste en place)
                        client_entries.sort()
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
