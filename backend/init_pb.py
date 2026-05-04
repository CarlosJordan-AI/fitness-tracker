import httpx
import asyncio
import os

PB_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")
ADMIN_EMAIL = os.getenv("POCKETBASE_ADMIN_EMAIL", "admin@fit.com")
ADMIN_PASSWORD = os.getenv("POCKETBASE_ADMIN_PASSWORD", "Fitness123!")

async def init_pocketbase():
    print(f"Initializing PocketBase at {PB_URL}...")
    async with httpx.AsyncClient() as client:
        # 1. Wait for PocketBase
        for _ in range(30):
            try:
                if (await client.get(f"{PB_URL}/api/health")).status_code == 200: break
            except: pass
            await asyncio.sleep(2)

        # 2. Authenticate or Create Admin
        try:
            await client.post(f"{PB_URL}/api/admins", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "passwordConfirm": ADMIN_PASSWORD})
        except: pass
        
        auth_resp = await client.post(f"{PB_URL}/api/admins/auth-with-password", json={"identity": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if auth_resp.status_code != 200:
            print("Failed to authenticate as admin.")
            return
        headers = {"Authorization": auth_resp.json()["token"]}

        # 3. Define Collections
        collections = [
            {
                "name": "goals",
                "schema": [
                    {"name": "user_id", "type": "relation", "required": True, "options": {"collectionId": "_pb_users_auth_", "maxSelect": 1}},
                    {"name": "title", "type": "text", "required": True},
                    {"name": "category", "type": "text"},
                    {"name": "description", "type": "text"},
                    {"name": "start_date", "type": "date"},
                    {"name": "end_date", "type": "date"},
                    {"name": "is_active", "type": "bool"},
                    {"name": "ai_plan", "type": "text"}
                ]
            },
            {
                "name": "progress_logs",
                "schema": [
                    {"name": "goal_id", "type": "relation", "required": True, "options": {"collectionId": "goals", "maxSelect": 1}},
                    {"name": "user_id", "type": "relation", "required": True, "options": {"collectionId": "_pb_users_auth_", "maxSelect": 1}},
                    {"name": "value", "type": "number", "required": True},
                    {"name": "unit", "type": "text"},
                    {"name": "note", "type": "text"}
                ]
            },
            {
                "name": "ai_chats",
                "schema": [
                    {"name": "goal_id", "type": "relation", "required": True, "options": {"collectionId": "goals", "maxSelect": 1}},
                    {"name": "user_id", "type": "relation", "required": True, "options": {"collectionId": "_pb_users_auth_", "maxSelect": 1}},
                    {"name": "role", "type": "text"},
                    {"name": "message", "type": "text"}
                ]
            }
        ]

        for coll in collections:
            # Check if exists
            check = await client.get(f"{PB_URL}/api/collections/{coll['name']}", headers=headers)
            if check.status_code != 200:
                print(f"Creating collection: {coll['name']}")
                await client.post(f"{PB_URL}/api/collections", headers=headers, json={
                    **coll,
                    "type": "base",
                    "listRule": "@request.auth.id != ''",
                    "viewRule": "@request.auth.id != ''",
                    "createRule": "@request.auth.id != ''",
                    "updateRule": "@request.auth.id != ''",
                    "deleteRule": "@request.auth.id != ''"
                })
            else:
                print(f"Updating collection: {coll['name']}")
                await client.patch(f"{PB_URL}/api/collections/{coll['name']}", headers=headers, json=coll)

        print("PocketBase fully initialized.")

if __name__ == "__main__":
    asyncio.run(init_pocketbase())
