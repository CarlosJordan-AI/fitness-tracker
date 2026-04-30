import httpx
import asyncio
import json

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.post('http://pocketbase:8090/api/collections/goals/records', json={
            'user_id': 'id1234567890123',
            'title': 'Test',
            'category': 'weight_loss',
            'description': '',
            'start_date': '2026-05-04',
            'end_date': '2026-07-31',
            'is_active': True
        })
        with open('/app/error.json', 'w') as f:
            f.write(r.text)

if __name__ == '__main__':
    asyncio.run(main())
