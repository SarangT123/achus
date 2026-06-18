#!/bin/bash
set -e

echo "=== ACHUS Lid Close Setup ==="
echo ""

echo "[1/4] Configuring lid close behavior..."
sudo sed -i 's/^#HandleLidSwitch=.*/HandleLidSwitch=ignore/' /etc/systemd/logind.conf
sudo sed -i 's/^HandleLidSwitch=.*/HandleLidSwitch=ignore/' /etc/systemd/logind.conf
sudo sed -i 's/^#HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/' /etc/systemd/logind.conf
sudo sed -i 's/^HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/' /etc/systemd/logind.conf
grep -q "HandleLidSwitch=ignore" /etc/systemd/logind.conf || echo "HandleLidSwitch=ignore" | sudo tee -a /etc/systemd/logind.conf
grep -q "HandleLidSwitchExternalPower=ignore" /etc/systemd/logind.conf || echo "HandleLidSwitchExternalPower=ignore" | sudo tee -a /etc/systemd/logind.conf

echo "[2/4] Disabling sleep and suspend targets..."
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target 2>/dev/null

echo "[3/4] Restarting systemd-logind..."
sudo systemctl restart systemd-logind

echo "[4/4] Ensuring Docker compose starts on boot..."
sudo systemctl enable achus-docker.service 2>/dev/null
sudo systemctl daemon-reload

echo ""
echo "=== Lid close setup complete! ==="
echo "The laptop will now stay awake with the lid closed."
echo ""
echo "To undo later:"
echo "  sudo systemctl unmask sleep.target suspend.target"
echo "  # Edit /etc/systemd/logind.conf, set HandleLidSwitch=suspend"
echo "  sudo systemctl restart systemd-logind"
