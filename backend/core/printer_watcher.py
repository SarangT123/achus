import asyncio
import logging
import subprocess
from pathlib import Path

from .config import settings

logger = logging.getLogger("achus.printer")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("[%(name)s] %(message)s"))
logger.addHandler(handler)


class PrinterWatcher:
    def __init__(self):
        self._online = False
        self._task = None
        self._callbacks = []

    @property
    def is_online(self):
        return self._online

    def on_status_change(self, callback):
        self._callbacks.append(callback)

    async def check_printer(self):
        try:
            proc = await asyncio.create_subprocess_exec(
                "lpstat", "-p",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                self._set_online(False)
                return False

            output = stdout.decode().lower()
            online = "idle" in output or "printing" in output
            self._set_online(online)
            return online
        except FileNotFoundError:
            logger.warning("CUPS lpstat not found — is CUPS installed?")
            self._set_online(False)
            return False
        except Exception as e:
            logger.error(f"Printer check failed: {e}")
            self._set_online(False)
            return False

    def _set_online(self, online: bool):
        if online != self._online:
            self._online = online
            status = "online" if online else "offline"
            logger.info(f"Printer status changed: {status}")

    async def flush_queue(self):
        queue_dir = Path(settings.queue_path)
        if not queue_dir.exists():
            return

        files = sorted(queue_dir.glob("*.pdf"))
        if not files:
            return

        logger.info(f"Flushing {len(files)} queued print job(s)")
        for file in files:
            try:
                proc = await asyncio.create_subprocess_exec(
                    "lp", str(file),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                _, stderr = await proc.communicate()
                if proc.returncode == 0:
                    file.unlink()
                    logger.info(f"Printed queued: {file.name}")
                else:
                    err = stderr.decode().strip()
                    logger.error(f"Failed to print {file.name}: {err}")
            except Exception as e:
                logger.error(f"Error printing {file.name}: {e}")

    async def poll_loop(self, interval=10):
        logger.info(f"Printer watcher started (polling every {interval}s)")
        while True:
            await self.check_printer()
            if self._online:
                await self.flush_queue()
            await asyncio.sleep(interval)

    async def start(self):
        self._task = asyncio.create_task(self.poll_loop())

    async def stop(self):
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass


printer_watcher = PrinterWatcher()
