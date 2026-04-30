import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        # test filter goal_id
        r1 = await client.get('http://pocketbase:8090/api/collections/ai_chats/records', params={'filter': 'goal_id="xxx"'})
        print("goal_id:", r1.status_code, r1.text)
        
        # test filter goal
        r2 = await client.get('http://pocketbase:8090/api/collections/ai_chats/records', params={'filter': 'goal="xxx"'})
        print("goal:", r2.status_code, r2.text)

if __name__ == '__main__':
    asyncio.run(test())
