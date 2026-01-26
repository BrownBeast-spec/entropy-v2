import httpx
import asyncio
import logging

logging.basicConfig(level=logging.INFO)

async def test_connect():
    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=Glioblastoma&retmode=json"
    print(f"Connecting to: {url}")
    
    async with httpx.AsyncClient(transport=httpx.AsyncHTTPTransport(local_address="0.0.0.0")) as client:
        try:
            resp = await client.get(url)
            print(f"Status: {resp.status_code}")
            print(f"Content: {resp.text[:100]}...")
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_connect())
