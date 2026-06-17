import tempfile
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
OUTPUT_DIR = Path(tempfile.gettempdir()) / "achus_posters"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

THEMES = {
    "modern": {"primary_color": "#2563EB", "bg_color": "#EFF6FF"},
    "classic": {"primary_color": "#1E293B", "bg_color": "#F8FAFC"},
    "nature": {"primary_color": "#059669", "bg_color": "#ECFDF5"},
    "celebration": {"primary_color": "#D97706", "bg_color": "#FFFBEB"},
}

TEMPLATE_MAP = {
    "minimal": "minimal.html",
    "vibrant": "vibrant.html",
    "classic": "classic.html",
    "banner": "banner.html",
}


def generate_poster(title: str, subtitle: str, date: str, venue: str,
                    description: str = "", time: str = "",
                    template_id: str = "minimal", theme_id: str = "modern") -> Path:
    theme = THEMES.get(theme_id, THEMES["modern"])
    template_file = TEMPLATE_MAP.get(template_id, "minimal.html")

    template = env.get_template(template_file)
    html = template.render(
        title=title,
        subtitle=subtitle,
        description=description,
        date=date,
        time=time,
        venue=venue,
        primary_color=theme["primary_color"],
        bg_color=theme["bg_color"],
    )

    output_path = OUTPUT_DIR / f"poster_{template_id}_{theme_id}.pdf"

    import weasyprint
    doc = weasyprint.HTML(string=html).render()
    doc.write_pdf(str(output_path))

    return output_path
