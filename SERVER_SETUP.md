# ACHUS Server Setup

## Architecture

```
                    Tailscale Funnel
                    (port 443)
                         │
                    ┌────▼────┐
                    │  Caddy  │  (port 8000)
                    │  Proxy  │
                    └──┬──┬──┘
                       │  │
              ┌────────▼┐ ┌▼──────────┐
              │ ACHUS   │ │ Jellyfin  │
              │ :8001   │ │ :8096     │
              └─────────┘ └───────────┘
```

- **Caddy** reverse proxy listens on `:8000` (the funnel port)
- Routes `/jellyfin/*` → Jellyfin (`jellyfin:8096`)
- Routes everything else → ACHUS (`achus:8001`)
- All three run inside Docker Compose

## Quick Start

### First-time setup (server)

```bash
# Clone repo
cd ~/server && git clone https://github.com/SarangT123/achus.git
cd achus

# Create .env
cp .env.example .env

# Start everything
docker compose up -d --build
```

### Management

```bash
# Start / Stop / Restart stack
cd ~/server/achus && docker compose up -d
cd ~/server/achus && docker compose down
cd ~/server/achus && docker compose restart

# Logs
cd ~/server/achus && docker compose logs -f
cd ~/server/achus && docker compose logs -f achus
cd ~/server/achus && docker compose logs -f caddy
cd ~/server/achus && docker compose logs -f jellyfin

# Rebuild ACHUS after code changes
cd ~/server/achus && docker compose build achus
cd ~/server/achus && docker compose up -d
```

### Via systemd (auto-start on boot)

```bash
# Install service
sudo cp scripts/achus-docker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable achus-docker.service
sudo systemctl start achus-docker.service

# Management via systemd
sudo systemctl start achus-docker
sudo systemctl stop achus-docker
sudo systemctl restart achus-docker
sudo journalctl -u achus-docker -f
```

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: Node frontend → Python backend |
| `Caddyfile` | Reverse proxy config — routes `/jellyfin/*` to Jellyfin, rest to ACHUS |
| `docker-compose.yml` | Defines caddy, achus, jellyfin services |
| `scripts/achus-docker.service` | Systemd unit for auto-start on boot |
| `.env` | Environment variables (DB path, Ollama URL, etc.) |
| `data/` | Persistent data: SQLite DB, uploads, print queue, storage |

## URLs

| Service | Internal URL | External URL |
|---------|-------------|--------------|
| ACHUS | `http://achus:8001` | `https://achus.stingray-pride.ts.net/` |
| Jellyfin | `http://jellyfin:8096` | `https://achus.stingray-pride.ts.net/jellyfin/` |

## Jellyfin Setup

After first start, configure the base URL:

1. Access Jellyfin directly at `http://192.168.1.10:8096`
2. Complete the initial setup wizard
3. Go to **Dashboard → Networking → Base URL**
4. Set it to `/jellyfin`
5. Save and restart the container:
   ```bash
   cd ~/server/achus && docker compose restart jellyfin
   ```
6. Jellyfin is now accessible at `https://achus.stingray-pride.ts.net/jellyfin/`

## Ports

| Port | Service | Notes |
|------|---------|-------|
| `8000` | Caddy (host) | Tailscale Funnel target — routes to ACHUS or Jellyfin |
| `8001` | ACHUS (internal) | Only accessible inside Docker network |
| `8096` | Jellyfin (internal) | Only accessible inside Docker network |

## Updating ACHUS

```bash
cd ~/server/achus
git pull
docker compose build achus
docker compose up -d
```

## Troubleshooting

```bash
# Check container status
docker ps

# View all logs
docker compose logs

# Restart a specific service
docker compose restart achus

# Full reset (keeps volumes)
docker compose down && docker compose up -d

# Full reset + rebuild
docker compose down && docker compose up -d --build

# Wipe everything (deletes volumes: DB, Jellyfin config, etc.)
docker compose down -v
```
