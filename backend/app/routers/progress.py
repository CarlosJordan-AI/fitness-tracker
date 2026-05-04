from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import random

router = APIRouter()

PB_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")

class ProgressCreate(BaseModel):
    user_id: str
    goal_id: str
    value: float
    unit: str
    note: Optional[str] = None

@router.get("/{goal_id}/summary")
async def get_progress_summary(goal_id: str, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization.removeprefix("Bearer ")} if authorization else {}
    async with httpx.AsyncClient() as client:
        goal_resp = await client.get(
            f"{PB_URL}/api/collections/goals/records/{goal_id}",
            headers=headers
        )
        if not goal_resp.is_success:
            raise HTTPException(status_code=goal_resp.status_code, detail=f"Goal not found or access denied: {goal_resp.text}")
        goal_data = goal_resp.json()
        category = goal_data.get("category", "weight_loss")
        target_value = goal_data.get("target_value")

        logs_resp = await client.get(
            f"{PB_URL}/api/collections/progress_logs/records",
            params={
                "filter": f"goal_id='{goal_id}'",
                
            },
            headers=headers
        )
        if not logs_resp.is_success:
            raise HTTPException(status_code=logs_resp.status_code, detail=f"Failed to fetch progress logs: {logs_resp.text}")
        
        logs_data = logs_resp.json()
        items = logs_data.get("items", [])
        all_logs_count = len(items)

        if all_logs_count == 0:
            return {
                "category": category,
                "first_value": None,
                "latest_value": None,
                "primary_unit": None,
                "total_change": 0,
                "percent_change": 0,
                "all_logs_count": 0,
                "primary_logs_count": 0,
                "progress_percent": 0
            }

        # Identify Primary Metric
        category_to_units = {
            "weight_loss": ["kg", "lb", "lbs"],
            "muscle_gain": ["kg", "lb", "lbs"],
            "endurance": ["km", "miles", "min"],
            "flexibility": ["cm", "inches", "deg"]
        }
        suggested_units = category_to_units.get(category, [])
        unit_counts = {}
        for item in items:
            u = str(item.get("unit", "")).lower()
            unit_counts[u] = unit_counts.get(u, 0) + 1
        
        primary_unit = None
        for u in suggested_units:
            if u in unit_counts:
                primary_unit = u
                break
        
        if not primary_unit and unit_counts:
            primary_unit = max(unit_counts, key=unit_counts.get)
        
        primary_logs = [i for i in items if str(i.get("unit", "")).lower() == primary_unit]
        primary_logs_count = len(primary_logs)

        if primary_logs_count == 0:
            return {
                "category": category,
                "first_value": None,
                "latest_value": None,
                "primary_unit": primary_unit,
                "total_change": 0,
                "percent_change": 0,
                "all_logs_count": all_logs_count,
                "primary_logs_count": 0,
                "progress_percent": 0
            }

        first_value = float(primary_logs[0]["value"])
        latest_value = float(primary_logs[-1]["value"])
        
        total_change = latest_value - first_value
        percent_change = ((latest_value - first_value) / first_value * 100) if first_value != 0 else 0
        
        if primary_logs_count == 1:
            progress_percent = random.randint(10, 15)
        else:
            if category == "weight_loss":
                # For weight loss, decrease is progress
                if target_value is not None and float(target_value) < first_value:
                    progress_percent = ((first_value - latest_value) / (first_value - float(target_value))) * 100
                else:
                    progress_percent = ((first_value - latest_value) / first_value) * 100 if first_value != 0 else 0
            else:
                # For others, increase is usually progress
                if target_value is not None and float(target_value) > first_value:
                    progress_percent = ((latest_value - first_value) / (float(target_value) - first_value)) * 100
                else:
                    progress_percent = ((latest_value - first_value) / first_value) * 100 if first_value != 0 else 0
                    
        progress_percent = max(0, min(100, progress_percent))
        
        return {
            "category": category,
            "first_value": first_value,
            "latest_value": latest_value,
            "primary_unit": primary_unit,
            "total_change": total_change,
            "percent_change": percent_change,
            "all_logs_count": all_logs_count,
            "primary_logs_count": primary_logs_count,
            "progress_percent": progress_percent,
            "history": [{"value": i["value"], "unit": i.get("unit", ""), "created": i.get("created", i.get("date", ""))} for i in primary_logs]
        }

@router.get("/{goal_id}")
async def get_progress(goal_id: str, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization.removeprefix("Bearer ")} if authorization else {}
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{PB_URL}/api/collections/progress_logs/records",
            params={
                "filter": f"goal_id='{goal_id}'",
                
            },
            headers=headers
        )
        if not response.is_success:
            raise HTTPException(status_code=400, detail=f"PB said: {response.status_code} - {response.text}")
        return response.json()

@router.post("/")
async def log_progress(progress: ProgressCreate, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization.removeprefix("Bearer ")} if authorization else {}
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PB_URL}/api/collections/progress_logs/records",
            json={
                "user_id": progress.user_id,
                "goal_id": progress.goal_id,
                "value": progress.value,
                "unit": progress.unit,
                "note": progress.note,
                "notes": progress.note  # Support both singular and plural for safety
            },
            headers=headers
        )
        if not response.is_success:
            raise HTTPException(status_code=response.status_code, detail=f"Failed to log progress: {response.text}")
        return response.json()