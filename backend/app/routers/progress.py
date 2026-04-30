from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import httpx
import os

router = APIRouter()

PB_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")

class ProgressCreate(BaseModel):
    goal_id: str
    value: float
    unit: str
    note: Optional[str] = None

@router.get("/{goal_id}")
async def get_progress(goal_id: str, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization} if authorization else {}
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{PB_URL}/api/collections/progress_logs/records",
            params={
                "filter": f'goal_id="{goal_id}"',
                "sort": "-created"
            },
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch progress")
        return response.json()

@router.post("/")
async def log_progress(progress: ProgressCreate, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization} if authorization else {}
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PB_URL}/api/collections/progress_logs/records",
            json={
                "goal_id": progress.goal_id,
                "value": progress.value,
                "unit": progress.unit,
                "note": progress.note
            },
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to log progress")
        return response.json()