from flask import Blueprint, request, jsonify
import logging
from app.services.adaptive_ratio_engine import AdaptiveRatioEngine, RATIO_PRESETS
from app.services.supabase_client import get_supabase_client
import traceback

logger = logging.getLogger('bachat.ratio')

bp = Blueprint('ratio', __name__)
engine = AdaptiveRatioEngine()


def _auth_user(req):
    """Extract and verify user_id from Authorization header."""
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


def _safe_profile(supabase, user_id):
    """Fetch profile, gracefully handling missing ratio columns."""
    # Try with ratio columns first
    try:
        res = supabase.table('profiles').select(
            'monthly_income, city_tier, dependents, '
            'budget_ratio_mode, custom_needs_pct, custom_savings_pct, '
            'ai_needs_pct, ai_savings_pct, ratio_explanation'
        ).eq('id', user_id).single().execute()
        return res.data or {}, True
    except Exception as e:
        err_str = str(e)
        if '42703' in err_str or 'does not exist' in err_str:
            # Columns don't exist yet — fetch basic profile only
            logger.info("Ratio columns not yet migrated, using basic profile")
            try:
                res = supabase.table('profiles').select(
                    'monthly_income, savings_goal, full_name'
                ).eq('id', user_id).single().execute()
                return res.data or {}, False
            except Exception:
                return {}, False
        return {}, False


@bp.route('/recommended', methods=['GET'])
def get_recommended_ratio():
    """
    GET /api/ratio/recommended
    Returns AI-recommended or user-saved manual ratio.
    Works even if ratio columns haven't been migrated yet.
    """
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    p, has_ratio_cols = _safe_profile(supabase, user_id)

    # Manual override — return saved ratio immediately
    if has_ratio_cols and p.get('budget_ratio_mode') == 'manual':
        needs   = p.get('custom_needs_pct', 60)
        savings = p.get('custom_savings_pct', 40)
        preset_map = {50: 'aggressive_saver', 60: 'balanced',
                      70: 'moderate', 80: 'constrained', 90: 'survival'}
        key = preset_map.get(needs, 'balanced')
        return jsonify({
            'mode':           'manual',
            'needs_pct':       needs,
            'savings_pct':     savings,
            'recommended_needs_pct':   needs,
            'recommended_savings_pct': savings,
            'preset':          RATIO_PRESETS.get(key, RATIO_PRESETS['balanced']),
            'ai_needs_pct':    p.get('ai_needs_pct', 60),
            'ai_savings_pct':  p.get('ai_savings_pct', 40),
            'explanation':     p.get('ratio_explanation', ''),
        })

    # Auto mode — fetch transactions and calculate
    try:
        txn_res = supabase.table('transactions').select('*').eq('user_id', user_id).execute()
        txns = txn_res.data or []
    except Exception:
        txns = []

    income     = float(p.get('monthly_income') or 0)
    city_tier  = int(p.get('city_tier') or 2)
    dependents = int(p.get('dependents') or 0)

    result = engine.calculate(
        transactions=txns,
        user_income=income,
        city_tier=city_tier,
        dependents=dependents,
    )
    result['mode'] = 'auto'

    # Persist AI recommendation back to profile (only if columns exist)
    if has_ratio_cols:
        try:
            supabase.table('profiles').update({
                'ai_needs_pct':      result['recommended_needs_pct'],
                'ai_savings_pct':    result['recommended_savings_pct'],
                'ratio_explanation': result['explanation'],
            }).eq('id', user_id).execute()
        except Exception as e:
            logger.error("Could not persist AI ratio: %s", e)

    return jsonify(result)


@bp.route('/save', methods=['POST'])
def save_ratio():
    """
    POST /api/ratio/save
    Body: { mode, needs_pct, savings_pct }
    Saves user's preferred ratio (auto or manual override).
    """
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    body     = request.json or {}
    mode     = body.get('mode', 'auto')
    needs    = int(body.get('needs_pct', 60))
    needs    = max(40, min(90, needs))
    savings  = 100 - needs

    try:
        supabase.table('profiles').update({
            'budget_ratio_mode':  mode,
            'custom_needs_pct':   needs,
            'custom_savings_pct': savings,
        }).eq('id', user_id).execute()

        # Log to history (optional table)
        try:
            supabase.table('ratio_history').insert({
                'user_id':     user_id,
                'needs_pct':   needs,
                'savings_pct': savings,
                'mode':        mode,
                'reason':      'user_manual_override',
            }).execute()
        except Exception:
            pass

    except Exception as e:
        err_str = str(e)
        if '42703' in err_str or 'does not exist' in err_str:
            # Columns don't exist yet — return success anyway (ratio calculated client-side)
            logger.info("Save skipped — ratio columns not migrated yet")
            return jsonify({'status': 'saved_locally', 'mode': mode,
                            'needs_pct': needs, 'savings_pct': savings,
                            'note': 'Run the SQL migration to persist ratios to DB.'})
        return jsonify({'error': str(e)}), 500

    return jsonify({'status': 'saved', 'mode': mode,
                    'needs_pct': needs, 'savings_pct': savings})


@bp.route('/recalculate', methods=['POST'])
def recalculate_ratio():
    """
    POST /api/ratio/recalculate
    Called automatically after every upload.
    """
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    p, has_ratio_cols = _safe_profile(supabase, user_id)

    try:
        txn_res = supabase.table('transactions').select('*').eq('user_id', user_id).execute()
        txns = txn_res.data or []
    except Exception:
        return jsonify({'status': 'skipped', 'reason': 'db_error'})

    result = engine.calculate(
        transactions=txns,
        user_income=float(p.get('monthly_income') or 0),
        city_tier=int(p.get('city_tier') or 2),
        dependents=int(p.get('dependents') or 0),
    )

    if has_ratio_cols:
        try:
            supabase.table('profiles').update({
                'ai_needs_pct':      result['recommended_needs_pct'],
                'ai_savings_pct':    result['recommended_savings_pct'],
                'fixed_burden_pct':  result['fixed_burden_pct'],
                'ratio_explanation': result['explanation'],
            }).eq('id', user_id).execute()
        except Exception as e:
            logger.error("Persist error: %s", e)

    return jsonify({'status': 'success', **result})
