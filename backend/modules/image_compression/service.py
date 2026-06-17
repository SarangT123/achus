import io
import tempfile
from pathlib import Path

from PIL import Image


TEMP_DIR = Path(tempfile.gettempdir()) / "achus_compress"
TEMP_DIR.mkdir(parents=True, exist_ok=True)


def _to_jpeg_bytes(img: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def _best_jpeg_quality(img: Image.Image, target_bytes: int, min_q: int = 5, max_q: int = 95) -> tuple[int, bytes]:
    low, high = min_q, max_q
    best_q, best_bytes = min_q, _to_jpeg_bytes(img, min_q)

    if len(best_bytes) <= target_bytes:
        while low <= high:
            mid = (low + high) // 2
            data = _to_jpeg_bytes(img, mid)
            if len(data) <= target_bytes:
                best_q = mid
                best_bytes = data
                low = mid + 1
            else:
                high = mid - 1

    return best_q, best_bytes


def compress_image(file, target_kb: int) -> Path:
    target_bytes = max(target_kb * 1024, 1024)

    input_path = TEMP_DIR / file.filename
    with input_path.open("wb") as f:
        f.write(file.file.read())

    img = Image.open(str(input_path))
    original_stem = Path(file.filename).stem

    if img.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    quality, image_bytes = _best_jpeg_quality(img, target_bytes)

    # If even at min quality it's too large, reduce dimensions step by step
    while len(image_bytes) > target_bytes and img.width > 200 and img.height > 200:
        scale = 0.8
        new_w = max(int(img.width * scale), 100)
        new_h = max(int(img.height * scale), 100)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        quality, image_bytes = _best_jpeg_quality(img, target_bytes)

    output_path = TEMP_DIR / f"compressed_{original_stem}.jpg"
    with output_path.open("wb") as f:
        f.write(image_bytes)

    return output_path
