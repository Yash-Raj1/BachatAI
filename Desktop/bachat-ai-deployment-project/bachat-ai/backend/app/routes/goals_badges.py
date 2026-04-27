"""
Goals & Badges Routes
======================
- GET/PUT  /goals       — User savings goal (reads/writes to profiles table)
- GET/POST /badges      — Achievement badges
- POST     /badges/check — Auto-check and award badges based on conditions
"""
from flask import Blueprint, request, jsonify
import logging
from app.services.supabase_client import get_supabase_client
from app.extensions import limiter

logger = logging.getLogger('bachat.gamification')

bp = Blueprint('goals_badges', __name__)


# ── BADGE DEFINITIONS ─────────────────────────────────────────────────────────
BADGE_DEFINITIONS = {
    'first_upload': {
        'name': 'First Upload',
        'description': 'Uploaded your first bank statement',
        'icon': 'Award',
        'color': '#0284c7',
    },
    'saver_rookie': {
        'name': 'Saver Rookie',
        'description': 'Saved at least 10% of your income',
        'icon': 'Star',
        'color': '#ca8a04',
    },
    'budget_champion': {
        'name': '60:40 Champion',
        'description': 'Kept expenses under 60% of income',
        'icon': 'ShieldCheck',
        'color': '#0d9488',
    },
    'big_saver': {
        'name': 'Big Saver',
        'description': 'Saved over ₹10,000 in one period',
        'icon': 'Trophy',
        'color': '#7c3aed',
    },
    'category_king': {
        'name': 'Category King',
        'description': 'Had transactions in 5+ categories',
        'icon': 'TrendingUp',
        'color': '#059669',
    },
    'goal_crusher': {
        'name': 'Goal Crusher',
        'description': 'Achieved your savings goal',
        'icon': 'Flame',
        'color': '#e11d48',
    },
}


# ── GET GOAL ──────────────────────────────────────────────────────────────────
@bp.route('/goals', methods=['GET'])
def get_goal():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    supabase = get_supabase_client()

    # Read from profiles table
    res = supabase.table('profiles') \
        .select('savings_goal') \
        .eq('id', user_id) \
        .single() \
        .execute()

    goal = 15000  # default
    if res.data and res.data.get('savings_goal'):
        goal = res.data['savings_goal']

    return jsonify({"savings_goal": goal}), 200


# ── SET GOAL ──────────────────────────────────────────────────────────────────
@bp.route('/goals', methods=['PUT'])
@limiter.limit('10 per hour')
def set_goal():
    data = request.json
    user_id = data.get('user_id')
    savings_goal = data.get('savings_goal')

    if not user_id or savings_goal is None:
        return jsonify({"error": "user_id and savings_goal required"}), 400

    try:
        savings_goal = float(savings_goal)
        if savings_goal < 0:
            return jsonify({"error": "Goal must be positive"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid goal amount"}), 400

    supabase = get_supabase_client()

    # Upsert to profiles table
    supabase.table('profiles') \
        .upsert({'id': user_id, 'savings_goal': savings_goal}, on_conflict='id') \
        .execute()

    logger.info("User %s... set goal to Rs.%s", user_id[:8], f"{savings_goal:,.0f}")
    return jsonify({"savings_goal": savings_goal, "message": "Goal updated!"}), 200


# ── GET BADGES ────────────────────────────────────────────────────────────────
@bp.route('/badges', methods=['GET'])
def get_badges():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    supabase = get_supabase_client()

    res = supabase.table('badges') \
        .select('*') \
        .eq('user_id', user_id) \
        .execute()

    earned_ids = []
    if res.data:
        earned_ids = [b['badge_type'] for b in res.data]

    # Build full badge list with earned status
    badges = []
    for badge_id, defn in BADGE_DEFINITIONS.items():
        earned_record = next((b for b in (res.data or []) if b['badge_type'] == badge_id), None)
        badges.append({
            'id': badge_id,
            'name': defn['name'],
            'description': defn['description'],
            'icon': defn['icon'],
            'color': defn['color'],
            'earned': badge_id in earned_ids,
            'earned_at': earned_record['earned_at'] if earned_record else None,
        })

    return jsonify({"badges": badges}), 200


# ── AUTO-CHECK & AWARD BADGES ────────────────────────────────────────────────
@bp.route('/badges/check', methods=['POST'])
@limiter.limit('10 per hour')
def check_and_award_badges():
    """Check all badge conditions for a user and award any newly earned badges."""
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    supabase = get_supabase_client()
    newly_awarded = []

    # Fetch existing badges
    existing = supabase.table('badges') \
        .select('badge_type') \
        .eq('user_id', user_id) \
        .execute()
    earned_ids = set(b['badge_type'] for b in (existing.data or []))

    # Fetch latest statement + transactions
    stmt_res = supabase.table('statements') \
        .select('*') \
        .eq('user_id', user_id) \
        .order('parsed_at', desc=True) \
        .limit(1) \
        .execute()

    has_statement = bool(stmt_res.data)
    total_credit = 0
    total_debit = 0
    categories = set()

    if has_statement:
        stmt = stmt_res.data[0]
        total_credit = float(stmt.get('total_credit', 0) or 0)
        total_debit = float(stmt.get('total_debit', 0) or 0)

        # Fetch transactions for category count
        txn_res = supabase.table('transactions') \
            .select('category') \
            .eq('statement_id', stmt['id']) \
            .execute()
        categories = set(t['category'] for t in (txn_res.data or []) if t.get('category'))

    savings = total_credit - total_debit

    # Fetch user's savings goal
    profile_res = supabase.table('profiles') \
        .select('savings_goal') \
        .eq('id', user_id) \
        .single() \
        .execute()
    savings_goal = float((profile_res.data or {}).get('savings_goal', 15000) or 15000)

    # ── Check each badge condition ──
    conditions = {
        'first_upload': has_statement,
        'saver_rookie': total_credit > 0 and savings >= total_credit * 0.10,
        'budget_champion': total_credit > 0 and total_debit <= total_credit * 0.60,
        'big_saver': savings >= 10000,
        'category_king': len(categories) >= 5,
        'goal_crusher': savings_goal > 0 and savings >= savings_goal,
    }

    for badge_id, condition_met in conditions.items():
        if condition_met and badge_id not in earned_ids:
            # Award the badge!
            supabase.table('badges').insert({
                'user_id': user_id,
                'badge_type': badge_id,
                'badge_name': BADGE_DEFINITIONS[badge_id]['name']
            }).execute()
            newly_awarded.append(badge_id)
            logger.info("Awarded '%s' to user %s...", badge_id, user_id[:8])

    return jsonify({
        "newly_awarded": newly_awarded,
        "total_earned": len(earned_ids) + len(newly_awarded),
        "total_possible": len(BADGE_DEFINITIONS),
    }), 200
