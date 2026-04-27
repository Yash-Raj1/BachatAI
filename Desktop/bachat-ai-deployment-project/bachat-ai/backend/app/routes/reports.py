"""
Reports Route — Generate downloadable reports from real user data.
===================================================================
- GET /excel   → Excel (.xlsx) export of user's transactions
- GET /csv     → CSV export of user's transactions
- GET /summary → JSON summary report
"""
import logging
from flask import Blueprint, jsonify, request, send_file
from app.services.supabase_client import get_supabase_client
from app.extensions import limiter
import pandas as pd
import io

logger = logging.getLogger('bachat.reports')

bp = Blueprint('reports', __name__)


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


def _fetch_user_transactions(supabase, user_id, statement_id=None):
    """Fetch transactions for a user, optionally filtered by statement."""
    query = supabase.table('transactions') \
        .select('date, description, amount, type, category, is_anomaly') \
        .eq('user_id', user_id) \
        .order('date', desc=False)

    if statement_id:
        query = query.eq('statement_id', statement_id)

    res = query.execute()
    return res.data or []


@bp.route('/excel', methods=['GET'])
@limiter.limit('10 per hour')
def generate_excel():
    """Generate an Excel report from the user's real transaction data."""
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({"error": "Not authenticated. Please log in to download reports."}), 401

    statement_id = request.args.get('statement_id')
    txns = _fetch_user_transactions(supabase, user_id, statement_id)

    if not txns:
        return jsonify({"error": "No transactions found. Upload a bank statement first."}), 404

    # Build DataFrame from real data
    df = pd.DataFrame(txns)
    df.columns = ['Date', 'Description', 'Amount (₹)', 'Type', 'Category', 'Anomaly']
    df['Type'] = df['Type'].str.capitalize()
    df['Anomaly'] = df['Anomaly'].map({True: 'Yes', False: 'No'})

    # Create summary sheet
    debits = df[df['Type'] == 'Debit']
    credits = df[df['Type'] == 'Credit']
    total_debit = debits['Amount (₹)'].sum()
    total_credit = credits['Amount (₹)'].sum()

    summary_data = {
        'Metric': ['Total Income', 'Total Expenses', 'Net Savings', 'Total Transactions',
                    'Savings Rate', 'Top Spending Category'],
        'Value': [
            f"₹{total_credit:,.2f}",
            f"₹{total_debit:,.2f}",
            f"₹{total_credit - total_debit:,.2f}",
            str(len(df)),
            f"{((total_credit - total_debit) / total_credit * 100):.1f}%" if total_credit > 0 else "0%",
            debits.groupby('Category')['Amount (₹)'].sum().idxmax() if len(debits) > 0 else "N/A"
        ]
    }
    summary_df = pd.DataFrame(summary_data)

    # Category breakdown sheet
    if len(debits) > 0:
        cat_df = debits.groupby('Category')['Amount (₹)'].agg(['sum', 'count']).reset_index()
        cat_df.columns = ['Category', 'Total Spent (₹)', 'Transaction Count']
        cat_df = cat_df.sort_values('Total Spent (₹)', ascending=False)
        cat_df['% of Total'] = (cat_df['Total Spent (₹)'] / total_debit * 100).round(1)
    else:
        cat_df = pd.DataFrame(columns=['Category', 'Total Spent (₹)', 'Transaction Count', '% of Total'])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        summary_df.to_excel(writer, index=False, sheet_name='Summary')
        cat_df.to_excel(writer, index=False, sheet_name='Category Breakdown')
        df.to_excel(writer, index=False, sheet_name='Transactions')

    output.seek(0)
    logger.info("Generated Excel report for user %s... (%d transactions)", user_id[:8], len(txns))

    return send_file(
        output,
        download_name='bachat_ai_report.xlsx',
        as_attachment=True,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )


@bp.route('/csv', methods=['GET'])
@limiter.limit('10 per hour')
def generate_csv():
    """Generate a CSV report from the user's real transaction data."""
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    statement_id = request.args.get('statement_id')
    txns = _fetch_user_transactions(supabase, user_id, statement_id)

    if not txns:
        return jsonify({"error": "No transactions found"}), 404

    df = pd.DataFrame(txns)
    df.columns = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Anomaly']

    output = io.StringIO()
    df.to_csv(output, index=False)

    csv_bytes = io.BytesIO(output.getvalue().encode('utf-8'))
    csv_bytes.seek(0)

    logger.info("Generated CSV report for user %s... (%d transactions)", user_id[:8], len(txns))

    return send_file(
        csv_bytes,
        download_name='bachat_ai_report.csv',
        as_attachment=True,
        mimetype='text/csv'
    )


@bp.route('/summary', methods=['GET'])
@limiter.limit('30 per hour')
def get_summary():
    """Return a JSON summary of the user's financial data."""
    user_id, supabase = _auth_user(request)
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    statement_id = request.args.get('statement_id')
    txns = _fetch_user_transactions(supabase, user_id, statement_id)

    if not txns:
        return jsonify({"error": "No transactions found"}), 404

    total_credit = sum(float(t['amount']) for t in txns if t['type'] == 'credit')
    total_debit = sum(float(t['amount']) for t in txns if t['type'] == 'debit')
    savings = total_credit - total_debit

    # Category breakdown
    cat_spend = {}
    for t in txns:
        if t['type'] == 'debit':
            cat = t.get('category', 'Other')
            cat_spend[cat] = cat_spend.get(cat, 0) + float(t['amount'])

    sorted_cats = sorted(cat_spend.items(), key=lambda x: x[1], reverse=True)

    logger.info("Generated JSON summary for user %s...", user_id[:8])

    return jsonify({
        "total_income": round(total_credit, 2),
        "total_expenses": round(total_debit, 2),
        "net_savings": round(savings, 2),
        "savings_rate": round((savings / total_credit) * 100, 1) if total_credit > 0 else 0,
        "transaction_count": len(txns),
        "anomaly_count": sum(1 for t in txns if t.get('is_anomaly')),
        "top_category": sorted_cats[0][0] if sorted_cats else "N/A",
        "category_breakdown": {cat: round(amt, 2) for cat, amt in sorted_cats},
    }), 200
