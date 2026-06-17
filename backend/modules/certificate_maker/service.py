import tempfile
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

TEMPLATES_DIR = Path(__file__).parent / "templates"
env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

THEMES = {
    "classic": {
        "primary": "#1a3c6e",
        "accent": "#c9a94e",
        "bg": "#fdf8f0",
        "border": "3px solid #c9a94e",
    },
    "modern": {
        "primary": "#2d3748",
        "accent": "#3182ce",
        "bg": "#ffffff",
        "border": "2px solid #3182ce",
    },
    "colorful": {
        "primary": "#6b21a8",
        "accent": "#f59e0b",
        "bg": "#fefce8",
        "border": "3px dashed #f59e0b",
    },
}

SIZES = {
    "a4-landscape": (842, 595),
    "a4-portrait": (595, 842),
    "letter-landscape": (792, 612),
}


def generate_certificate(
    student_name: str,
    course_name: str,
    date: str = "",
    description: str = "",
    signature_name: str = "",
    theme_id: str = "classic",
    size: str = "a4-landscape",
) -> Path:
    theme = THEMES.get(theme_id, THEMES["classic"])
    w, h = SIZES.get(size, SIZES["a4-landscape"])

    html_str = env.get_template("certificate.html").render(
        student_name=student_name,
        course_name=course_name,
        date=date or "",
        description=description or "",
        signature_name=signature_name or "",
        theme=theme,
        width=w,
        height=h,
    )

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    HTML(string=html_str).write_pdf(tmp.name)
    return Path(tmp.name)


def generate_bulk(entries: list[dict], theme_id: str = "classic", size: str = "a4-landscape") -> list[Path]:
    return [generate_certificate(**e, theme_id=theme_id, size=size) for e in entries]
