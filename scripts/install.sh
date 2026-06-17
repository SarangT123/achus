#!/bin/bash
set -e

echo "================================================"
echo " ACHUS - Multi-Tool Home Lab Installer"
echo "================================================"

USER_HOME="$HOME"
ACHUS_DIR="$USER_HOME/achus"

echo ""
echo "[1/7] Installing system dependencies..."
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm \
  libreoffice-writer libreoffice-impress libreoffice-calc \
  cups cups-client cups-bsd printer-driver-gutenprint \
  tesseract-ocr tesseract-ocr-eng \
  libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 \
  fonts-noto fonts-dejavu-core
sudo usermod -a -G lpadmin $USER

echo ""
echo "[2/7] Setting up Python virtual environment..."
cd "$ACHUS_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
deactivate

echo ""
echo "[3/7] Installing frontend dependencies..."
cd "$ACHUS_DIR/frontend"
npm install
npm run build
cd "$ACHUS_DIR"

echo ""
echo "[4/7] Creating runtime directories..."
mkdir -p data/{print_queue,storage,uploads}

echo ""
echo "[5/7] Creating .env file..."
if [ ! -f .env ]; then
  cat > .env << 'EOF'
DATABASE_URL=sqlite+aiosqlite:///data/database.sqlite
STORAGE_PATH=data/storage
QUEUE_PATH=data/print_queue
UPLOAD_PATH=data/uploads
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
EOF
  echo "  .env created"
else
  echo "  .env already exists, skipping"
fi

echo ""
echo "[6/7] Installing systemd service..."
sed "s/youruser/$USER/g" scripts/achus.service | sudo tee /etc/systemd/system/achus.service > /dev/null
sudo systemctl daemon-reload
sudo systemctl enable achus
sudo systemctl start achus

echo ""
echo "  Service status:"
sudo systemctl status achus --no-pager 2>/dev/null | head -12

echo ""
echo "[7/7] Checking Ollama..."
if command -v ollama &> /dev/null; then
  echo "  Ollama found at $(which ollama)"
  if ! ollama list 2>/dev/null | grep -q .; then
    echo "  No models pulled. Run: ollama pull llama3.2"
  fi
else
  echo "  Ollama not installed. Install with:"
  echo "  curl -fsSL https://ollama.com/install.sh | sh"
  echo "  ollama pull llama3.2"
fi

echo ""
echo "================================================"
echo " ACHUS installation complete!"
echo "================================================"
echo ""
echo "  Local:    http://localhost:8000"
echo ""
echo "  Tailscale:"
echo "    1. Install: curl -fsSL https://tailscale.com/install.sh | sudo sh"
echo "    2. Connect: sudo tailscale up"
echo "    3. Access:  http://$(tailscale ip -4 2>/dev/null || echo 'YOUR_TAILSCALE_IP'):8000"
echo ""
echo "  Service management:"
echo "    sudo systemctl status achus"
echo "    journalctl -u achus -f"
echo ""
