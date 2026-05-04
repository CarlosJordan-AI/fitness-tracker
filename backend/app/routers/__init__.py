import httpx
import asyncio
import os

PB_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")
ADMIN_EMAIL = os.getenv("POCKETBASE_ADMIN_EMAIL", "admin@fit.com")
ADMIN_PASSWORD = os.getenv("POCKETBASE_ADMIN_PASSWORD", "Admin1234!")

async def init_pocketbase():
    print(f"Waiting for PocketBase at {PB_URL}...")
    async with httpx.AsyncClient() as client:
        for _ in range(20):
            try:
                resp = await client.get(f"{PB_URL}/api/health")
                if resp.status_code == 200:
                    break
            except Exception:
                pass
            await asyncio.sleep(2)

        try:
            # PocketBase 0.37 superusers endpoint
            auth_resp = await client.post(
                f"{PB_URL}/api/collections/_superusers/auth-with-password",
                json={"identity": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
            )
            if auth_resp.status_code != 200:
                print(f"Could not authenticate as admin: {auth_resp.text}")
                return

            token = auth_resp.json().get("token")
            admin_headers = {"Authorization": f"Bearer {token}"}
            print("Authenticated as admin.")

            # Create goals collection
            await client.post(f"{PB_URL}/api/collections", headers=admin_headers, json={
                "name": "goals",
                "type": "base",
                "fields": [
                    {"name": "user_id", "type": "text", "required": True},
                    {"name": "title", "type": "text", "required": True},
                    {"name": "goal_type", "type": "text"},
                    {"name": "duration_weeks", "type": "number"},
                    {"name": "start_date", "type": "date"},
                    {"name": "end_date", "type": "date"},
                    {"name": "status", "type": "text"},
                    {"name": "description", "type": "text"},
                    {"name": "ai_plan", "type": "text"}
                ],
                "listRule": "@request.auth.id != \"\"",
                "viewRule": "@request.auth.id != \"\"",
                "createRule": "@request.auth.id != \"\"",
                "updateRule": "@request.auth.id != \"\"",
                "deleteRule": "@request.auth.id != \"\""
            })
            print("goals collection created.")

            # Create progress_logs collection
            await client.post(f"{PB_URL}/api/collections", headers=admin_headers, json={
                "name": "progress_logs",
                "type": "base",
                "fields": [
                    {"name": "goal_id", "type": "text", "required": True},
                    {"name": "user_id", "type": "text", "required": True},
                    {"name": "date", "type": "date"},
                    {"name": "value", "type": "number"},
                    {"name": "notes", "type": "text"}
                ],
                "listRule": "@request.auth.id != \"\"",
                "viewRule": "@request.auth.id != \"\"",
                "createRule": "@request.auth.id != \"\"",
                "updateRule": "@request.auth.id != \"\"",
                "deleteRule": "@request.auth.id != \"\""
            })
            print("progress_logs collection created.")

            # Create ai_chats collection
            await client.post(f"{PB_URL}/api/collections", headers=admin_headers, json={
                "name": "ai_chats",
                "type": "base",
                "fields": [
                    {"name": "user_id", "type": "text", "required": True},
                    {"name": "goal_id", "type": "text", "required": True},
                    {"name": "role", "type": "text"},
                    {"name": "message", "type": "text"}
                ],
                "listRule": "@request.auth.id != \"\"",
                "viewRule": "@request.auth.id != \"\"",
                "createRule": "@request.auth.id != \"\"",
                "updateRule": "@request.auth.id != \"\"",
                "deleteRule": "@request.auth.id != \"\""
            })
            print("ai_chats collection created.")
            print("PocketBase initialized successfully.")

        except Exception as e:
            print(f"Error during PocketBase init: {e}")

if __name__ == "__main__":
    asyncio.run(init_pocketbase())