from fastapi import APIRouter, HTTPException, Header
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
async def get_goals(authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization.removeprefix("Bearer ")} if authorization else {}
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{PB_URL}/api/collections/goals/records",
            params={},
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch goals")
        return response.json()

@router.get("/{goal_id}")
async def get_goal(goal_id: str, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization.removeprefix("Bearer ")} if authorization else {}
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{PB_URL}/api/collections/goals/records/{goal_id}",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Goal not found")
        return response.json()

@router.post("/")
async def create_goal(goal: GoalCreate, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization.removeprefix("Bearer ")} if authorization else {}
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PB_URL}/api/collections/goals/records",
            json={
                "user_id": goal.user_id,
                "title": goal.title,
                "goal_type": goal.category,
                "description": goal.description,
                "start_date": goal.start_date,
                "end_date": goal.end_date
            },
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=response.text)
        return response.json()

@router.patch("/{goal_id}")
async def update_goal(goal_id: str, goal: GoalUpdate, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization.removeprefix("Bearer ")} if authorization else {}
    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{PB_URL}/api/collections/goals/records/{goal_id}",
            json=goal.model_dump(exclude_none=True),
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to update goal")
        return response.json()

@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization.removeprefix("Bearer ")} if authorization else {}
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{PB_URL}/api/collections/goals/records/{goal_id}",
            headers=headers
        )
        if response.status_code != 204:
            raise HTTPException(status_code=400, detail="Failed to delete goal")
        return {"status": "success"}
