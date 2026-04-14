from fastapi import FastAPI, APIRouter, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime, timezone
import httpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Rare Shot Live Wallpaper API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    return [StatusCheck(**sc) for sc in status_checks]


# ─── Google Photos Scraping ───────────────────────────────────────────────────

class PhotoItem(BaseModel):
    url: str
    thumbnail: str
    name: str

@api_router.get("/google-photos", response_model=List[PhotoItem])
async def fetch_google_photos(album_url: str = Query(..., description="Google Photos shared album URL")):
    headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    photos = []
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15, verify=False) as http_client:
            response = await http_client.get(album_url, headers=headers)
            html = response.text

            patterns = [
                r'"(https://lh3\.googleusercontent\.com/[^"]+)"',
                r'(https://lh3\.googleusercontent\.com/[^\s"\'\\]+)',
            ]

            found_urls = set()
            for pattern in patterns:
                matches = re.findall(pattern, html)
                for url in matches:
                    clean_url = url.rstrip('\\').split('\\')[0]
                    if 'lh3.googleusercontent.com' in clean_url and len(clean_url) > 50:
                        base_url = re.sub(r'=w\d+.*$', '', clean_url)
                        base_url = re.sub(r'=s\d+.*$', '', base_url)
                        base_url = re.sub(r'=h\d+.*$', '', base_url)
                        if base_url not in found_urls and len(base_url) > 40:
                            found_urls.add(base_url)

            for i, base_url in enumerate(list(found_urls)[:50]):
                high_res = base_url + "=w1080-h1920-no"
                thumbnail = base_url + "=w400-h400-no"
                photos.append(PhotoItem(
                    url=high_res,
                    thumbnail=thumbnail,
                    name=f"Photo {i + 1}"
                ))

            logging.info(f"Google Photos: found {len(photos)} photos")
    except Exception as e:
        logging.error(f"Google Photos scrape error: {e}")

    return photos


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
