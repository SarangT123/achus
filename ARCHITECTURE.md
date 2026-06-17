# ACHUS Architecture

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Backend** | Python 3.11+ / FastAPI + Uvicorn | Async, rich PDF/image/printing ecosystem |
| **Frontend** | React 18 + Vite + Tailwind CSS | Responsive (mobile + desktop), component-based |
| **Database** | SQLite via SQLAlchemy (aiosqlite) | Zero-config, local-only, no server process |
| **AI** | Ollama (local, user-managed models) | Fully offline, extensible to cloud models |
| **PDF Engine** | PyMuPDF + LibreOffice headless + python-docx + WeasyPrint | Full iLovePDF-equivalent suite without cloud APIs |
| **Print** | CUPS `lp`/`lpstat` + pyudev | System printer polling & USB hotplug detection |
| **Service** | systemd | Auto-start on boot, crash recovery |

## Directory Structure

```
/home/${USER}/achus/
├── backend/
│   ├── app.py                      # FastAPI entry, lifespan, CORS, static mount
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Settings (paths, ports, DB URL)
│   │   ├── database.py             # SQLAlchemy engine + base models
│   │   ├── module_loader.py        # Scans modules/, imports & registers routers
│   │   ├── printer_watcher.py      # Background asyncio task polling lpstat
│   │   └── schemas.py              # Base Pydantic models
│   ├── modules/                    # 🔌 PLUG-AND-PLAY: one directory per feature
│   │   ├── __init__.py
│   │   ├── auto_print/             # Module 1: Mobility-Aware Auto-Print
│   │   │   ├── __init__.py         # router, metadata, setup(), teardown()
│   │   │   ├── service.py          # Printer polling, queue management
│   │   │   └── models.py           # Pydantic models
│   │   ├── pdf_tools/              # Module 2: Full iLovePDF suite
│   │   │   ├── __init__.py
│   │   │   ├── service.py
│   │   │   └── models.py
│   │   ├── image_compression/      # Module 3: Smart Image Compression
│   │   │   ├── __init__.py
│   │   │   ├── service.py
│   │   │   └── models.py
│   │   ├── poster_maker/           # Module 4: Programmatic Poster Maker
│   │   │   ├── __init__.py
│   │   │   ├── service.py
│   │   │   ├── templates/          # Jinja2 HTML/CSS poster templates
│   │   │   └── models.py
│   │   ├── ai_poster/              # Module 5: AI-Assisted Poster Generation
│   │   │   ├── __init__.py
│   │   │   ├── service.py          # Ollama HTTP client
│   │   │   └── models.py
│   │   └── cloud_storage/          # Module 6: Home Cloud Storage
│   │       ├── __init__.py
│   │       ├── service.py
│   │       └── models.py
│   ├── static/                     # Built frontend files (served by FastAPI)
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                 # Router + Layout + ErrorBoundary
│       ├── components/
│       │   ├── Dashboard.jsx       # Auto-discovers modules from backend
│       │   ├── Layout.jsx          # Responsive shell (sidebar/bottom-nav)
│       │   ├── ModuleCard.jsx      # Dashboard grid card
│       │   └── StatusBar.jsx       # Global: printer, network, disk
│       ├── hooks/
│       │   ├── useApi.js           # Relative fetch wrapper
│       │   ├── usePrinterStatus.js # Polls /api/auto-print/status
│       │   └── useModules.js       # Fetches module list from backend
│       ├── modules/                # 📱 One dir per feature — mirrors backend
│       │   ├── auto_print/
│       │   │   └── index.jsx       # Component + metadata export
│       │   ├── pdf_tools/
│       │   │   └── index.jsx
│       │   ├── image_compression/
│       │   │   └── index.jsx
│       │   ├── poster_maker/
│       │   │   └── index.jsx
│       │   ├── ai_poster/
│       │   │   └── index.jsx
│       │   └── cloud_storage/
│       │       └── index.jsx
│       └── utils/
│           ├── formatSize.js
│           └── constants.js
├── data/                           # Runtime data (gitignored)
│   ├── print_queue/
│   ├── storage/                    # Home Cloud root directory
│   ├── uploads/                    # Temporary uploads
│   └── database.sqlite
├── scripts/
│   ├── install.sh                  # Full automated setup
│   └── achus.service               # systemd unit file
├── ARCHITECTURE.md
├── SERVER_SETUP.md
├── README.md
└── .gitignore
```

## Module System — Plugin Contract

### Backend Module Contract

Every directory under `backend/modules/<name>/` must export these symbols from its `__init__.py`:

```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/<slug>", tags=["<Display Name>"])

metadata = {
    "id": "<slug>",              # unique identifier
    "name": "<Display Name>",    # human-readable
    "icon": "<icon-name>",       # icon identifier for frontend
    "description": "...",        # short description
    "order": 1,                  # display order in dashboard
}

async def setup():
    """Called on application startup — initialize background tasks, connections, etc."""
    pass

async def teardown():
    """Called on application shutdown — cleanup resources."""
    pass
```

The `module_loader.py` scans `backend/modules/` at startup:
1. Walks each subdirectory
2. Attempts `from modules.<name> import router, metadata, setup, teardown`
3. Registers `router` in the FastAPI app
4. Calls `setup()` during the app lifespan startup
5. Calls `teardown()` during shutdown
6. Exposes `GET /api/modules` returning all module metadata for the frontend

### Frontend Module Contract

Every directory under `frontend/src/modules/<name>/` exports from its `index.jsx`:

```javascript
import { MyComponent } from './MyComponent';

export default {
  id: '<slug>',
  name: '<Display Name>',
  icon: '<icon-name>',
  component: MyComponent,
  order: 1,
};
```

Vite's `import.meta.glob` auto-discovers modules:

```javascript
// In Dashboard.jsx — no manual imports needed
const modules = import.meta.glob('./modules/*/index.jsx', { eager: true });
```

## API Design

### Common Response Format

Every endpoint returns a consistent JSON structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

On failure:

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Human-readable error",
    "code": "MODULE_SPECIFIC_CODE",
    "details": {}
  }
}
```

### Endpoint Reference

#### Module 1: Auto Print

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/auto-print/status` | Printer online/offline + queue count |
| `POST` | `/api/auto-print/upload` | Upload PDF → print immediately or queue |
| `GET` | `/api/auto-print/queue` | List pending print jobs |
| `DELETE` | `/api/auto-print/queue/{id}` | Cancel a queued job |

#### Module 2: PDF Tools

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/pdf-tools/merge` | Upload N PDFs → merged PDF |
| `POST` | `/api/pdf-tools/split` | Split at specified page ranges |
| `POST` | `/api/pdf-tools/compress` | Compress PDF (quality slider) |
| `POST` | `/api/pdf-tools/convert` | Convert: docx↔pdf, img→pdf, pdf→img, ppt→pdf, pdf→txt, pdf→epub |
| `POST` | `/api/pdf-tools/rotate` | Rotate specific pages |
| `POST` | `/api/pdf-tools/extract` | Extract selected pages into new PDF |
| `POST` | `/api/pdf-tools/watermark` | Add text or image watermark |
| `POST` | `/api/pdf-tools/page-numbers` | Add page numbers |
| `POST` | `/api/pdf-tools/reorder` | Reorder / delete pages |
| `POST` | `/api/pdf-tools/ocr` | OCR scanned PDF (via Tesseract) |
| `POST` | `/api/pdf-tools/encrypt` | Add password protection |

#### Module 3: Smart Image Compression

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/image-compression/compress` | Upload image + target size → compressed download |

Algorithm: binary search on JPEG quality (1–95) with optional dimension scaling. Adjusts until output ≤ target size.

#### Module 4: Programmatic Poster Maker

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/poster-maker/templates` | List available templates / color themes |
| `POST` | `/api/poster-maker/generate` | Form data → rendered PDF download |

Uses Jinja2 HTML templates + CSS → WeasyPrint → high-resolution PDF. Poster is print-ready at 300 DPI.

#### Module 5: AI-Assisted Poster

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/ai-poster/generate` | Raw text → Ollama extracts {title, subtitle, date, venue, theme} → passes to Poster Maker |
| `POST` | `/api/ai-poster/refine` | Adjust specific fields in an existing structured payload |

Ollama prompt template:

```
Extract structured event information from the following description.
Return ONLY valid JSON with these fields:
- title: string (event title)
- subtitle: string (optional subtitle)
- date: string (event date)
- venue: string (event location)
- theme: string (color theme: "modern", "classic", "nature", "celebration")

Description: {user_text}
```

#### Module 6: Home Cloud Storage

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/storage/list?path=/` | List directory contents |
| `POST` | `/api/storage/upload` | Upload file(s) to current directory |
| `GET` | `/api/storage/download/*` | Stream file download |
| `DELETE` | `/api/storage/delete` | Delete file or folder (recursive) |
| `POST` | `/api/storage/mkdir` | Create new folder |
| `POST` | `/api/storage/move` | Move / rename file or folder |

## Network Independence

- **All API calls use relative URLs** (`/api/...`) — no hardcoded hostnames
- **Backend binds `0.0.0.0`** — accessible from any local network interface
- **Frontend served as static files by FastAPI** — single port, no CORS issues
- **Tailscale** provides a stable IP across network changes (see SERVER_SETUP.md)

## Error Handling Strategy

### Backend
- Every endpoint wrapped in try/except returning structured JSON errors
- Module-level `setup()` failures logged but don't crash the app
- Printer watcher, queue flusher, and file watchers run as isolated asyncio tasks

### Frontend
| Layer | Mechanism |
|-------|-----------|
| **React boundary** | `ErrorBoundary` component catches render crashes, shows reload button |
| **API errors** | `useApi` hook parses structured errors → toast notification |
| **System status** | `StatusBar` component polls backend health, shows global warnings |
| **Module fallbacks** | AI Poster shows "Ollama not available → use Manual Poster" if AI is down |
| **Offline detection** | Network status bar indicator when connectivity to backend is lost |

## Database Schema

```sql
CREATE TABLE modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    installed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE print_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    status TEXT DEFAULT 'queued',          -- queued | printing | completed | failed
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    printed_at TEXT
);

CREATE TABLE conversion_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    operation TEXT NOT NULL,
    input_name TEXT,
    output_name TEXT,
    input_size INTEGER,
    output_size INTEGER,
    success INTEGER,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

## Backend Dependencies

```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
sqlalchemy>=2.0.0
aiosqlite>=0.20.0
PyMuPDF>=1.25.0
python-docx>=1.1.0
Pillow>=11.0.0
reportlab>=4.2.0
weasyprint>=62.0.0
jinja2>=3.1.0
httpx>=0.28.0
watchfiles>=1.0.0
python-multipart>=0.0.12
```

## Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.28.0",
    "@headlessui/react": "^2.2.0",
    "react-dropzone": "^14.3.0",
    "react-icons": "^5.3.0",
    "react-hot-toast": "^2.4.0",
    "react-spinners": "^0.15.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@tailwindcss/forms": "^0.5.0"
  }
}
```

## Implementation Phases

| Phase | Modules | Key Outcomes |
|-------|---------|--------------|
| **1** | Scaffold + Module Loader + Dashboard + systemd | Project skeleton, auto-discovery, responsive shell, install script |
| **2** | PDF Tools (full suite) | All iLovePDF operations working locally |
| **3** | Auto Print | Printer watcher, drag-drop, queue, auto-flush |
| **4** | Image Compression | Upload → binary search → download |
| **5** | Cloud Storage | File explorer UI, full CRUD |
| **6** | Poster Maker | Template system, form UI, WeasyPrint rendering |
| **7** | AI Poster | Ollama integration, structured extraction, handoff to Poster Maker |

### Future Multi-App Architecture

When you want to add other apps to the server:

```
                     Tailscale Funnel (443)
                            │
                     ┌──────▼──────┐
                     │   Caddy     │  ← reverse proxy
                     │ (optional)  │
                     └──┬──────┬──┘
                        │      │
              ┌─────────▼┐  ┌──▼──────────┐
              │ ACHUS    │  │ Future App X │
              │ :8000    │  │ :8001        │
              └──────────┘  └──────────────┘
```

Options for multi-app:
1. **Different ports** — access via `ip:8000`, `ip:8001` (simplest)
2. **Caddy reverse proxy** — path-based routing (`/achus`, `/appx`) on port 443
3. **Tailscale Serve** — native path routing within tailnet
