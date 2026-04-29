"""
keep_alive.py — Prevents Render free tier services from sleeping.

Render free tier sleeps after 15 minutes of inactivity.
This module starts a background daemon thread that pings both
the backend and ML API every 10 minutes so they stay warm.

Activated automatically in production via app/__init__.py.
"""

import threading
import time
import requests
import os
import logging

logger = logging.getLogger(__name__)


def keep_alive():
    """Ping backend and ML API every 10 minutes to prevent sleep."""
    backend_url = os.environ.get('RENDER_EXTERNAL_URL', '').rstrip('/')
    ml_url = os.environ.get('ML_API_URL', 'http://localhost:5000').rstrip('/')

    logger.info(f"[keep-alive] Backend URL: {backend_url or '(not set)'}")
    logger.info(f"[keep-alive] ML API URL : {ml_url}")

    while True:
        time.sleep(600)  # 10 minutes between pings

        # Ping backend /health
        try:
            if backend_url:
                r = requests.get(f"{backend_url}/health", timeout=15)
                logger.info(f"[keep-alive] Backend pinged → {r.status_code}")
        except Exception as e:
            logger.warning(f"[keep-alive] Backend ping failed: {e}")

        # Ping ML API /health
        try:
            r = requests.get(f"{ml_url}/health", timeout=15)
            logger.info(f"[keep-alive] ML API pinged → {r.status_code}")
        except Exception as e:
            logger.warning(f"[keep-alive] ML API ping failed: {e}")


def start_keep_alive():
    """Start the keep-alive pinger in a background daemon thread."""
    t = threading.Thread(target=keep_alive, daemon=True, name="keep-alive")
    t.start()
    logger.info("[keep-alive] Background pinger started (fires every 10 min)")
