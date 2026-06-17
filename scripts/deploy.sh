#!/usr/bin/env bash
set -e

cd /home/sarang/server/achus

git pull origin main

source venv/bin/activate
pip install -r backend/requirements.txt --quiet

cd frontend
npm install --silent
npm run build
cd ..

sleep 1
sudo systemctl restart achus
