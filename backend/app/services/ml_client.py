"""
ML API Client — Thin HTTP wrapper for the Bachat AI ML microservice.
==================================================================
Provides helper functions to call the ML API endpoints (port 5001).
All functions include timeouts and graceful fallbacks so the backend
still works even if the ML service is temporarily down.
"""

import logging
import requests
import traceback
from app.config import Config

logger = logging.getLogger('bachat.ml_client')

ML_BASE = Config.ML_API_URL   # default: http://localhost:5001
TIMEOUT         = 60   # seconds — default for fast endpoints (categorize, anomaly)
FORECAST_TIMEOUT = 180  # seconds — Prophet fitting on 12+ months needs extra time


def _post(endpoint, payload, timeout=None):
    """Internal helper to POST JSON to the ML API."""
    url = f"{ML_BASE}{endpoint}"
    resp = requests.post(url, json=payload, timeout=timeout or TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def ml_health():
    """Check if the ML API is reachable."""
    try:
        resp = requests.get(f"{ML_BASE}/health", timeout=5)
        return resp.status_code == 200
    except Exception:
        return False


def ml_categorize_single(description, txn_type='DEBIT', mode='UPI'):
    """
    Categorize a single transaction via the ML model.
    Returns: (category, confidence) or None on failure.
    """
    try:
        data = _post('/api/categorize', {
            'description': description,
            'type': txn_type,
            'mode': mode,
        })
        return data.get('category'), data.get('confidence')
    except Exception as e:
        logger.error("categorize_single failed: %s", e)
        return None


def ml_categorize_batch(transactions):
    """
    Categorize a list of transactions via the ML model.
    transactions: list of dicts with 'description', 'type', 'mode'
    Returns: list of dicts with 'category' and 'confidence' added, or None.
    """
    try:
        data = _post('/api/categorize/batch', {'transactions': transactions})
        return data.get('transactions')
    except Exception as e:
        logger.error("categorize_batch failed: %s", e)
        return None


def ml_analyze(transactions):
    """
    Full pipeline: categorize + anomaly detection in one call.
    transactions: list of dicts with 'description', 'amount', 'type', 'mode'
    Returns the full response dict, or None on failure.
    """
    try:
        return _post('/api/analyze', {'transactions': transactions})
    except Exception as e:
        logger.error("analyze failed: %s", e)
        return None


def ml_detect_anomalies(transactions):
    """
    Run anomaly detection on a list of categorized transactions.
    Returns: response dict with 'transactions', 'anomaly_count', 'anomalies'
    """
    try:
        return _post('/api/anomaly', {'transactions': transactions})
    except Exception as e:
        logger.error("detect_anomalies failed: %s", e)
        return None


def ml_forecast(monthly_data, periods=6):
    """
    Get savings forecast from the ML API.
    monthly_data: list of dicts with 'ds' (YYYY-MM-DD) and 'savings'
    Returns: response dict or None.
    """
    try:
        return _post('/api/forecast', {
            'monthly_data': monthly_data,
            'periods': periods,
        }, timeout=FORECAST_TIMEOUT)   # Prophet fitting needs up to 180s
    except Exception as e:
        logger.error("forecast failed: %s", e)
        traceback.print_exc()
        return None
