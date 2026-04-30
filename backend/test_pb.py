import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.post('http://pocketbase:8090/api/collections/ai_chats/records', json={})
        with open('/app/error.json', 'w') as f:
            f.write(r.text)

if __name__ == '__main__':
    asyncio.run(main())
