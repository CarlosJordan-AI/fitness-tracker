import httpx
import asyncio
import os

PB_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")
ADMIN_EMAIL = os.getenv("POCKETBASE_ADMIN_EMAIL", "admin@fit.com")
ADMIN_PASSWORD = os.getenv("POCKETBASE_ADMIN_PASSWORD", "Fitness123!")

async def init_pocketbase():
    print(f"Initializing PocketBase (Superuser Mode) at {PB_URL}...")
    async with httpx.AsyncClient() as client:
        # 1. Wait for PocketBase to be ready
        for i in range(30):
            try:
                resp = await client.get(f"{PB_URL}/api/health")
                if resp.status_code == 200: break
            except: pass
            print(f"Waiting for PocketBase... ({i+1}/30)")
            await asyncio.sleep(2)

        # 2. Authenticate as Superuser (PB 0.22+)
        # We try both old and new endpoints to be safe
        auth_token = None
        for endpoint in ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]:
            try:
                auth_resp = await client.post(f"{PB_URL}{endpoint}", json={"identity": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
                if auth_resp.status_code == 200:
                    auth_token = auth_resp.json().get("token")
                    print(f"Authenticated via {endpoint}")
                    break
            except: pass
        
        if not auth_token:
            # Try creating first superuser if auth failed
            print("Auth failed, attempting to create first superuser...")
            try:
                await client.post(f"{PB_URL}/api/collections/_superusers/records", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "passwordConfirm": ADMIN_PASSWORD})
                auth_resp = await client.post(f"{PB_URL}/api/collections/_superusers/auth-with-password", json={"identity": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
                auth_token = auth_resp.json().get("token")
            except Exception as e:
                print(f"Critical Error: Could not setup superuser: {e}")
                return

        headers = {"Authorization": auth_token}

        # 3. Create Collections
        collections = [
            {
                "name": "goals",
                "schema": [
                    {"name": "user_id", "type": "relation", "required": True, "options": {"collectionId": "users", "maxSelect": 1}},
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
                    {"name": "user_id", "type": "relation", "required": True, "options": {"collectionId": "users", "maxSelect": 1}},
                    {"name": "value", "type": "number", "required": True},
                    {"name": "unit", "type": "text"},
                    {"name": "note", "type": "text"}
                ]
            },
            {
                "name": "ai_chats",
                "schema": [
                    {"name": "goal_id", "type": "relation", "required": True, "options": {"collectionId": "goals", "maxSelect": 1}},
                    {"name": "user_id", "type": "relation", "required": True, "options": {"collectionId": "users", "maxSelect": 1}},
                    {"name": "role", "type": "text"},
                    {"name": "message", "type": "text"}
                ]
            }
        ]

        for coll in collections:
            try:
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
                    print(f"Collection {coll['name']} already exists.")
            except Exception as e:
                print(f"Error handling collection {coll['name']}: {e}")

        print("PocketBase fully initialized.")

if __name__ == "__main__":
    asyncio.run(init_pocketbase())
