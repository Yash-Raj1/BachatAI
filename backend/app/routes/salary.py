"""
Salary Route — Salary intelligence widget API endpoints
========================================================
"""

from flask import Blueprint, jsonify, request
import logging
import pandas as pd
from datetime import date, datetime

from app.services.salary_intelligence import SalaryIntelligenceEngine
from app.services.supabase_client import get_supabase_client
from app.extensions import limiter

logger = logging.getLogger('bachat.salary')

bp = Blueprint('salary', __name__)
engine = SalaryIntelligenceEngine()


def _auth_user(req):
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


def _fetch_transactions(user_id: str, supabase) -> pd.DataFrame:
    """Fetch all transactions for user as a DataFrame."""
    try:
        resp = supabase.table('transactions') \
            .select('date, description, amount, type, category') \
            .eq('user_id', user_id) \
            .order('date') \
            .execute()
        if not resp.data:
            return pd.DataFrame()
        return pd.DataFrame(resp.data)
    except Exception as e:
        logger.error("Transaction fetch error: %s", e)
        return pd.DataFrame()


@bp.route('/widget', methods=['GET'])
@limiter.limit('30 per minute')
def get_widget():
    """GET /api/salary/widget — Returns salary intelligence widget data."""
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    # Check for today's cache first
    try:
        cached = supabase.table('salary_intelligence') \
            .select('*').eq('user_id', user_id).maybe_single().execute()
        if cached.data:
            updated = cached.data.get('updated_at', '')
            if updated:
                upd_date = datetime.fromisoformat(
                    updated.replace('Z', '+00:00')
                ).date()
                if upd_date == date.today():
                    logger.info("Salary widget served from cache for %s", user_id[:8])
                    return jsonify({
                        'status': 'success', 'source': 'cache',
                        'data': _format_cached(cached.data),
                    })
    except Exception as e:
        logger.warning("Cache lookup failed: %s", e)

    # Recalculate fresh
    txns = _fetch_transactions(user_id, supabase)
    if txns.empty:
        return jsonify({
            'status': 'insufficient_data',
            'message': 'Upload your bank statement to activate this feature.',
        })

    widget = engine.build_widget(txns)
    if widget['status'] != 'success':
        return jsonify(widget)

    _save_to_db(user_id, widget, supabase)
    return jsonify({'status': 'success', 'source': 'live', 'data': widget})


@bp.route('/recalculate', methods=['POST'])
@limiter.limit('10 per minute')
def recalculate():
    """POST /api/salary/recalculate — Force recalculate after upload."""
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    txns = _fetch_transactions(user_id, supabase)
    if txns.empty:
        return jsonify({'status': 'error', 'message': 'No transactions found'}), 400

    widget = engine.build_widget(txns)
    if widget['status'] == 'success':
        _save_to_db(user_id, widget, supabase)

    return jsonify({'status': 'success', 'data': widget})


def _save_to_db(user_id: str, widget: dict, supabase):
    """Upsert widget data to salary_intelligence table."""
    try:
        s = widget['widget_summary']
        b = widget['budget']
        i = widget['salary_info']

        supabase.table('salary_intelligence').upsert({
            'user_id':                    user_id,
            'salary_day':                 i.get('salary_day'),
            'salary_day_confidence':      i.get('confidence'),
            'avg_monthly_salary':         i.get('avg_salary'),
            'last_salary_date':           i.get('last_salary_date'),
            'last_salary_amount':         i.get('last_salary_amount'),
            'current_month_income':       b.get('total_income'),
            'current_month_spent':        b.get('total_spent'),
            'current_balance':            b.get('balance_remaining'),
            'days_remaining':             b.get('days_remaining'),
            'daily_budget':               b.get('daily_budget'),
            'daily_avg_spent':            b.get('daily_avg_spent'),
            'consecutive_overspend_days': widget['streak']['streak'],
            'daily_history':              widget['daily_history'],
            'updated_at':                 datetime.utcnow().isoformat(),
        }, on_conflict='user_id').execute()
        logger.info("Salary intelligence saved for user %s", user_id[:8])
    except Exception as e:
        logger.warning("Salary DB save error: %s", e)


def _format_cached(row: dict) -> dict:
    """Format DB row into widget response shape."""
    streak = row.get('consecutive_overspend_days', 0)
    sal_day = row.get('salary_day')
    
    # Estimate ideal_daily_budget from income (60% rule)
    income = row.get('current_month_income') or 0
    ideal_daily = round(income * 0.60 / 30, 2)
    
    budget_data = {
        'total_income': income,
        'total_spent': row.get('current_month_spent') or 0,
        'balance_remaining': row.get('current_balance') or 0,
        'days_remaining': row.get('days_remaining') or 0,
        'daily_budget': row.get('daily_budget') or 0,
        'daily_avg_spent': row.get('daily_avg_spent') or 0,
        'ideal_daily_budget': ideal_daily,
        'burn_rate_pct': 0, 'days_in_cycle': 30,
    }
    
    # Compute burn rate from cached values
    avg = budget_data['daily_avg_spent']
    if ideal_daily > 0:
        budget_data['burn_rate_pct'] = round(avg / ideal_daily * 100, 1)

    streak_dict = {
        'streak': streak, 'has_streak': streak >= 2,
        'message': f'⚠️ You have overspent {streak} days in a row.' if streak >= 2 else '',
    }
    
    headline = engine._headline(sal_day, budget_data, streak_dict) if sal_day else ''

    return {
        'widget_summary': {
            'salary_day': sal_day,
            'days_remaining': budget_data['days_remaining'],
            'balance_remaining': budget_data['balance_remaining'],
            'daily_budget': budget_data['daily_budget'],
            'daily_avg_spent': budget_data['daily_avg_spent'],
            'burn_rate_pct': budget_data['burn_rate_pct'],
            'status': 'on_track',
            'has_overspend_alert': streak_dict['has_streak'],
            'overspend_streak': streak,
        },
        'salary_info': {
            'salary_day': sal_day,
            'confidence': row.get('salary_day_confidence'),
            'avg_salary': row.get('avg_monthly_salary'),
            'last_salary_date': row.get('last_salary_date'),
            'last_salary_amount': row.get('last_salary_amount'),
        },
        'budget': budget_data,
        'daily_history': row.get('daily_history') or [],
        'streak': streak_dict,
        'headline': headline,
    }
