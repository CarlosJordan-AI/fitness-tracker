from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import os

router = APIRouter()

PB_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")

class GoalCreate(BaseModel):
    user_id: str
    title: str
    category: str
    description: Optional[str] = None
    start_date: str
    end_date: str

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    ai_plan: Optional[str] = None

@router.get("/")
async def get_goals():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{PB_URL}/api/collections/goals/records",
            params={"expand": "user_id", "sort": "-created"}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch goals")
        return response.json()

@router.get("/{goal_id}")
async def get_goal(goal_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{PB_URL}/api/collections/goals/records/{goal_id}",
            params={"expand": "user_id"}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Goal not found")
        return response.json()

@router.post("/")
async def create_goal(goal: GoalCreate):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PB_URL}/api/collections/goals/records",
            json={
                "user_id": goal.user_id,
                "title": goal.title,
                "category": goal.category,
                "description": goal.description,
                "start_date": goal.start_date,
                "end_date": goal.end_date,
                "is_active": True
            }
        )
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to create goal")
        return response.json()

@router.patch("/{goal_id}")
async def update_goal(goal_id: str, goal: GoalUpdate):
    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{PB_URL}/api/collections/goals/records/{goal_id}",
            json=goal.model_dump(exclude_none=True)
        )
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to update goal")
        return response.json()