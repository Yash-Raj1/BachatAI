"""
Stocks Route — Real-time NSE stock prices, indices, and suggestions
====================================================================
"""

from flask import Blueprint, jsonify, request
import logging
from app.services.stock_service import (
    NIFTY_STOCKS, get_live_prices, get_indices,
    get_mini_chart, get_gainers_losers, get_suggestions,
)
from app.services.supabase_client import get_supabase_client
from app.extensions import limiter

logger = logging.getLogger('bachat.stocks')

bp = Blueprint('stocks', __name__)


def _auth_user(req):
    """Extract authenticated user_id from JWT token."""
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


@bp.route('/all', methods=['GET'])
@limiter.limit('30 per minute')
def get_all_stocks():
    """GET /api/stocks/all — Live prices for all 30 Nifty stocks."""
    user_id, _ = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    symbols = [s[0] for s in NIFTY_STOCKS]
    stocks  = get_live_prices(symbols)
    return jsonify({'status': 'success', 'data': stocks})


@bp.route('/indices', methods=['GET'])
@limiter.limit('30 per minute')
def get_index_values():
    """GET /api/stocks/indices — Nifty 50, Sensex, Bank Nifty live values."""
    user_id, _ = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    indices = get_indices()
    return jsonify({'status': 'success', 'data': indices})


@bp.route('/chart/<symbol>', methods=['GET'])
@limiter.limit('60 per minute')
def get_chart(symbol):
    """GET /api/stocks/chart/RELIANCE — 30-day price history for sparkline."""
    user_id, _ = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    days    = min(int(request.args.get('days', 30)), 90)
    full_s  = f"{symbol}.NS"
    chart   = get_mini_chart(full_s, days=days)
    return jsonify({'status': 'success', 'data': chart})


@bp.route('/suggestions', methods=['GET'])
@limiter.limit('20 per minute')
def get_stock_suggestions():
    """GET /api/stocks/suggestions — Personalized suggestions based on savings + risk."""
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        profile_res = supabase.table('profiles').select(
            'monthly_income, savings_goal'
        ).eq('id', user_id).single().execute()
        p = profile_res.data or {}
    except Exception:
        p = {}

    income          = float(p.get('monthly_income') or 0)
    monthly_savings = float(p.get('savings_goal') or income * 0.40)
    risk            = request.args.get('risk', 'medium').lower()
    if risk not in ('low', 'medium', 'high'):
        risk = 'medium'

    # Ensure we have stock prices
    symbols = [s[0] for s in NIFTY_STOCKS]
    stocks  = get_live_prices(symbols)

    suggestions    = get_suggestions(monthly_savings, risk, stocks)
    gainers_losers = get_gainers_losers(stocks)

    return jsonify({
        'status':          'success',
        'suggestions':     suggestions,
        'monthly_savings': round(monthly_savings),
        'risk_appetite':   risk,
        'invest_capacity': round(monthly_savings * 0.30),
        **gainers_losers,
    })


@bp.route('/search', methods=['GET'])
@limiter.limit('30 per minute')
def search_stock():
    """GET /api/stocks/search?q=tata — Search stocks by company name."""
    user_id, _ = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    query = request.args.get('q', '').lower().strip()
    if not query or len(query) < 2:
        return jsonify({'results': []})

    matches = [
        {'symbol': s[0].replace('.NS', ''), 'company': s[1], 'sector': s[2], 'risk': s[3]}
        for s in NIFTY_STOCKS
        if query in s[1].lower() or query in s[0].lower()
    ]
    return jsonify({'results': matches[:5]})
