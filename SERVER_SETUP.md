# Server Setup Guide

Set up your Ubuntu laptop as a hardened, portable server accessible from anywhere.

---

## 1. OS Baseline

```bash
sudo apt update && sudo apt upgrade -y

# Server essentials
sudo apt install -y \
  ufw fail2ban unattended-upgrades \
  htop iotop ncdu curl wget git \
  build-essential software-properties-common
```

---

## 2. SSH Hardening

```bash
sudo nano /etc/ssh/sshd_config
```

Set these values:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
# Optional: Port 2222  (move off default port)
```

Restart SSH:

```bash
sudo systemctl restart sshd
```

Upload your public key to `~/.ssh/authorized_keys`:

```bash
# From your client machine:
ssh-copy-id user@laptop-ip
```

---

## 3. Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh              # or port 2222 if changed
sudo ufw --force enable
sudo ufw status verbose          # verify
```

> Tailscale uses WireGuard which bypasses UFW for tunnel traffic — this is by design and secure.

---

## 4. Tailscale — Worldwide VPN Access

Tailscale creates a secure mesh VPN so you can reach your laptop from anywhere, regardless of which network it's connected to.

### Install

```bash
curl -fsSL https://tailscale.com/install.sh | sudo sh
```

### Authenticate

```bash
sudo tailscale up
```

A browser window opens. Log in with your Google/Microsoft/GitHub account.

### Verify

```bash
tailscale status          # shows all connected devices
tailscale ip -4           # shows your 100.x.y.z tailnet IP
```

### Access from anywhere

| From | How |
|------|-----|
| **SSH** | `ssh user@100.x.y.z` |
| **Web** | `http://100.x.y.z:8000` in browser |

### Enable MagicDNS (recommended)

1. Go to https://login.tailscale.com/admin/dns
2. Enable **MagicDNS**
3. Access via: `http://hostname.tailnet-name.ts.dev:8000`
   - e.g., `http://achus.home.ts.dev:8000`

### Tailscale Funnel (optional — public access)

Expose ACHUS to the public internet so any browser can reach it (no Tailscale client needed):

```bash
sudo tailscale funnel 8000
```

Now accessible at: `https://achus.tailnet-name.ts.dev`

---

## 5. Automatic Security Updates

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades
# Select "Yes" to enable automatic updates
```

Verify enabled:

```bash
sudo systemctl status unattended-upgrades
```

---

## 6. Fail2ban

```bash
sudo nano /etc/fail2ban/jail.local
```

Add:

```ini
[sshd]
enabled = true
port = ssh              # change to 2222 if you changed SSH port
maxretry = 5
bantime = 3600
```

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd    # check status
```

---

## 7. Install ACHUS System Dependencies

```bash
# Python & Node
sudo apt install -y python3 python3-pip python3-venv nodejs npm

# PDF/Conversion engine (LibreOffice headless)
sudo apt install -y libreoffice-writer libreoffice-impress libreoffice-calc

# Printer system (CUPS)
sudo apt install -y cups cups-client cups-bsd printer-driver-gutenprint
sudo usermod -a -G lpadmin $USER   # allow user to manage printers

# OCR (for PDF OCR feature)
sudo apt install -y tesseract-ocr tesseract-ocr-eng

# WeasyPrint dependencies (HTML→PDF for posters)
sudo apt install -y libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0

# Ollama (local AI)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a lightweight LLM (choose based on your laptop's RAM)
ollama pull llama3.2          # 3B params ~ 2GB RAM (recommended for 8GB laptops)
# ollama pull llama3.1         # 8B params ~ 4GB RAM (if you have 16GB+)
```

---

## 8. Deploy ACHUS

```bash
# Clone
git clone https://github.com/SarangT123/achus.git /home/$USER/achus
cd /home/$USER/achus

# Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Create runtime directories
mkdir -p data/{print_queue,storage,uploads}

# Create .env for configuration
cat > .env << 'EOF'
DATABASE_URL=sqlite+aiosqlite:///data/database.sqlite
STORAGE_PATH=data/storage
QUEUE_PATH=data/print_queue
UPLOAD_PATH=data/uploads
OLLAMA_URL=http://localhost:11434
EOF
```

### Install systemd service

```bash
# Copy service file
sudo cp scripts/achus.service /etc/systemd/system/achus.service

# Edit the service file to match your username
sudo nano /etc/systemd/system/achus.service
# Change 'youruser' to your actual username

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable --now achus

# Verify
sudo systemctl status achus
journalctl -u achus -f    # follow logs
```

### systemd Service File

The service file (`scripts/achus.service`):

```ini
[Unit]
Description=Achus - Multi-Tool Home Lab
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/achus
ExecStart=/home/youruser/achus/venv/bin/python -m uvicorn backend.app:app \
  --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5
Environment=PYTHONPATH=/home/youruser/achus

[Install]
WantedBy=multi-user.target
```

---

## 9. Printer Setup (CUPS)

```bash
# Add your user to the lpadmin group
sudo usermod -a -G lpadmin $USER

# Access the CUPS web interface
# http://localhost:631 or http://100.x.y.z:631
# Add your USB printer there

# Or install via command line:
lpinfo -v                    # list available printers
sudo lpadmin -p MyPrinter -E -v usb://... -m everywhere
```

Verify printer status:

```bash
lpstat -p -d                 # printer status + default printer
lpstat -t                    # full status
```

---

## 10. Verify Everything

```bash
# Check services
sudo systemctl status achus
sudo systemctl status ollama
sudo systemctl status sshd
sudo systemctl status fail2ban
sudo systemctl status ufw

# Check firewall
sudo ufw status verbose

# Check Tailscale
tailscale status

# Access ACHUS
# Locally:  http://localhost:8000
# Tailnet:  http://100.x.y.z:8000
# MagicDNS: http://hostname.tailnet-name.ts.dev:8000
```

---

## Service Architecture Diagram

```
                         ┌─────────────────────────┐
                         │     Internet / Anywhere   │
                         │   (Phone, Work Laptop)    │
                         └─────────┬───────────────┘
                                   │
                          ┌────────▼────────┐
                          │   Tailscale      │  ← stable 100.x.y.z IP
                          │   Mesh Network   │     or hostname.ts.dev
                          └────────┬────────┘
                                   │
┌──────────────────────────────────┼────────────────────────────┐
│                        LAPTOP    │                            │
│                         (Home or Work Network)               │
│                          ┌──────▼──────┐                     │
│                          │  UFW Open:  │                      │
│                          │  - SSH :22  │                      │
│                          │  - Tailscale│  (WireGuard 41641)   │
│                          └──────┬──────┘                      │
│                                 │                              │
│  ┌──────────────────────────────┼──────────────────────────┐  │
│  │                              │                          │  │
│  │    ACHUS (systemd) ── port 8000                        │  │
│  │    Ollama (systemd) ── port 11434                       │  │
│  │    Future App X ──── port XXXX                          │  │
│  │                              │                          │  │
│  └──────────────────────────────┼──────────────────────────┘  │
│                                 │                              │
└─────────────────────────────────┼──────────────────────────────┘
```

---

## Adding More Apps Later

### Option A: Different Ports (Simplest)

```bash
# Run another app on port 8001
python -m uvicorn another_app.app:app --host 0.0.0.0 --port 8001
```

Access via `http://100.x.y.z:8001`

### Option B: Caddy Reverse Proxy (Clean URLs)

```bash
sudo apt install caddy
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
{hostname}.ts.dev {
    handle /achus/* {
        reverse_proxy localhost:8000
    }
    handle /appx/* {
        reverse_proxy localhost:8001
    }
}
```

Point `tailscale funnel` at Caddy port 443 instead.

---

## Security Checklist

- [ ] SSH root login disabled
- [ ] SSH password auth disabled, key-only
- [ ] UFW enabled with minimal rules
- [ ] Fail2ban configured for SSH
- [ ] Automatic security updates enabled
- [ ] Tailscale up-to-date (auto-updates)
- [ ] Ollama bound to localhost only (default — do not expose port 11434)
- [ ] data/ directory in .gitignore
- [ ] Regular backups of data/storage (the home cloud)

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Can't reach laptop | Laptop on different network, Tailscale not connected | `tailscale status` on laptop |
| ACHUS not responding | Service crashed | `sudo systemctl restart achus` then `journalctl -u achus -n 50` |
| Printer not detected | USB disconnected or CUPS not running | `lpstat -p` and `sudo systemctl status cups` |
| Ollama not responding | Model not pulled | `ollama list` then `ollama pull llama3.2` |
| Large file upload fails | Default upload size limit | Set `UPLOAD_MAX_SIZE` in config |
| WeasyPrint missing fonts | Font not installed | `sudo apt install fonts-noto fonts-dejavu-core` |
