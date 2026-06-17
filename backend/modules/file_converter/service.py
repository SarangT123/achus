import subprocess
import tempfile
from pathlib import Path
from io import BytesIO

from PIL import Image


SUPPORTED = {
    "image_to_pdf": {"from": ["png", "jpg", "jpeg", "webp", "bmp", "tiff"], "to": "pdf", "label": "Image → PDF"},
    "pdf_to_text": {"from": ["pdf"], "to": "txt", "label": "PDF → Text"},
    "image_convert": {"from": ["png", "jpg", "jpeg", "webp", "bmp", "tiff"], "to": ["png", "jpg", "webp"], "label": "Image Format"},
    "office_to_pdf": {"from": ["docx", "doc", "pptx", "ppt", "odt", "ods"], "to": "pdf", "label": "Document → PDF"},
    "csv_to_pdf": {"from": ["csv", "tsv"], "to": "pdf", "label": "CSV → PDF"},
}


def _libreoffice_available() -> bool:
    try:
        subprocess.run(["libreoffice", "--headless", "--version"], capture_output=True, timeout=5)
        return True
    except Exception:
        return False


def convert_image_to_pdf(input_bytes: bytes, filename: str) -> Path:
    img = Image.open(BytesIO(input_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    img.save(tmp.name, "PDF", resolution=150)
    return Path(tmp.name)


def convert_pdf_to_text(input_bytes: bytes) -> Path:
    import fitz
    doc = fitz.open(stream=input_bytes, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    tmp = tempfile.NamedTemporaryFile(suffix=".txt", delete=False)
    tmp.write(text.encode())
    tmp.close()
    return Path(tmp.name)


def convert_image_format(input_bytes: bytes, target_format: str) -> Path:
    img = Image.open(BytesIO(input_bytes))
    tmp = tempfile.NamedTemporaryFile(suffix=f".{target_format}", delete=False)
    fmt = "JPEG" if target_format in ("jpg", "jpeg") else target_format.upper()
    if fmt == "JPEG" and img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    img.save(tmp.name, fmt)
    return Path(tmp.name)


def convert_office_to_pdf(input_bytes: bytes, filename: str) -> Path:
    if not _libreoffice_available():
        raise RuntimeError("LibreOffice is not installed. Install with: sudo apt install libreoffice-writer")

    tmp_in = tempfile.NamedTemporaryFile(suffix=Path(filename).suffix, delete=False)
    tmp_in.write(input_bytes)
    tmp_in.close()

    out_dir = tempfile.mkdtemp()
    result = subprocess.run(
        ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", out_dir, tmp_in.name],
        capture_output=True, timeout=60,
    )
    Path(tmp_in.name).unlink()

    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice conversion failed: {result.stderr.decode()}")

    pdf_files = list(Path(out_dir).glob("*.pdf"))
    if not pdf_files:
        raise RuntimeError("LibreOffice did not produce output")
    return pdf_files[0]


def convert_csv_to_pdf(input_bytes: bytes, delimiter: str = ",") -> Path:
    import fitz
    text = input_bytes.decode()
    lines = text.splitlines()
    html_lines = []
    for line in lines:
        cells = line.split(delimiter)
        html_lines.append("<tr>" + "".join(f"<td>{c.strip()}</td>" for c in cells) + "</tr>")

    html = f"""<html><body>
<table border="1" cellpadding="4" cellspacing="0" style="font-family:sans-serif;font-size:10px;border-collapse:collapse">
{''.join(html_lines)}
</table></body></html>"""

    from weasyprint import HTML
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    HTML(string=html).write_pdf(tmp.name)
    return Path(tmp.name)
