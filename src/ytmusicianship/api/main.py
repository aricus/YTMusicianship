from contextlib import asynccontextmanager
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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
index_path = os.path.join(dist_path, "index.html")

if os.path.isdir(dist_path):
    # Serve static files (JS, CSS, assets) from dist
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    # Catch-all route for SPA - serve index.html for any non-API route
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request):
        # Don't serve index.html for API routes
        if full_path.startswith("api/") or full_path.startswith("mcp/"):
            return {"detail": "Not Found"}
        # Serve index.html for all other routes (React Router handles the path)
        return FileResponse(index_path)
