from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import httpx
import os
from google import genai

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
    goal_title: Optional[str] = "Goal"
    category: Optional[str] = "Fitness"
    description: Optional[str] = None

import json
import re

@router.post("/generate-plan")
async def generate_plan(request: PlanRequest, authorization: Optional[str] = Header(None)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt = f"Fitness coach: 3-month plan for {request.goal_title}, {request.category}. Max 400 words. At the end, output a valid JSON block like {{\"target_value\": 150.0, \"target_unit\": \"lbs\", \"direction\": \"decrease\"}}"
    
    try:
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        text = response.text
        plan_text = text
        target_value = None
        target_unit = None
        direction = None
        json_match = re.search(r'\{[^{}]*"target_value"[^{}]*\}', text)
        if json_match:
            try:
                meta = json.loads(json_match.group())
                target_value = meta.get("target_value")
                target_unit = meta.get("target_unit")
                direction = meta.get("direction")
                plan_text = text[:json_match.start()].strip()
            except:
                pass
        return {"plan": plan_text, "target_value": target_value, "target_unit": target_unit, "direction": direction}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message")
async def send_message(msg: ChatMessage, authorization: Optional[str] = Header(None)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    headers = {"Authorization": authorization.removeprefix("Bearer ")} if authorization else {}
    
    async with httpx.AsyncClient() as http:
        history_resp = await http.get(
            f"{PB_URL}/api/collections/ai_chats/records",
            params={"filter": f'goal_id="{msg.goal_id}"'},
            headers=headers
        )
        history = []
        if history_resp.status_code == 200:
            for item in history_resp.json().get("items", []):
                history.append({"role": item["role"], "text": item["message"]})
        
        client = genai.Client(api_key=GEMINI_API_KEY)
        conversation = "\n".join([f"{h['role']}: {h['text']}" for h in history[-6:]])
        prompt = f"You are a fitness coach. Conversation history:\n{conversation}\n\nUser: {msg.message}\n\nCoach:"
        
        try:
            response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
            reply = response.text
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
        await http.post(
            f"{PB_URL}/api/collections/ai_chats/records",
            json={"user_id": msg.user_id, "goal_id": msg.goal_id, "role": "user", "message": msg.message},
            headers=headers
        )
        await http.post(
            f"{PB_URL}/api/collections/ai_chats/records",
            json={"user_id": msg.user_id, "goal_id": msg.goal_id, "role": "assistant", "message": reply},
            headers=headers
        )
        return {"reply": reply}

@router.get("/history/{goal_id}")
async def get_chat_history(goal_id: str, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization.removeprefix("Bearer ")} if authorization else {}
    async with httpx.AsyncClient() as http:
        r = await http.get(
            f"{PB_URL}/api/collections/ai_chats/records",
            params={"filter": f'goal_id="{goal_id}"'},
            headers=headers
        )
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch chat history")
        return r.json()
