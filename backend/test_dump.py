import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        g = await client.get('http://pocketbase:8090/api/collections/ai_chats/records', params={'filter': 'goal_id="r6e5a1hwqfecpsf"'})
        
        with open("chat_dump.json", "w") as f:
            f.write(g.text)

if __name__ == '__main__':
    asyncio.run(test())
