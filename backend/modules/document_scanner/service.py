import tempfile
from pathlib import Path
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, ImageEnhance


def _pil_to_cv(img: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)


def _cv_to_pil(img: np.ndarray) -> Image.Image:
    return Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))


def _deskew(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    coords = np.column_stack(np.where(binary > 0))
    if len(coords) < 100:
        return img
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = 90 + angle
    if abs(angle) < 0.5:
        return img
    h, w = img.shape[:2]
    center = (w // 2, h // 2)
    rot = cv2.getRotationMatrix2D(center, angle, 1.0)
    rot = rot.astype(np.float32)
    return cv2.warpAffine(img, rot, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def _find_document_contour(img: np.ndarray) -> np.ndarray | None:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 150)
    dilated = cv2.dilate(edged, None, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            return approx
    return None


def _order_points(pts: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _four_point_transform(img: np.ndarray, pts: np.ndarray) -> np.ndarray:
    rect = _order_points(pts.reshape(4, 2))
    (tl, tr, br, bl) = rect
    w1 = np.linalg.norm(br - bl)
    w2 = np.linalg.norm(tr - tl)
    h1 = np.linalg.norm(tr - br)
    h2 = np.linalg.norm(tl - bl)
    max_w = max(int(w1), int(w2))
    max_h = max(int(h1), int(h2))

    dst = np.array([
        [0, 0],
        [max_w - 1, 0],
        [max_w - 1, max_h - 1],
        [0, max_h - 1],
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(img, M, (max_w, max_h))


def _auto_crop(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    coords = cv2.findNonZero(thresh)
    if coords is None:
        return img
    x, y, w, h = cv2.boundingRect(coords)
    margin = int(min(w, h) * 0.02)
    x = max(0, x - margin)
    y = max(0, y - margin)
    w = min(img.shape[1] - x, w + 2 * margin)
    h = min(img.shape[0] - y, h + 2 * margin)
    return img[y:y+h, x:x+w]


def _enhance(img: np.ndarray) -> np.ndarray:
    pil = _cv_to_pil(img)
    pil = ImageEnhance.Contrast(pil).enhance(1.3)
    pil = ImageEnhance.Sharpness(pil).enhance(1.5)
    return _pil_to_cv(pil)


def scan_image(
    image_bytes: bytes,
    auto_deskew: bool = True,
    auto_crop: bool = True,
    perspective: bool = True,
    black_white: bool = False,
    enhance: bool = True,
) -> Path:
    pil = Image.open(BytesIO(image_bytes)).convert("RGB")
    img = _pil_to_cv(pil)

    if auto_deskew:
        img = _deskew(img)

    if perspective:
        contour = _find_document_contour(img)
        if contour is not None:
            img = _four_point_transform(img, contour)
        else:
            perspective = False

    if not perspective and auto_crop:
        img = _auto_crop(img)

    if enhance:
        img = _enhance(img)

    if black_white:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, img_bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        result_pil = Image.fromarray(img_bw)
    else:
        result_pil = _cv_to_pil(img)

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)

    img_temp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    result_pil.save(img_temp, format="PNG")
    img_temp.close()

    import fitz
    pdf = fitz.open()
    page = pdf.new_page(width=result_pil.width, height=result_pil.height)
    page.insert_image(page.rect, filename=img_temp.name)
    pdf.save(tmp.name)
    pdf.close()

    Path(img_temp.name).unlink()
    return Path(tmp.name)
