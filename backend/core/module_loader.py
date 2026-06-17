import importlib
import inspect
from pathlib import Path

from fastapi import FastAPI
from sqlalchemy import select

from .database import Module, get_session

MODULES_DIR = Path(__file__).resolve().parent.parent / "modules"


def discover_modules():
    modules_dir = MODULES_DIR
    if not modules_dir.exists():
        return []

    discovered = []
    for item in modules_dir.iterdir():
        if not item.is_dir() or item.name.startswith("_"):
            continue
        init_file = item / "__init__.py"
        if not init_file.exists():
            continue
        discovered.append(item.name)
    return sorted(discovered)


def load_module(app: FastAPI, module_name: str):
    try:
        mod = importlib.import_module(f"modules.{module_name}")

        if hasattr(mod, "router"):
            app.include_router(mod.router)

        metadata = getattr(mod, "metadata", {})
        metadata["id"] = module_name.replace("_", "-")

        if hasattr(mod, "setup") and inspect.iscoroutinefunction(mod.setup):
            return metadata, mod.setup
        return metadata, None
    except Exception as e:
        print(f"[module_loader] Failed to load module '{module_name}': {e}")
        return None, None


async def load_all_modules(app: FastAPI):
    module_names = discover_modules()
    loaded = []
    setup_tasks = []

    async for session in get_session():
        for name in module_names:
            result = await session.execute(select(Module).where(Module.id == name))
            db_module = result.scalar_one_or_none()

            if db_module is None:
                db_module = Module(id=name, name=name.replace("_", " ").title(), enabled=1)
                session.add(db_module)
                await session.commit()

            if not db_module.enabled:
                print(f"[module_loader] Skipping disabled module '{name}'")
                continue

            metadata, setup_fn = load_module(app, name)
            if metadata:
                loaded.append(metadata)
                if setup_fn:
                    setup_tasks.append(setup_fn())
                if metadata.get("name") and db_module.name != metadata["name"]:
                    db_module.name = metadata["name"]
                    await session.commit()

        break

    if setup_tasks:
        import asyncio
        await asyncio.gather(*setup_tasks, return_exceptions=True)

    return loaded


async def unload_all_modules():
    module_names = discover_modules()
    for name in module_names:
        try:
            mod = importlib.import_module(f"modules.{name}")
            if hasattr(mod, "teardown") and inspect.iscoroutinefunction(mod.teardown):
                await mod.teardown()
        except Exception:
            pass
