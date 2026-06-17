import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from core.config import settings, BASE_DIR
from core.database import init_db, get_session, User
from core.auth import hash_password
from core.module_loader import load_all_modules, unload_all_modules
from core.printer_watcher import printer_watcher
from core.schemas import ApiResponse
from routes import auth as auth_routes
from routes import admin as admin_routes


def _setup_logging():
    log_dir = BASE_DIR / "data"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "achus.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(str(log_file)),
            logging.StreamHandler(),
        ],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _setup_logging()
    await init_db()
    await _seed_admin()
    modules = await load_all_modules(app)
    app.state.modules = modules
    static_dir = BASE_DIR / "frontend" / "dist"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
    await printer_watcher.start()
    yield
    await printer_watcher.stop()
    await unload_all_modules()


async def _seed_admin():
    async for session in get_session():
        result = await session.execute(select(User).where(User.role == "admin"))
        if not result.scalar_one_or_none():
            admin = User(
                username="admin",
                password_hash=hash_password("admin"),
                role="admin",
            )
            session.add(admin)
            await session.commit()
            (BASE_DIR / settings.storage_path / "admin").mkdir(parents=True, exist_ok=True)
        break


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(admin_routes.router)


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
