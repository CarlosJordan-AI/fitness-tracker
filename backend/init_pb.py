import httpx
import asyncio
import os

PB_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")
ADMIN_EMAIL = os.getenv("POCKETBASE_ADMIN_EMAIL", "admin@fit.com")
ADMIN_PASSWORD = os.getenv("POCKETBASE_ADMIN_PASSWORD", "Admin1234!")

async def init_pocketbase():
    print(f"Initializing PocketBase at {PB_URL}...")
    async with httpx.AsyncClient() as client:
        # 1. Wait for PocketBase
        for _ in range(20):
            try:
                if (await client.get(f"{PB_URL}/api/health")).status_code == 200: break
            except: pass
            await asyncio.sleep(2)

        # 2. Aggressive Authentication
        auth_token = None
        # Try new Superuser endpoint first, then old Admin endpoint
        endpoints = ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]
        
        for ep in endpoints:
            try:
                r = await client.post(f"{PB_URL}{ep}", json={"identity": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
                if r.status_code == 200:
                    auth_token = r.json().get("token")
                    print(f"SUCCESS: Authenticated via {ep}")
                    break
            except: pass
            
        if not auth_token:
            print(f"ERROR: Could not authenticate. Please ensure admin {ADMIN_EMAIL} exists with the correct password.")
            return

        headers = {"Authorization": auth_token}

        # 3. Ensure Collections Exist
        collections = ["goals", "progress_logs", "ai_chats"]
        for name in collections:
            # Check if collection exists
            r = await client.get(f"{PB_URL}/api/collections/{name}", headers=headers)
            if r.status_code != 200:
                print(f"Creating missing collection: {name}")
                # We'll use a basic schema and rely on the app to handle details
                schema = []
                if name == "goals":
                    schema = [
                        {"name": "user_id", "type": "relation", "required": True, "options": {"collectionId": "users", "maxSelect": 1}},
                        {"name": "title", "type": "text", "required": True},
                        {"name": "category", "type": "text"},
                        {"name": "ai_plan", "type": "text"}
                    ]
                elif name == "progress_logs":
                    schema = [
                        {"name": "goal_id", "type": "relation", "required": True, "options": {"collectionId": "goals", "maxSelect": 1}},
                        {"name": "user_id", "type": "relation", "required": True, "options": {"collectionId": "users", "maxSelect": 1}},
                        {"name": "value", "type": "number", "required": True},
                        {"name": "unit", "type": "text"}
                    ]
                
                await client.post(f"{PB_URL}/api/collections", headers=headers, json={
                    "name": name,
                    "type": "base",
                    "schema": schema,
                    "listRule": "@request.auth.id != ''",
                    "viewRule": "@request.auth.id != ''",
                    "createRule": "@request.auth.id != ''",
                    "updateRule": "user_id = @request.auth.id",
                    "deleteRule": "user_id = @request.auth.id"
                })
            else:
                print(f"Collection {name} confirmed.")

        print("PocketBase fully initialized.")

if __name__ == "__main__":
    asyncio.run(init_pocketbase())
