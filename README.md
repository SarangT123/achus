# ACHUS — Multi-Tool Home Lab Server

A portable, network-aware web application for school teachers that runs 24/7 on a Ubuntu Linux laptop. Designed to function as a home lab server that moves between networks (home, work, etc.) without breaking.

> **ACHUS** is just one app running on your personal Linux server. The infrastructure supports adding more services over time.

## Core Features

| Module | Description |
|--------|-------------|
| **Auto Print** | Drag-and-drop PDF printing with offline queue. Automatically prints queued jobs when the USB printer reconnects. |
| **PDF Tools** | Full iLovePDF-equivalent suite: merge, split, compress, convert (docx↔pdf, img→pdf, pdf→img, ppt→pdf, etc.), rotate, watermark, OCR, encrypt. |
| **Image Compression** | Upload an image with a target file size (e.g., 500 KB). Binary-search compression to hit it exactly. |
| **Poster Maker** | Form-based poster generator. Fill in Title, Subtitle, Date, Venue → high-res print-ready PDF via templates. |
| **AI Poster** | Describe an event in plain text → Ollama LLM extracts structured data → Poster Maker generates the design. |
| **Cloud Storage** | Google-Drive-like file explorer. Upload, download, delete, organize into folders. Mapped to a local directory. |

## Quick Start

```bash
# System dependencies
sudo apt install -y python3 python3-pip python3-venv nodejs npm \
  libreoffice-writer cups curl

# Clone & setup
git clone https://github.com/SarangT123/achus.git
cd achus
python3 -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt
cd frontend && npm install && npm run build && cd ..
mkdir -p data/{print_queue,storage,uploads}

# Run
source venv/bin/activate
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** in your browser.

## Architecture

- **Backend:** Python 3.11+ / FastAPI + Uvicorn — modular, async
- **Frontend:** React 18 + Vite + Tailwind CSS — responsive (mobile + desktop)
- **Database:** SQLite via SQLAlchemy — zero-config
- **AI:** Ollama (local LLMs, extensible to cloud models)
- **Print:** CUPS (`lp`/`lpstat`) + USB device polling
- **PDF Engine:** PyMuPDF + LibreOffice headless + WeasyPrint

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full module system, API design, and plugin contract.

## Server Setup

See [SERVER_SETUP.md](SERVER_SETUP.md) for:
- Hardening Ubuntu as a portable server
- Tailscale VPN for worldwide access
- systemd service for 24/7 operation
- Firewall, SSH, and security best practices

## Module System

Adding a new feature = drop a directory into `backend/modules/` and `frontend/src/modules/` — zero edits to core code.

```
backend/modules/<name>/__init__.py   → export router + metadata
frontend/src/modules/<name>/index.jsx → export component + metadata
```

## Project Structure

```
achus/
├── backend/          # FastAPI app + pluggable modules
│   ├── core/         # Config, database, module_loader, printer_watcher
│   └── modules/      # Auto-discovered feature modules
├── frontend/         # React SPA + pluggable modules
│   └── src/modules/  # Mirrors backend modules
├── data/             # Runtime (print queue, storage, uploads, DB)
└── scripts/          # install.sh, systemd service
```

## License

MIT
