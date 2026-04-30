import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        # GET with sort
        g = await client.get('http://pocketbase:8090/api/collections/ai_chats/records', params={'filter': 'goal_id="r6e5a1hwqfecpsf"', 'sort': 'created'})
        print("sort created status:", g.status_code)
        
        # GET with sort=+created
        g2 = await client.get('http://pocketbase:8090/api/collections/ai_chats/records', params={'filter': 'goal_id="r6e5a1hwqfecpsf"', 'sort': '+created'})
        print("sort +created status:", g2.status_code)

if __name__ == '__main__':
    asyncio.run(test())
