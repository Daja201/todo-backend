from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path

app = FastAPI()

# --- CORS: allow Capacitor mobile app + local dev ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "capacitor://localhost",
        "http://localhost",
        "ionic://localhost",
        "http://localhost:4008",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API routes, all under /api ---
api_router_prefix = "/api"

@app.get(f"{api_router_prefix}/health")
async def health():
    return {"status": "ok"}

@app.post(f"{api_router_prefix}/sync")
async def sync():
    return {"synced": True}

@app.get(f"{api_router_prefix}/tasks")
async def tasks():
    return {"tasks": []}

# --- Serve static frontend assets (JS, CSS, images) ---
DIST_DIR = Path(__file__).parent / "dist"

if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

# --- SPA fallback: any non-/api route returns index.html ---
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    # Never intercept API routes (in case something falls through)
    if full_path.startswith("api"):
        return JSONResponse({"error": "Not found"}, status_code=404)

    requested_file = DIST_DIR / full_path
    if full_path and requested_file.exists() and requested_file.is_file():
        return FileResponse(requested_file)

    return FileResponse(DIST_DIR / "index.html")
