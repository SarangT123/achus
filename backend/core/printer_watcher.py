import asyncio
import subprocess
from pathlib import Path

from .config import settings


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
            stdout, _ = await proc.communicate()
            output = stdout.decode().lower()
            online = "idle" in output or "printing" in output
            if online != self._online:
                self._online = online
                for cb in self._callbacks:
                    await cb(self._online)
            return self._online
        except Exception:
            was_online = self._online
            self._online = False
            if was_online:
                for cb in self._callbacks:
                    await cb(False)
            return False

    async def flush_queue(self):
        queue_dir = Path(settings.queue_path)
        if not queue_dir.exists():
            return

        for file in sorted(queue_dir.glob("*.pdf")):
            try:
                proc = await asyncio.create_subprocess_exec(
                    "lp", str(file),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                _, stderr = await proc.communicate()
                if proc.returncode == 0:
                    file.unlink()
                else:
                    print(f"[printer_watcher] Failed to print {file.name}: {stderr.decode()}")
            except Exception as e:
                print(f"[printer_watcher] Error printing {file.name}: {e}")

    async def poll_loop(self, interval=10):
        while True:
            was_online = self._online
            online = await self.check_printer()
            if online and not was_online:
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
