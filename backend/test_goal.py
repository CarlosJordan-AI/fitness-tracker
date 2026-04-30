import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        # GET goal
        g = await client.get('http://pocketbase:8090/api/collections/goals/records/r6e5a1hwqfecpsf')
        print("goal status:", g.status_code)
        if g.status_code == 200:
            user_id = g.json().get('user_id')
            print("user_id:", user_id)
            
            # Post dummy chat
            payload = {
                "user_id": user_id,
                "goal_id": "r6e5a1hwqfecpsf",
                "role": "user",
                "message": "test message from script"
            }
            p = await client.post('http://pocketbase:8090/api/collections/ai_chats/records', json=payload)
            print("post status:", p.status_code)
            print("post body:", p.text)

if __name__ == '__main__':
    asyncio.run(test())
