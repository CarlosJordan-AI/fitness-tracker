import httpx
import asyncio
import os
import sys

PB_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")
ADMIN_EMAIL = os.getenv("POCKETBASE_ADMIN_EMAIL", "admin@fit.com")
ADMIN_PASSWORD = os.getenv("POCKETBASE_ADMIN_PASSWORD", "Fitness123!")

async def init_pocketbase():
    print(f"DEBUG: Starting initialization at {PB_URL}")
    async with httpx.AsyncClient() as client:
        # 1. Wait for PocketBase
        for i in range(30):
            try:
                r = await client.get(f"{PB_URL}/api/health")
                if r.status_code == 200:
                    print("DEBUG: PocketBase is UP")
                    break
            except Exception as e:
                print(f"DEBUG: Waiting for PocketBase... ({e})")
            await asyncio.sleep(2)

        # 2. Try to create the first superuser (PB 0.22+)
        print("DEBUG: Attempting to create first superuser...")
        try:
            r = await client.post(f"{PB_URL}/api/collections/_superusers/records", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "passwordConfirm": ADMIN_PASSWORD
            })
            print(f"DEBUG: Create superuser status: {r.status_code} - {r.text}")
        except Exception as e:
            print(f"DEBUG: Create superuser failed: {e}")

        # 3. Authenticate
        auth_token = None
        for endpoint in ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]:
            print(f"DEBUG: Trying auth at {endpoint}")
            try:
                r = await client.post(f"{PB_URL}{endpoint}", json={"identity": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
                if r.status_code == 200:
                    auth_token = r.json().get("token")
                    print(f"DEBUG: Auth SUCCESS via {endpoint}")
                    break
                else:
                    print(f"DEBUG: Auth FAILED ({r.status_code}): {r.text}")
            except Exception as e:
                print(f"DEBUG: Auth EXCEPTION: {e}")

        if not auth_token:
            print("FATAL: Could not authenticate as admin. Check credentials or PocketBase version.")
            return

        headers = {"Authorization": auth_token}

        # 4. Sync Collections
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
                print(f"DEBUG: Syncing collection {coll['name']}...")
                r = await client.post(f"{PB_URL}/api/collections", headers=headers, json={
                    **coll,
                    "type": "base",
                    "listRule": "@request.auth.id != ''",
                    "viewRule": "@request.auth.id != ''",
                    "createRule": "@request.auth.id != ''",
                    "updateRule": "@request.auth.id != ''",
                    "deleteRule": "@request.auth.id != ''"
                })
                print(f"DEBUG: Sync result for {coll['name']}: {r.status_code}")
            except Exception as e:
                print(f"DEBUG: Sync error for {coll['name']}: {e}")

        print("PocketBase fully initialized.")

if __name__ == "__main__":
    asyncio.run(init_pocketbase())
