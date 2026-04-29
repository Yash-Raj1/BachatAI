from flask import Blueprint, jsonify, request
import logging
import json
import re
import google.generativeai as genai
from app.config import Config
from app.services.health_score import calculate_health_score
from app.services.supabase_client import get_supabase_client
from app.extensions import limiter
from app.utils.api_keys import get_gemini_api_key

logger = logging.getLogger('bachat.analysis')

bp = Blueprint('analysis', __name__)


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


@bp.route('/health-score', methods=['GET'])
@limiter.limit('60 per hour')
def get_health_score():
    """Calculate financial health score from the user's real data."""
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    try:
        # Fetch latest statement
        stmt_res = supabase.table('statements') \
            .select('total_credit, total_debit') \
            .eq('user_id', user_id) \
            .order('parsed_at', desc=True) \
            .limit(1) \
            .execute()

        # Fetch profile for goals
        profile_res = supabase.table('profiles') \
            .select('savings_goal, monthly_income') \
            .eq('id', user_id) \
            .single() \
            .execute()

        profile = profile_res.data or {}
        income = 0
        spending = 0

        if stmt_res.data:
            income = float(stmt_res.data[0].get('total_credit', 0) or 0)
            spending = float(stmt_res.data[0].get('total_debit', 0) or 0)
        elif profile.get('monthly_income'):
            income = float(profile['monthly_income'])

        savings = income - spending
        savings_goal = float(profile.get('savings_goal', 0) or 0)

        # Calculate overspend percentage (how far over the 60% needs budget)
        needs_limit = income * 0.6
        overspend_pct = max(0, ((spending - needs_limit) / needs_limit) * 100) if needs_limit > 0 else 0

        # Goals tracking
        goals_on_track = 1 if (savings_goal > 0 and savings >= savings_goal) else 0

        # Emergency fund estimate (3x monthly expenses)
        emergency_fund = max(savings, 0)

        user_data = {
            'savings': max(savings, 0),
            'income': income,
            'spending': spending,
            'overspend_pct': round(overspend_pct, 1),
            'goals_on_track': goals_on_track,
            'total_goals': 1 if savings_goal > 0 else 1,
            'expense_std_deviation_pct': 10,  # Needs multiple months to compute; default for now
            'emergency_fund': emergency_fund,
        }

        score = calculate_health_score(user_data)
        logger.info("Health score calculated for user %s...: %d/100", user_id[:8], score)
        return jsonify({"score": score, "data": user_data}), 200

    except Exception as e:
        logger.error("Health score error: %s", e)
        return jsonify({"error": "Failed to calculate health score"}), 500


@bp.route('/60-40', methods=['GET'])
@limiter.limit('60 per hour')
def get_budget_analysis():
    """Return the user's real income vs expenses breakdown for 60/40 analysis."""
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    try:
        # Fetch latest statement
        stmt_res = supabase.table('statements') \
            .select('total_credit, total_debit') \
            .eq('user_id', user_id) \
            .order('parsed_at', desc=True) \
            .limit(1) \
            .execute()

        if not stmt_res.data:
            return jsonify({
                "income": 0, "expenses": 0,
                "needs_limit": 0, "is_over_budget": False,
                "message": "No statement data available"
            }), 200

        income = float(stmt_res.data[0].get('total_credit', 0) or 0)
        expenses = float(stmt_res.data[0].get('total_debit', 0) or 0)
        needs_limit = round(income * 0.6, 2)

        return jsonify({
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "needs_limit": needs_limit,
            "is_over_budget": expenses > needs_limit,
        }), 200

    except Exception as e:
        logger.error("Budget analysis error: %s", e)
        return jsonify({"error": "Failed to compute budget analysis"}), 500


@bp.route('/smart-insights', methods=['POST'])
@limiter.limit('60 per hour')
def smart_insights():
    """
    Accepts transaction summary data and uses Gemini to generate
    Smart Spending Insights & Reduction Suggestions.
    """
    body = request.get_json(silent=True) or {}
    transactions = body.get('transactions', [])
    total_credit = body.get('total_credit', 0)
    total_debit = body.get('total_debit', 0)

    if not transactions:
        return jsonify({"error": "No transactions provided"}), 400

    # ── Build a compact spending summary for Gemini ──────────────────────────
    cat_summary = {}
    for t in transactions:
        cat = t.get('category', 'Other')
        typ = t.get('type', 'debit')
        amt = float(t.get('amount', 0))
        if typ == 'debit':
            if cat not in cat_summary:
                cat_summary[cat] = {'total': 0, 'count': 0, 'biggest': 0, 'biggest_desc': ''}
            cat_summary[cat]['total'] += amt
            cat_summary[cat]['count'] += 1
            if amt > cat_summary[cat]['biggest']:
                cat_summary[cat]['biggest'] = amt
                cat_summary[cat]['biggest_desc'] = t.get('description', '')[:60]

    summary_text = f"Total Income: ₹{total_credit:,.2f}\nTotal Spending: ₹{total_debit:,.2f}\nSavings: ₹{total_credit - total_debit:,.2f}\n\nSpending Breakdown by Category:\n"
    for cat, info in sorted(cat_summary.items(), key=lambda x: x[1]['total'], reverse=True):
        summary_text += f"- {cat}: ₹{info['total']:,.0f} ({info['count']} txns, biggest single: ₹{info['biggest']:,.0f} — {info['biggest_desc']})\n"

    prompt = """You are a smart Indian personal finance advisor called Bachat AI. Based on the user's spending data below, generate exactly 5 actionable smart insights.

For each insight, provide:
1. A short title (max 8 words)
2. A body paragraph (2-3 sentences, practical and specific to the data)
3. A type: one of "warning", "tip", "praise", "alert", "saving"
4. An estimated monthly saving amount in INR (if applicable, else 0)

Output STRICTLY valid JSON (no markdown, no explanation):
{"insights": [{"title": "...", "body": "...", "type": "warning|tip|praise|alert|saving", "estimated_saving": 0}]}

Rules:
- Be specific to the numbers you see — don't be generic.
- If a category has very high spending, suggest a specific reduction target (e.g. "Reduce UPI micro-payments by 30%").
- Praise good behavior (high savings rate, low entertainment spend).
- Always suggest one concrete "quick win" saving.
- Use Indian context (UPI, Paytm, swiggy, etc).
- Amounts in ₹ (INR).

USER'S SPENDING DATA:
""" + summary_text

    # Try multiple models in order (cheapest first)
    models_to_try = ['gemini-2.5-flash-lite', 'gemini-2.5-flash']
    last_error = None

    for model_name in models_to_try:
        try:
            api_key = get_gemini_api_key()
            if api_key:
                genai.configure(api_key=api_key)

            model = genai.GenerativeModel(model_name)
            response = model.generate_content([prompt], generation_config={"temperature": 0.7})
            raw = response.text.strip()

            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                insights = parsed.get('insights', [])
                logger.info("Generated %d smart insights via %s", len(insights), model_name)
                return jsonify({"insights": insights}), 200

            return jsonify({"error": "Could not parse AI response"}), 500

        except Exception as e:
            last_error = e
            err_str = str(e)
            if '429' in err_str or 'quota' in err_str.lower():
                logger.warning("%s quota hit, trying next model...", model_name)
                continue
            logger.error("Smart insights error (%s): %s", model_name, e)
            break

    # All models failed — return graceful fallback instead of 500
    logger.error("All Gemini models exhausted: %s", last_error)
    return jsonify({
        "insights": [{
            "title": "AI Insights Temporarily Unavailable",
            "body": "Our AI quota has been reached. Your insights will refresh automatically when the quota resets. In the meantime, review your spending breakdown on the dashboard.",
            "type": "tip",
            "estimated_saving": 0
        }]
    }), 200


@bp.route('/recurring-payments', methods=['POST'])
@limiter.limit('60 per hour')
def recurring_payments():
    """
    Detect recurring payments (EMIs, subscriptions, rent) from transaction data.
    """
    from app.services.recurring_detector import detect_recurring_transactions

    body = request.get_json(silent=True) or {}
    transactions = body.get('transactions', [])

    if not transactions:
        return jsonify({"error": "No transactions provided"}), 400

    try:
        result = detect_recurring_transactions(transactions)
        logger.info("Detected %d recurring payments. Monthly commitment: Rs.%s",
                     len(result['recurring']), result['total_monthly_commitment'])
        return jsonify(result), 200
    except Exception as e:
        logger.error("Recurring detection error: %s", e)
        return jsonify({"error": str(e)}), 500
