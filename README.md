# ACHUS — Multi-Tool Home Lab Server

A portable, network-aware web application for school teachers that runs 24/7 on an Ubuntu Linux laptop. Designed to function as a home lab server that moves between networks (home, work, etc.) without breaking.

> **ACHUS** is one app running on your personal Linux server. The infrastructure supports adding more services over time.

## Features

| Module | Description |
|--------|-------------|
| **PDF Tools** | Full iLovePDF-equivalent suite: merge, split, compress, convert (docx↔pdf, img→pdf, pdf→img, ppt→pdf, etc.), rotate, watermark, OCR, encrypt. |
| **Auto Print** | Drag-and-drop PDF printing with offline queue. Automatically prints queued jobs when a USB printer reconnects. |
| **Image Compression** | Upload an image with a target file size (e.g., 500 KB). Binary-search JPEG quality to hit it exactly. |
| **Poster Maker** | Form-based poster generator. Fill in Title, Subtitle, Date, Venue → high-res print-ready A4 PDF. 4 templates × 4 colour themes. |
| **AI Poster** | Describe an event in plain text → Ollama LLM extracts structured data → Poster Maker generates the design automatically. |
| **Certificate Maker** | Generate completion certificates for students. 3 themes (Classic Gold, Modern Blue, Colorful Fun), A4 landscape/portrait. Bulk mode: upload a CSV → ZIP of individual PDFs. |
| **Cloud Storage** | Google-Drive-like file explorer with per-user isolation. Upload, download, delete, organise folders. Drag-and-drop support. |
| **Document Scanner** | Upload a phone photo of a document → auto-deskew, perspective correction, auto-crop, contrast enhancement. Outputs a clean PDF. Each processing step is toggleable. |
| **File Converter** | Convert between formats: image→PDF, PDF→text, image format conversion (PNG/JPG/WebP), document→PDF (DOCX/PPTX/ODT via LibreOffice), CSV/TSV→PDF. |
| **Text to Speech** | Type or paste text → play in browser via Web Speech API, or download as MP3 via edge-tts. 300+ voices across locales, adjustable speed. |

### Admin Panel (`/admin`)

| Tab | Description |
|-----|-------------|
| **Users** | List, create, edit (username/password/role), delete users. Promote any user to admin or demote back. |
| **Storage** | Browse any user's cloud storage files. Delete files or folders. |
| **Modules** | Enable or disable any module. Disabled modules are hidden from the sidebar and their API routes are blocked on restart. |
| **System** | Live CPU, memory, disk usage, and server uptime. Refreshes every 5 seconds. |
| **Logs** | Tail the server log file. Selectable 50–500 lines. |

### Authentication

- Login/register at `/api/auth/login` and `/api/auth/register`
- Default admin account: **admin / admin** (created on first boot)
- Cloud storage is scoped per user — every user sees only their own files
- Admin users see the Admin Panel link in the sidebar

## Quick Start

```bash
# System dependencies
sudo apt install -y python3 python3-pip python3-venv nodejs npm \
  libreoffice-writer cups curl

# Clone
git clone https://github.com/SarangT123/achus.git
cd achus

# Backend
python3 -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env   # edit if needed

# Frontend
cd frontend && npm install && npm run build && cd ..

# Runtime directories
mkdir -p data/{print_queue,storage,uploads}

# Run
source venv/bin/activate
python -m uvicorn app:app --app-dir backend --host 0.0.0.0 --port 8000
```

Or use the convenience script:

```bash
./start.sh
```

Open **http://localhost:8000** in your browser and log in with **admin / admin**.

## Architecture

- **Backend:** Python 3.11+ / FastAPI + Uvicorn — modular, async
- **Frontend:** React 18 + Vite + Tailwind CSS — responsive (mobile + desktop)
- **Database:** SQLite via SQLAlchemy — zero-config
- **AI:** Ollama (local LLMs, extensible to cloud models)
- **Print:** CUPS (`lp`/`lpstat`) + USB device polling
- **PDF Engine:** PyMuPDF + LibreOffice headless + WeasyPrint
- **Image Processing:** Pillow + OpenCV (deskew, crop, perspective transform)
- **TTS:** edge-tts (Microsoft Edge TTS engine, 300+ voices)

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

The backend auto-discovers modules via directory scanning + `importlib.import_module`. The frontend uses Vite's `import.meta.glob`.

Each module can optionally export `setup()` and `teardown()` async functions for lifecycle management.

## Project Structure

```
achus/
├── backend/              # FastAPI app + pluggable modules
│   ├── core/             # Config, database, auth, module_loader
│   ├── modules/          # Auto-discovered feature modules
│   └── routes/           # Auth + admin routes (not module-scoped)
├── frontend/             # React SPA + pluggable modules
│   ├── src/
│   │   ├── components/   # Layout, Dashboard, StatusBar
│   │   ├── context/      # AuthContext
│   │   ├── modules/      # Mirrors backend modules
│   │   ├── pages/        # Login, Admin
│   │   └── utils/        # API fetch wrapper with auth
│   └── dist/             # Built static files (served by backend)
├── data/                 # Runtime (SQLite DB, storage, print queue, logs)
└── scripts/              # install.sh, systemd service
```

## Environment

Copy `.env.example` to `.env` and customise:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///data/database.sqlite` | Database connection string |
| `STORAGE_PATH` | `data/storage` | Per-user cloud storage root |
| `QUEUE_PATH` | `data/print_queue` | Print queue directory |
| `UPLOAD_PATH` | `data/uploads` | Module uploads directory |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model for AI Poster |

## License

MIT
