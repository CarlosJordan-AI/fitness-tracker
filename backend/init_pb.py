import httpx
import asyncio
import os
import time

PB_URL = os.getenv("POCKETBASE_URL", "http://pocketbase:8090")
ADMIN_EMAIL = os.getenv("POCKETBASE_ADMIN_EMAIL", "admin@fit.com")
ADMIN_PASSWORD = os.getenv("POCKETBASE_ADMIN_PASSWORD", "Fitness123!")

async def init_pocketbase():
    print(f"Waiting for PocketBase at {PB_URL}...")
    async with httpx.AsyncClient() as client:
        # Wait for PocketBase to be ready
        success = False
        for _ in range(20):
            try:
                resp = await client.get(f"{PB_URL}/api/health")
                if resp.status_code == 200:
                    success = True
                    break
            except Exception:
                pass
            await asyncio.sleep(2)
        
        if not success:
            print("PocketBase not reachable. Skipping init.")
            return

        try:
            # Try to create the admin
            await client.post(
                f"{PB_URL}/api/admins",
                json={
                    "email": ADMIN_EMAIL,
                    "password": ADMIN_PASSWORD,
                    "passwordConfirm": ADMIN_PASSWORD
                }
            )
            
            # Authenticate as admin
            auth_resp = await client.post(
                f"{PB_URL}/api/admins/auth-with-password",
                json={"identity": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
            )
            
            if auth_resp.status_code == 200:
                token = auth_resp.json().get("token")
                admin_headers = {"Authorization": token}
                print("Authenticated as admin. Setting collection rules...")

                # Set rules for 'goals'
                await client.patch(
                    f"{PB_URL}/api/collections/goals",
                    json={
                        "listRule": "@request.auth.id != \"\"",
                        "viewRule": "@request.auth.id != \"\"",
                        "createRule": "@request.auth.id != \"\"",
                        "updateRule": "user_id = @request.auth.id",
                        "deleteRule": "user_id = @request.auth.id"
                    },
                    headers=admin_headers
                )
                
                # Set rules for 'progress_logs'
                await client.patch(
                    f"{PB_URL}/api/collections/progress_logs",
                    json={
                        "listRule": "@request.auth.id != \"\"",
                        "viewRule": "@request.auth.id != \"\"",
                        "createRule": "@request.auth.id != \"\"",
                        "updateRule": "goal_id.user_id = @request.auth.id",
                        "deleteRule": "goal_id.user_id = @request.auth.id"
                    },
                    headers=admin_headers
                )

                # Set rules for 'ai_chats'
                await client.patch(
                    f"{PB_URL}/api/collections/ai_chats",
                    json={
                        "listRule": "user_id = @request.auth.id",
                        "viewRule": "user_id = @request.auth.id",
                        "createRule": "@request.auth.id != \"\"",
                        "updateRule": "user_id = @request.auth.id",
                        "deleteRule": "user_id = @request.auth.id"
                    },
                    headers=admin_headers
                )
                
                print("PocketBase initialized successfully.")
            else:
                print("Could not authenticate as admin.")
                
        except Exception as e:
            print(f"Error during PocketBase init: {e}")

if __name__ == "__main__":
    asyncio.run(init_pocketbase())
