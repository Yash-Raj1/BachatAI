from flask import Blueprint, request, jsonify
import os
import logging
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from app.services.pdf_parser import parse_pdf_statement
from app.services.csv_parser import parse_csv_statement
from app.services.categorizer import categorize_transaction
from app.services.ml_client import ml_analyze
from app.services.ai_categorizer import ai_recategorize_low_confidence, ai_categorize_batch
from app.services.supabase_client import get_supabase_client
from app.utils.date_normalizer import normalize_transaction_dates
from app.extensions import limiter
from threading import Thread
import requests as http_requests

logger = logging.getLogger('bachat.upload')

bp = Blueprint('upload', __name__)

CHUNK_SIZE = 50  # Max transactions per Supabase insert batch

def chunk_list(lst, size):
    """Split a list into chunks of max `size`."""
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


@bp.route('/statement', methods=['POST'])
@limiter.limit('5 per day')
def upload_statement():
    if 'statement' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['statement']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # ── 1. Authenticate user ─────────────────────────────────────────────────
    auth_header = request.headers.get('Authorization', '')
    user_id = None

    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1]
        try:
            supabase = get_supabase_client()
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                user_id = user_response.user.id
        except Exception as e:
            logger.error("Auth check failed: %s", e)

    # ── 2. Save file → parse ──────────────────────────────────────────────────
    filename = secure_filename(file.filename)
    temp_dir = os.path.join(os.path.dirname(__file__), '../../tmp')
    os.makedirs(temp_dir, exist_ok=True)
    filepath = os.path.join(temp_dir, filename)
    file.save(filepath)

    try:
        # Get optional PDF password from form data
        pdf_password = request.form.get('password', '').strip() or None

        if filename.lower().endswith('.pdf'):
            parsed_data = parse_pdf_statement(filepath, password=pdf_password)
        elif filename.lower().endswith('.csv'):
            parsed_data = parse_csv_statement(filepath)
        else:
            return jsonify({"error": "Unsupported file format. Please upload a PDF or CSV."}), 400

        # ── 3. Categorize & anomaly detection ─────────────────────────────────
        #
        # Strategy: Try ML API first (TF-IDF model + Isolation Forest).
        #           Fall back to keyword-based categorizer if ML is down.
        #
        ml_used = False
        ml_payload = [
            {
                'description': txn.get('description', ''),
                'amount':      float(txn.get('amount', 0)),
                'type':        txn.get('type', 'debit').upper(),
                'mode':        txn.get('mode', 'UPI'),
            }
            for txn in parsed_data['transactions']
        ]

        ml_result = ml_analyze(ml_payload)

        if ml_result and 'transactions' in ml_result:
            # ── ML API succeeded ──────────────────────────────────────────────
            ml_txns = ml_result['transactions']
            for i, txn in enumerate(parsed_data['transactions']):
                if i < len(ml_txns):
                    txn['category']   = ml_txns[i].get('category', 'Other')
                    txn['confidence'] = ml_txns[i].get('confidence', 100)
                    txn['is_anomaly'] = ml_txns[i].get('is_anomaly', False)
                else:
                    txn['category']   = categorize_transaction(txn.get('description', ''))
                    txn['confidence'] = 0
                    txn['is_anomaly'] = False
            ml_used = True

            anomaly_count = ml_result.get('summary', {}).get('anomaly_count', 0)
            logger.info("ML API categorization successful. Anomalies: %d", anomaly_count)

            # ── AI fallback for low-confidence ML predictions ─────────────────
            # Transactions where ML confidence < 60% get re-categorized by Gemini
            parsed_data['transactions'] = ai_recategorize_low_confidence(
                parsed_data['transactions'],
                ml_txns,
                threshold=60.0
            )

        else:
            # ── ML API completely down → use Gemini AI for full batch ─────────
            logger.info("ML API unavailable — attempting Gemini AI categorization...")
            txns_for_ai = [
                {
                    'description': txn.get('description', ''),
                    'amount':      float(txn.get('amount', 0)),
                    'type':        txn.get('type', 'DEBIT').upper(),
                    'mode':        txn.get('mode', 'UPI'),
                }
                for txn in parsed_data['transactions']
            ]
            ai_results = ai_categorize_batch(txns_for_ai)
            for i, txn in enumerate(parsed_data['transactions']):
                txn['category']   = ai_results[i].get('category', 'Other')
                txn['is_anomaly'] = False
            logger.info("Gemini AI categorized %d transactions (ML was down)", len(txns_for_ai))

        total_debit = 0.0
        total_credit = 0.0
        for txn in parsed_data['transactions']:
            if txn.get('type') == 'debit':
                total_debit += float(txn.get('amount', 0))
            else:
                total_credit += float(txn.get('amount', 0))

        parsed_data['total_credit'] = parsed_data.get('total_credit') or total_credit
        parsed_data['total_debit']  = parsed_data.get('total_debit')  or total_debit

        # ── Normalize all dates to YYYY-MM-DD before saving ───────────────
        normalize_transaction_dates(parsed_data['transactions'])

        total_txns = len(parsed_data['transactions'])
        logger.info("Parsing complete — %d transactions staged (ML: %s). Preparing DB push...",
                     total_txns, 'yes' if ml_used else 'fallback')

        # ── 4. Stage → Push to Supabase ───────────────────────────────────────
        statement_id = None
        if user_id:
            try:
                supabase = get_supabase_client()

                # Insert the statement header row
                stmt_row = {
                    "user_id":                user_id,
                    "bank_name":              parsed_data.get('bank_name', 'Unknown'),
                    "statement_period_start": parsed_data.get('statement_period_start'),
                    "statement_period_end":   parsed_data.get('statement_period_end'),
                    "total_credit":           parsed_data['total_credit'],
                    "total_debit":            parsed_data['total_debit'],
                    "file_name":              filename,
                    "parsed_at":              datetime.utcnow().isoformat()
                }
                stmt_result = supabase.table('statements').insert(stmt_row).execute()
                if stmt_result.data:
                    statement_id = stmt_result.data[0].get('id')

                # Build full transaction list in temp memory, then push in chunks
                if statement_id:
                    txn_rows = []
                    for txn in parsed_data['transactions']:
                        txn_rows.append({
                            "id":           str(uuid.uuid4()),
                            "user_id":      user_id,
                            "statement_id": statement_id,
                            "date":         txn.get('date'),
                            "description":  txn.get('description', ''),
                            "amount":       float(txn.get('amount', 0)),
                            "type":         txn.get('type', 'debit'),
                            "category":     txn.get('category', 'Uncategorized'),
                            "is_anomaly":   txn.get('is_anomaly', False),
                            "created_at":   datetime.utcnow().isoformat(),
                        })

                    # Push to Supabase in chunks to avoid payload limits
                    total_saved = 0
                    for batch_num, batch in enumerate(chunk_list(txn_rows, CHUNK_SIZE), start=1):
                        supabase.table('transactions').insert(batch).execute()
                        total_saved += len(batch)
                        logger.info("Batch %d: pushed %d rows (%d/%d total)",
                                     batch_num, len(batch), total_saved, total_txns)

                logger.info("Done — statement %s | %d transactions saved for user %s",
                             statement_id, total_txns, user_id[:8])

                # Recalculate adaptive ratio in background
                if user_id:
                    token = auth_header.split(' ', 1)[1] if auth_header.startswith('Bearer ') else ''
                    def _recalc(uid, tok):
                        try:
                            base = os.environ.get('BACKEND_URL', 'http://localhost:5000')
                            http_requests.post(
                                f"{base}/api/ratio/recalculate",
                                headers={'Authorization': f'Bearer {tok}'},
                                timeout=30
                            )
                        except Exception as re:
                            logger.warning("Ratio recalc background error: %s", re)
                    Thread(target=_recalc, args=(user_id, token), daemon=True).start()

                    # Also recalculate salary intelligence in background
                    def _recalc_salary(uid, tok):
                        try:
                            base = os.environ.get('BACKEND_URL', 'http://localhost:5000')
                            http_requests.post(
                                f"{base}/api/salary/recalculate",
                                headers={'Authorization': f'Bearer {tok}'},
                                timeout=30
                            )
                            logger.info("Salary intelligence recalculated for user %s", uid[:8])
                        except Exception as se:
                            logger.warning("Salary recalc background error: %s", se)
                    Thread(target=_recalc_salary, args=(user_id, token), daemon=True).start()

            except Exception as db_err:
                logger.error("DB save error: %s", db_err)
        else:
            logger.warning("No authenticated user — data parsed but NOT saved to DB")

        return jsonify({
            "message":      "File parsed successfully",
            "statement_id": statement_id,
            "data":         parsed_data,
            "saved_to_db":  statement_id is not None,
        }), 200

    except Exception as e:
        logger.error("Parse error: %s", e)
        return jsonify({"error": f"Failed to parse statement: {str(e)}"}), 500

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


@bp.route('/reset', methods=['DELETE'])
@limiter.limit('3 per day')
def reset_user_data():
    """Delete ALL statements and transactions for the authenticated user."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Not authenticated"}), 401

    token = auth_header.split(' ', 1)[1]
    try:
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return jsonify({"error": "Invalid token"}), 401
        user_id = user_response.user.id
    except Exception as e:
        return jsonify({"error": f"Auth failed: {str(e)}"}), 401

    try:
        # Delete transactions first (FK to statements)
        supabase.table('transactions').delete().eq('user_id', user_id).execute()
        # Then delete statements
        supabase.table('statements').delete().eq('user_id', user_id).execute()
        logger.info("Reset complete — all data deleted for user %s", user_id[:8])
        return jsonify({"message": "All data has been reset successfully."}), 200
    except Exception as e:
        logger.error("Reset error: %s", e)
        return jsonify({"error": f"Reset failed: {str(e)}"}), 500

