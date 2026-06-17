from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings, BASE_DIR
from core.database import init_db
from core.module_loader import load_all_modules, unload_all_modules
from core.printer_watcher import printer_watcher
from core.schemas import ApiResponse, ModuleMetadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    modules = await load_all_modules(app)
    app.state.modules = modules
    await printer_watcher.start()
    yield
    await printer_watcher.stop()
    await unload_all_modules()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/modules", response_model=ApiResponse)
async def get_modules():
    modules = getattr(app.state, "modules", [])
    return ApiResponse(data=modules)


@app.get("/api/health", response_model=ApiResponse)
async def health():
    return ApiResponse(data={
        "status": "ok",
        "printer_online": printer_watcher.is_online,
        "modules_count": len(getattr(app.state, "modules", [])),
    })


static_dir = BASE_DIR / "frontend" / "dist"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
