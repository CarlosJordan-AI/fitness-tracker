from fastapi import APIRouter, HTTPException, Header
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
    goal_title: Optional[str] = "Goal"
    category: Optional[str] = "Fitness"
    description: Optional[str] = None


import json
import re

@router.post("/generate-plan")
async def generate_plan(request: PlanRequest, authorization: Optional[str] = Header(None)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"Fitness coach: 3-month plan for {request.goal_title}, {request.category}. Max 400 words. At the end, output a valid JSON block like {{\"target_value\": 150.0, \"target_unit\": \"lbs\", \"direction\": \"decrease\"}}"
    try:
        response = model.generate_content(prompt)
        text = response.text
        
        target_val = None
        plan_text = text
        try:
            match = re.search(r'\{[^{}]*"target_value"[^{}]*\}', text)
            if match:
                js_str = match.group(0)
                parsed = json.loads(js_str)
                target_val = parsed.get("target_value")
                plan_text = text.replace(match.group(0), "").replace("```json", "").replace("```", "").strip()
        except Exception:
            pass

        if target_val is not None:
            headers = {"Authorization": authorization} if authorization else {}
            async with httpx.AsyncClient() as client:
                await client.patch(
                    f"{PB_URL}/api/collections/goals/records/{request.goal_id}",
                    json={"target_value": float(target_val)},
                    headers=headers
                )

        return {"plan": plan_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/message")
async def send_message(chat: ChatMessage, authorization: Optional[str] = Header(None)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    headers = {"Authorization": authorization} if authorization else {}
    
    # Fetch progress history for context
    history_context = ""
    try:
        async with httpx.AsyncClient() as client:
            summary_resp = await client.get(
                f"{PB_URL}/api/collections/progress_logs/records",
                params={"filter": f'goal_id = "{chat.goal_id}"', "sort": "created"},
                headers=headers
            )
            # Actually we can just call our other router or replicate logic
            # Simpler: just get the logs directly
            if summary_resp.status_code == 200:
                logs = summary_resp.json().get("items", [])
                if logs:
                    # Focus on primary unit (most common)
                    units = [l["unit"] for l in logs]
                    main_unit = max(set(units), key=units.count)
                    main_logs = [l for l in logs if l["unit"] == main_unit]
                    history_str = " -> ".join([f"{l['value']}{l['unit']} ({str(l['created']).split(' ')[0]})" for l in main_logs])
                    history_context = f"\nUser's progress history: {history_str}"
    except Exception:
        pass

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")
    prompt = f"Fitness coach, brief reply max 150 words: {chat.message}{history_context}"
    try:
        response = model.generate_content(prompt)
        reply_text = response.text
        
        async with httpx.AsyncClient() as client:
            # save user message
            r1 = await client.post(
                f"{PB_URL}/api/collections/ai_chats/records",
                json={
                    "user_id": chat.user_id,
                    "goal_id": chat.goal_id,
                    "role": "user",
                    "message": chat.message
                },
                headers=headers
            )
            if r1.status_code != 200:
                raise HTTPException(status_code=400, detail=f"User save error: {r1.text}")

            # save coach reply
            r2 = await client.post(
                f"{PB_URL}/api/collections/ai_chats/records",
                json={
                    "user_id": chat.user_id,
                    "goal_id": chat.goal_id,
                    "role": "assistant",
                    "message": reply_text
                },
                headers=headers
            )
            if r2.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Coach save error: {r2.text}")
        
        return {"reply": reply_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{goal_id}")
async def get_history(goal_id: str, authorization: Optional[str] = Header(None)):
    headers = {"Authorization": authorization} if authorization else {}
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{PB_URL}/api/collections/ai_chats/records",
            params={"filter": f'goal_id="{goal_id}"', "sort": "created"},
            headers=headers
        )
        return r.json()