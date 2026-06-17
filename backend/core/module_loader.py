import importlib
import inspect
import pkgutil
from pathlib import Path

from fastapi import FastAPI

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
        metadata["id"] = module_name

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

    for name in module_names:
        metadata, setup_fn = load_module(app, name)
        if metadata:
            loaded.append(metadata)
            if setup_fn:
                setup_tasks.append(setup_fn())

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
