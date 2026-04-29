content = open('app/routers/chat.py', 'w')
content.write("""from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import google.generativeai as genai

router = APIRouter()

PB_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


class ChatMessage(BaseModel):
    user_id: str
    goal_id: str
    message: str


class PlanRequest(BaseModel):
    user_id: str
    goal_id: str
    goal_title: str
    category: str
    description: Optional[str] = None


@router.post("/generate-plan")
async def generate_plan(request: PlanRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"Fitness coach: 3-month plan for {request.goal_title}, {request.category}. Max 400 words."
    try:
        response = model.generate_content(prompt)
        return {"plan": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/message")
async def send_message(chat: ChatMessage):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"Fitness coach, brief reply max 150 words: {chat.message}"
    try:
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{goal_id}")
async def get_history(goal_id: str):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{PB_URL}/api/collections/ai_chats/records",
            params={"filter": f'goal_id="{goal_id}"'}
        )
        return r.json()
""")
content.close()
print("Done")