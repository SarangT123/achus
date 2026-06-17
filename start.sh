#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
python -m uvicorn app:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
