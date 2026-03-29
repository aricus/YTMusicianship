from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from ytmusicianship.db import init_db
from ytmusicianship.api.routes import router
from ytmusicianship.api.websocket import ws_router
from ytmusicianship.config import settings
from ytmusicianship.scheduler import scheduler
from ytmusicianship.mcp_server import get_mcp_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="YTMusicianship", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(ws_router, prefix="/api")
app.mount("/mcp", get_mcp_app())

# Serve built web app if it exists
dist_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "web", "dist")
if os.path.isdir(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
