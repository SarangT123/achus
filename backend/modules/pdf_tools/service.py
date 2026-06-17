import io
import tempfile
import subprocess
import zipfile
from pathlib import Path

import fitz
from PIL import Image


UPLOAD_DIR = Path(tempfile.gettempdir()) / "achus_pdf_tools"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _save_upload(file) -> Path:
    path = UPLOAD_DIR / file.filename
    with path.open("wb") as f:
        f.write(file.file.read())
    return path


def _cleanup(paths: list[Path]):
    for p in paths:
        if p.exists():
            p.unlink()


def merge_pdfs(files) -> Path:
    output = UPLOAD_DIR / "merged.pdf"
    doc_out = fitz.open()
    for f in files:
        path = _save_upload(f)
        doc_in = fitz.open(str(path))
        doc_out.insert_pdf(doc_in)
        doc_in.close()
    doc_out.save(str(output), deflate=True)
    doc_out.close()
    return output


def split_pdf(file, ranges: str) -> Path:
    path = _save_upload(file)
    doc = fitz.open(str(path))
    output = UPLOAD_DIR / "split.pdf"
    pages = []
    for part in ranges.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-")
            pages.extend(range(int(start) - 1, int(end)))
        else:
            pages.append(int(part) - 1)
    doc_out = fitz.open()
    for p in pages:
        if 0 <= p < len(doc):
            doc_out.insert_pdf(doc, from_page=p, to_page=p)
    doc_out.save(str(output), deflate=True)
    doc_out.close()
    doc.close()
    return output


def compress_pdf(file, quality: int) -> Path:
    path = _save_upload(file)
    doc = fitz.open(str(path))
    output = UPLOAD_DIR / "compressed.pdf"
    for page_num in range(len(doc)):
        page = doc[page_num]
        for img_index in range(len(page.get_images())):
            xref = page.get_images()[img_index][0]
            pix = fitz.Pixmap(doc, xref)
            if pix.n > 4:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            img_bytes = pix.tobytes("jpeg", quality=quality)
            page.insert_image(page.rect, stream=img_bytes)
    doc.save(str(output), deflate=True, garbage=4, clean=True)
    doc.close()
    return output


def convert_file(file, target_format: str) -> Path:
    path = _save_upload(file)
    stem = path.stem
    ext = path.suffix.lower()

    if ext == ".pdf" and target_format in ("docx", "odt", "txt", "epub"):
        if target_format == "txt":
            doc = fitz.open(str(path))
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            txt_path = UPLOAD_DIR / f"{stem}.txt"
            txt_path.write_text(text)
            return txt_path

        _libreoffice_convert(path, target_format)
        expected = UPLOAD_DIR / f"{stem}.{target_format}"
        if expected.exists():
            return expected

    elif ext == ".pdf" and target_format in ("png", "jpg", "jpeg"):
        doc = fitz.open(str(path))
        fmt = "jpeg" if target_format in ("jpg", "jpeg") else "png"
        image_paths = []
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=200)
            page_path = UPLOAD_DIR / f"{stem}_page_{i + 1}.{fmt}"
            pix.save(str(page_path))
            image_paths.append(page_path)
        doc.close()

        if len(image_paths) == 1:
            return image_paths[0]

        zip_path = UPLOAD_DIR / f"{stem}.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            for ip in image_paths:
                zf.write(ip, ip.name)
        return zip_path

    elif ext in (".docx", ".odt") and target_format == "pdf":
        _libreoffice_convert(path, "pdf")
        expected = UPLOAD_DIR / f"{stem}.pdf"
        if expected.exists():
            return expected

    elif ext in (".pptx", ".ppt") and target_format == "pdf":
        _libreoffice_convert(path, "pdf")
        expected = UPLOAD_DIR / f"{stem}.pdf"
        if expected.exists():
            return expected

    elif ext in (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff") and target_format == "pdf":
        img = Image.open(str(path))
        pdf_path = UPLOAD_DIR / f"{stem}.pdf"
        img.convert("RGB").save(str(pdf_path), "PDF")
        return pdf_path

    elif ext == ".pdf" and target_format == "pdf":
        return path

    raise ValueError(f"Conversion from {ext} to {target_format} not supported")


def _libreoffice_convert(input_path: Path, target_fmt: str):
    subprocess.run(
        ["libreoffice", "--headless", "--convert-to", target_fmt,
         "--outdir", str(UPLOAD_DIR), str(input_path)],
        capture_output=True, timeout=120,
    )


def rotate_pdf(file, degrees: int) -> Path:
    path = _save_upload(file)
    doc = fitz.open(str(path))
    output = UPLOAD_DIR / "rotated.pdf"
    for page in doc:
        page.set_rotation((page.rotation + degrees) % 360)
    doc.save(str(output), deflate=True)
    doc.close()
    return output


def extract_pages(file, pages: str) -> Path:
    path = _save_upload(file)
    doc = fitz.open(str(path))
    output = UPLOAD_DIR / "extracted.pdf"
    page_nums = []
    for part in pages.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-")
            page_nums.extend(range(int(start) - 1, int(end)))
        else:
            page_nums.append(int(part) - 1)
    doc_out = fitz.open()
    for p in page_nums:
        if 0 <= p < len(doc):
            doc_out.insert_pdf(doc, from_page=p, to_page=p)
    doc_out.save(str(output), deflate=True)
    doc_out.close()
    doc.close()
    return output


def add_watermark(file, text: str) -> Path:
    path = _save_upload(file)
    doc = fitz.open(str(path))
    output = UPLOAD_DIR / "watermarked.pdf"
    for page in doc:
        rect = page.rect
        page.insert_textbox(
            rect, text, fontsize=48, color=(0.5, 0.5, 0.5),
            overlay=False, align=fitz.TEXT_ALIGN_CENTER,
        )
    doc.save(str(output), deflate=True)
    doc.close()
    return output


def add_page_numbers(file, start: int = 1) -> Path:
    path = _save_upload(file)
    doc = fitz.open(str(path))
    output = UPLOAD_DIR / "numbered.pdf"
    for i, page in enumerate(doc):
        rect = page.rect
        num = start + i
        page.insert_textbox(
            fitz.Rect(rect.x0 + 36, rect.y1 - 36, rect.x1 - 36, rect.y1 - 12),
            str(num), fontsize=10, color=(0.3, 0.3, 0.3),
            align=fitz.TEXT_ALIGN_CENTER,
        )
    doc.save(str(output), deflate=True)
    doc.close()
    return output


def reorder_pages(file, order: str) -> Path:
    path = _save_upload(file)
    doc = fitz.open(str(path))
    output = UPLOAD_DIR / "reordered.pdf"
    page_nums = []
    for part in order.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start, end = part.split("-")
            step = 1 if int(start) <= int(end) else -1
            page_nums.extend(range(int(start) - 1, int(end) - 1 + step, step))
        else:
            page_nums.append(int(part) - 1)
    doc_out = fitz.open()
    for p in page_nums:
        if 0 <= p < len(doc):
            doc_out.insert_pdf(doc, from_page=p, to_page=p)
    doc_out.save(str(output), deflate=True)
    doc_out.close()
    doc.close()
    return output


def ocr_pdf(file) -> Path:
    import pytesseract
    path = _save_upload(file)
    doc = fitz.open(str(path))
    output = UPLOAD_DIR / "ocr.pdf"
    doc_out = fitz.open()
    for page in doc:
        pix = page.get_pixmap(dpi=300)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        text = pytesseract.image_to_string(img)
        pdf_page = doc_out.new_page(width=page.rect.width, height=page.rect.height)
        pdf_page.insert_text(fitz.Point(36, 36), text, fontsize=10)
    doc_out.save(str(output), deflate=True)
    doc_out.close()
    doc.close()
    return output


def encrypt_pdf(file, password: str) -> Path:
    path = _save_upload(file)
    doc = fitz.open(str(path))
    output = UPLOAD_DIR / "encrypted.pdf"
    doc.save(str(output), encryption=fitz.PDF_ENCRYPT_AES_256,
             owner_pw=password, user_pw=password)
    doc.close()
    return output
