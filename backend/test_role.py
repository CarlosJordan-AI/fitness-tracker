import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        for r in ["ai", "assistant", "system", "Coach"]:
            payload = {
                "user_id": "u5daxcotsv2jqhq",
                "goal_id": "r6e5a1hwqfecpsf",
                "role": r,
                "message": "test " + r
            }
            p = await client.post('http://pocketbase:8090/api/collections/ai_chats/records', json=payload)
            print("role", r, "status:", p.status_code)

if __name__ == '__main__':
    asyncio.run(test())
