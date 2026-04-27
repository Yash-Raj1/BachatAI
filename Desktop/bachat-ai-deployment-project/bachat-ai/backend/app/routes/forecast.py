"""
Forecast Route — Proxies savings forecast requests to the ML API and
persists every result into the `forecasts` Supabase table.
=================================================================
"""

from flask import Blueprint, jsonify, request
import logging
from app.services.supabase_client import get_supabase_client
from app.services.ml_client import ml_forecast, ml_health
from app.extensions import limiter
from datetime import datetime

logger = logging.getLogger('bachat.forecast')

bp = Blueprint('forecast', __name__)


def _auth_user(req):
    """Attempt to extract an authenticated user_id from the JWT token."""
    auth = req.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None, None
    token = auth.split(' ', 1)[1]
    try:
        supabase = get_supabase_client()
        resp = supabase.auth.get_user(token)
        if resp and resp.user:
            return resp.user.id, supabase
    except Exception as e:
        logger.error("Auth error: %s", e)
    return None, None


def _to_iso_date(raw):
    """
    Convert any date-ish string to YYYY-MM-DD.
    Handles: '2026-04-01', '2026-04', 'Apr 2026', 'April 2026'
    """
    if not raw:
        return None
    raw = str(raw).strip()
    # Already a proper ISO date
    if len(raw) == 10 and raw[4] == '-':
        return raw
    # YYYY-MM  → first of month
    if len(raw) == 7 and raw[4] == '-':
        return raw + '-01'
    # "Apr 2026" or "April 2026"
    try:
        from datetime import datetime
        for fmt in ('%b %Y', '%B %Y', '%m/%Y'):
            try:
                dt = datetime.strptime(raw, fmt)
                return dt.strftime('%Y-%m-01')
            except ValueError:
                continue
    except Exception:
        pass
    # Last resort: try pandas / dateutil
    try:
        import pandas as pd
        return pd.to_datetime(raw).strftime('%Y-%m-01')
    except Exception:
        pass
    logger.warning("Could not parse date: %r", raw)
    return None


def _persist_forecast(supabase, user_id, forecast_rows, model_used):
    """Save ML forecast rows to the forecasts table, replacing any from today."""
    if not supabase or not user_id or not forecast_rows:
        return

    try:
        today = datetime.utcnow().date().isoformat()

        # Delete today's existing rows to avoid duplicates on re-run
        supabase.table('forecasts') \
            .delete() \
            .eq('user_id', user_id) \
            .gte('created_at', today) \
            .execute()

        rows = []
        for item in forecast_rows:
            # The ML API may use 'month', 'ds', or 'forecast_date' as the date key
            raw_date = item.get('ds') or item.get('month') or item.get('forecast_date')
            iso_date  = _to_iso_date(raw_date)
            if not iso_date:
                logger.warning("Skipping row with unparseable date: %r", raw_date)
                continue
            rows.append({
                'user_id':            user_id,
                'forecast_date':      iso_date,
                'predicted_savings':  float(item.get('predicted_savings', item.get('yhat', 0))),
                'predicted_expenses': float(item.get('predicted_expenses', 0)),
                'confidence_lower':   float(item.get('yhat_lower', item.get('lower_bound', 0))),
                'confidence_upper':   float(item.get('yhat_upper', item.get('upper_bound', 0))),
                'model_used':         model_used,
            })

        if rows:
            supabase.table('forecasts').insert(rows).execute()
            logger.info("Persisted %d forecast rows for user %s...", len(rows), user_id[:8])
        else:
            logger.warning("No valid rows to persist after date parsing")
    except Exception as e:
        # Non-fatal — we still return the forecast to the user
        logger.error("DB persist error (non-fatal): %s", e)



@bp.route('/predict', methods=['POST'])
@limiter.limit('30 per hour')
def predict_savings():
    """
    POST body (Option A — raw monthly data, forwarded directly):
    {
        "monthly_data": [
            {"ds": "2024-01-01", "savings": 12000},
            {"ds": "2024-02-01", "savings": 9500}
        ],
        "periods": 6
    }

    POST body (Option B — auto-aggregate from transactions):
    {
        "transactions": [...],
        "periods": 6
    }
    """
    body = request.get_json(silent=True) or {}
    periods = int(body.get('periods', 6))

    # ── Option A: Monthly data provided directly ──────────────────────────
    monthly_data = body.get('monthly_data')

    # ── Option B: Aggregate from transactions ─────────────────────────────
    if not monthly_data:
        transactions = body.get('transactions', [])
        if not transactions:
            return jsonify({'error': 'Provide monthly_data or transactions'}), 400

        from collections import defaultdict
        monthly = defaultdict(lambda: {'income': 0, 'expense': 0})

        for txn in transactions:
            date = txn.get('date', '')
            if not date or len(date) < 7:
                continue
            month_key = date[:7] + '-01'
            amt = float(txn.get('amount', 0))
            if txn.get('type', '').lower() == 'credit':
                monthly[month_key]['income'] += amt
            else:
                monthly[month_key]['expense'] += amt

        if len(monthly) < 2:
            return jsonify({
                'error': 'Need at least 2 months of data for forecasting',
                'message': 'Upload more bank statements to unlock this feature'
            }), 400

        monthly_data = [
            {'ds': m, 'savings': round(v['income'] - v['expense'], 2)}
            for m, v in sorted(monthly.items())
        ]

    # ── Call ML API ───────────────────────────────────────────────────────
    result = ml_forecast(monthly_data, periods)

    if result is None:
        return jsonify({
            'error': 'ML forecast service is temporarily unavailable',
            'message': 'Please try again in a moment'
        }), 503

    # ── Persist to Supabase forecasts table ───────────────────────────────
    user_id, supabase = _auth_user(request)
    if user_id:
        forecast_rows = result.get('forecast', [])
        model_used    = result.get('model_used', 'ensemble')
        _persist_forecast(supabase, user_id, forecast_rows, model_used)

    return jsonify(result), 200


@bp.route('/history', methods=['GET'])
def get_forecast_history():
    """
    GET /api/forecast/history
    Returns the last saved forecast rows for the authenticated user.
    """
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        res = supabase.table('forecasts') \
            .select('*') \
            .eq('user_id', user_id) \
            .order('forecast_date', desc=False) \
            .limit(12) \
            .execute()

        rows = res.data or []
        return jsonify({
            'forecasts':   rows,
            'count':       len(rows),
            'model_used':  rows[0]['model_used'] if rows else None,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/health', methods=['GET'])
def forecast_health():
    """Check if the ML forecast service is reachable."""
    is_up = ml_health()
    return jsonify({
        'ml_api': 'up' if is_up else 'down',
        'message': 'ML API is reachable' if is_up else 'ML API is not reachable — forecasting unavailable'
    }), 200 if is_up else 503
