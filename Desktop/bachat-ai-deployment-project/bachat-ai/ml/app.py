# ml/app.py
import os, sys, json, warnings, logging
warnings.filterwarnings('ignore')

# Fix Windows console encoding for emoji/unicode characters
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass  # Not available on all platforms

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-7s | %(name)s | %(message)s',
)
logger = logging.getLogger(__name__)

import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

# ── Forecasting imports ────────────────────────────────────────────────
from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from sklearn.linear_model import LinearRegression

app = Flask(__name__)
CORS(app)   # allows your React frontend to call this API

# ══════════════════════════════════════════════════════════════════════
#  LOAD ALL MODELS AT STARTUP
# ══════════════════════════════════════════════════════════════════════
logger.info("Loading ML models from disk...")

# Categorizer
tfidf_vec  = joblib.load('models/categorizer/tfidf_vectorizer.pkl')
classifier = joblib.load('models/categorizer/classifier.pkl')
with open('models/categorizer/categories.json') as f:
    CATEGORIES = json.load(f)

# Anomaly Detector
iso_forest = joblib.load('models/anomaly/isolation_forest.pkl')
scaler     = joblib.load('models/anomaly/scaler.pkl')
le_cat     = joblib.load('models/anomaly/label_encoder_category.pkl')
le_mode    = joblib.load('models/anomaly/label_encoder_mode.pkl')
le_type    = joblib.load('models/anomaly/label_encoder_type.pkl')
cat_stats  = pd.read_csv('models/anomaly/category_stats.csv')

logger.info("All models loaded successfully!"
            " Bachat AI ML API is ready to serve requests.")

# ══════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════

def categorize_transaction(description, txn_type='DEBIT', mode='UPI'):
    """Predict category for a single transaction"""
    text = f"{str(description).upper()} {txn_type} {mode}"
    vec  = tfidf_vec.transform([text])
    pred = classifier.predict(vec)[0]
    prob = float(classifier.predict_proba(vec).max())
    return pred, round(prob * 100, 1)


def run_forecast(monthly_data, periods=6):
    """
    monthly_data: list of dicts with keys: ds (YYYY-MM-DD), savings
    Returns: list of forecast dicts
    """
    df = pd.DataFrame(monthly_data)
    df['ds']      = pd.to_datetime(df['ds'])
    df['savings'] = pd.to_numeric(df['savings'])
    df = df.sort_values('ds').reset_index(drop=True)
    n  = len(df)

    preds = {}

    # Prophet
    try:
        m = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.1,
            seasonality_mode='additive'  # Additive handles negative savings without exponentially blowing up
        )
        prophet_df = df[['ds','savings']].rename(columns={'savings':'y'})
        m.fit(prophet_df)
        future   = m.make_future_dataframe(periods=periods, freq='MS')
        forecast = m.predict(future)
        preds['prophet'] = forecast.tail(periods)['yhat'].values
    except Exception as e:
        app.logger.warning(f"[forecast] Prophet failed: {e}")

    # ARIMA
    try:
        order  = (1,1,1) if n >= 6 else (1,0,0)
        result = ARIMA(df['savings'].values, order=order).fit()
        preds['arima'] = result.forecast(steps=periods)
    except Exception as e:
        app.logger.warning(f"[forecast] ARIMA failed: {e}")

    # Linear Regression
    try:
        X = np.arange(n).reshape(-1,1)
        y = df['savings'].values
        lr = LinearRegression().fit(X, y)
        preds['linear'] = lr.predict(np.arange(n, n+periods).reshape(-1,1))
    except Exception as e:
        app.logger.warning(f"[forecast] LinearReg failed: {e}")

    if not preds:
        app.logger.error("[forecast] ALL models failed — "
                         "returning linear trend fallback")
        # Emergency fallback: simple average-based prediction
        avg_savings = float(df['savings'].mean())
        last_date   = df['ds'].iloc[-1]
        future_dates = pd.date_range(
            start=last_date + pd.DateOffset(months=1),
            periods=periods, freq='MS'
        )
        return [
            {
                'month':             d.strftime('%b %Y'),
                'predicted_savings': round(avg_savings, 2),
                'lower_bound':       round(avg_savings * 0.85, 2),
                'upper_bound':       round(avg_savings * 1.15, 2),
            }
            for d in future_dates
        ]

    # Weighted ensemble
    weights = {'prophet':0.5, 'arima':0.3, 'linear':0.2}
    total_w = sum(weights[k] for k in preds)
    ensemble = np.zeros(periods)
    for k, v in preds.items():
        ensemble += np.array(v[:periods]) * (weights[k] / total_w)

    # Build future dates
    last_date    = df['ds'].iloc[-1]
    future_dates = pd.date_range(
        start=last_date + pd.DateOffset(months=1),
        periods=periods, freq='MS'
    )

    # Calculate std from historical data for confidence bounds
    hist_std = float(df['savings'].std()) if len(df) > 1 else abs(float(df['savings'].mean())) * 0.15
    
    # Calculate historical extremums for safety-clamping
    max_saving = float(df['savings'].max())
    min_saving = float(df['savings'].min())
    historical_range = max_saving - min_saving if len(df) > 1 else abs(max_saving)
    
    # Safe limits: Don't let it predict a drop/spike more than double the entire historical range
    safe_min = min_saving - historical_range
    safe_max = max_saving + historical_range

    # Recent trend (last 3 months avg or all if <3) for more accurate prediction
    recent_avg = float(df['savings'].tail(3).mean()) if len(df) >= 3 else float(df['savings'].mean())
    # If ensemble prediction sign disagrees with recent trend, blend towards recent
    for i in range(periods):
        if recent_avg > 0 and ensemble[i] < 0:
            # Recent months are positive but model predicts negative
            # Blend: 70% recent, 30% model
            ensemble[i] = recent_avg * 0.7 + ensemble[i] * 0.3
            
        # Clamp to prevent massive graphical divergence (-300k, etc.)
        ensemble[i] = np.clip(ensemble[i], safe_min, safe_max)

    result = []
    prev_val = float(df['savings'].iloc[-1])  # last known actual savings
    for i, (d, v) in enumerate(zip(future_dates, ensemble)):
        val = round(float(v), 2)
        # Correct confidence bounds: lower is always < upper
        bound_margin = hist_std * (1 + 0.1 * i)  # widen over time
        lo = round(val - bound_margin, 2)
        hi = round(val + bound_margin, 2)

        month_name = d.strftime('%B %Y')  # e.g. "May 2026"

        # Compute trend vs previous month
        change = val - prev_val
        change_pct = abs(change / prev_val * 100) if prev_val != 0 else 0

        # Build a human-friendly description
        if val > 0:
            trend_part = ""
            if i > 0:
                if change > 0:
                    trend_part = f" That's about ₹{abs(change):,.0f} more than the previous month — your savings are trending upward."
                elif change < 0:
                    trend_part = f" That's about ₹{abs(change):,.0f} less than the previous month — consider tightening discretionary spending."
                else:
                    trend_part = " Steady compared to last month — you're on a consistent track."

            desc = (
                f"In {month_name}, you're expected to save around ₹{abs(val):,.0f} after all expenses."
                f"{trend_part}"
                f" Keep your spending habits stable to hit this target."
            )
        elif val == 0:
            desc = (
                f"In {month_name}, your income and expenses are expected to roughly balance out."
                f" Consider cutting a small non-essential expense to push into positive savings."
            )
        else:
            trend_part = ""
            if i > 0 and change < 0:
                trend_part = f" This is ₹{abs(change):,.0f} worse than the previous month."
            desc = (
                f"In {month_name}, expenses may exceed income by about ₹{abs(val):,.0f}."
                f"{trend_part}"
                f" Review large upcoming payments and try to defer non-urgent spending."
            )

        prev_val = val
        result.append({
            'month':             d.strftime('%b %Y'),
            'predicted_savings': val,
            'lower_bound':       lo,
            'upper_bound':       hi,
            'description':       desc,
        })

    return result


def detect_anomalies(transactions):
    """
    transactions: list of dicts with keys:
      description, amount, category, type, mode
    Returns same list with anomaly info added.

    IMPORTANT: Only DEBIT transactions are evaluated for anomalies.
    Credits (salary, transfers received, refunds) are never flagged.
    """
    if not transactions:
        return []

    # ── Separate credits from debits ──────────────────────────────────────
    # Credits should never be flagged as anomalies — they are income.
    debit_indices = []
    credit_indices = []
    for i, txn in enumerate(transactions):
        txn_type = str(txn.get('type', 'DEBIT')).upper()
        if txn_type == 'CREDIT':
            credit_indices.append(i)
        else:
            debit_indices.append(i)

    # If no debits, return all as non-anomaly
    if not debit_indices:
        results = []
        for txn in transactions:
            results.append({
                **txn,
                'is_anomaly':    False,
                'anomaly_score': 0.0,
                'z_score':       0.0,
            })
        return results

    # ── Run anomaly detection on debits only ──────────────────────────────
    debit_txns = [transactions[i] for i in debit_indices]
    df = pd.DataFrame(debit_txns)
    df['amount'] = pd.to_numeric(df.get('amount', 0)).abs()

    # Provide fallbacks if backend payload is missing keys
    if 'mode' not in df.columns:
        df['mode'] = 'UPI'
    if 'type' not in df.columns:
        df['type'] = 'DEBIT'
    if 'category' not in df.columns:
        df['category'] = 'Other'

    # Safe label encoding (handle unseen labels)
    def safe_encode(encoder, series):
        known = set(encoder.classes_)
        return series.apply(
            lambda x: encoder.transform([x])[0]
            if x in known else 0
        )

    df['category_enc'] = safe_encode(le_cat,  df['category'])
    df['mode_enc']     = safe_encode(le_mode, df['mode'])
    df['type_enc']     = safe_encode(le_type, df['type'])

    # Merge category stats
    df = df.merge(cat_stats, on='category', how='left')
    df['cat_std']    = df['cat_std'].fillna(1).replace(0, 1)
    df['cat_mean']   = df['cat_mean'].fillna(df['amount'])
    df['cat_median'] = df['cat_median'].fillna(df['amount'])

    df['z_score']          = (df['amount'] - df['cat_mean']) / df['cat_std']
    df['amount_vs_median'] = df['amount'] / (df['cat_median'] + 1)
    df['log_amount']       = np.log1p(df['amount'])   # matches retrain_all.py

    # Try new feature set (after retrain_all.py), fall back to old scaler shape
    try:
        features = [
            'amount', 'log_amount', 'category_enc', 'mode_enc', 'type_enc',
            'z_score', 'amount_vs_median', 'cat_mean', 'cat_median', 'cat_std',
        ]
        X        = df[features].fillna(0)
        X_scaled = scaler.transform(X)
    except Exception:
        features = [
            'amount', 'category_enc', 'mode_enc', 'type_enc',
            'z_score', 'amount_vs_median', 'cat_mean', 'cat_median',
        ]
        X        = df[features].fillna(0)
        X_scaled = scaler.transform(X)

    scores       = iso_forest.decision_function(X_scaled)
    predictions  = iso_forest.predict(X_scaled)

    # ── Reassemble full results list in original order ────────────────────
    # Build a map of debit index → anomaly result
    debit_results = {}
    for j, orig_idx in enumerate(debit_indices):
        debit_results[orig_idx] = {
            'is_anomaly':    bool(predictions[j] == -1),
            'anomaly_score': round(float(scores[j]), 4),
            'z_score':       round(float(df['z_score'].iloc[j]), 2),
        }

    results = []
    for i, txn in enumerate(transactions):
        if i in debit_results:
            results.append({**txn, **debit_results[i]})
        else:
            # Credit transaction — never an anomaly
            results.append({
                **txn,
                'is_anomaly':    False,
                'anomaly_score': 0.0,
                'z_score':       0.0,
            })

    return results


# ══════════════════════════════════════════════════════════════════════
#  API ROUTES
# ══════════════════════════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':  'ok',
        'models':  ['categorizer', 'forecaster', 'anomaly_detector'],
        'version': '1.0.0'
    })


# ── Route 1: Categorize a single transaction ──────────────────────────
@app.route('/api/categorize', methods=['POST'])
def categorize():
    """
    POST body: {
        "description": "ZOMATO ORDER 9182",
        "type": "DEBIT",
        "mode": "UPI"
    }
    """
    data = request.get_json()
    if not data or 'description' not in data:
        return jsonify({'error': 'description is required'}), 400

    category, confidence = categorize_transaction(
        data['description'],
        data.get('type', 'DEBIT'),
        data.get('mode', 'UPI')
    )
    return jsonify({
        'category':   category,
        'confidence': confidence,
    })


# ── Route 2: Categorize a batch of transactions ───────────────────────
@app.route('/api/categorize/batch', methods=['POST'])
def categorize_batch():
    """
    POST body: {
        "transactions": [
            {"description": "ZOMATO ORDER", "type": "DEBIT", "mode": "UPI"},
            {"description": "SALARY CREDIT", "type": "CREDIT", "mode": "NEFT"}
        ]
    }
    """
    data = request.get_json()
    if not data or 'transactions' not in data:
        return jsonify({'error': 'transactions array is required'}), 400

    results = []
    for txn in data['transactions']:
        category, confidence = categorize_transaction(
            txn.get('description', ''),
            txn.get('type', 'DEBIT'),
            txn.get('mode', 'UPI')
        )
        results.append({
            **txn,
            'category':   category,
            'confidence': confidence,
        })

    return jsonify({'transactions': results, 'count': len(results)})


# ── Route 3: Savings forecast ─────────────────────────────────────────
@app.route('/api/forecast', methods=['POST'])
def forecast():
    """
    POST body: {
        "monthly_data": [
            {"ds": "2024-01-01", "savings": 12000},
            {"ds": "2024-02-01", "savings": 9500},
            ...
        ],
        "periods": 6
    }
    """
    data = request.get_json()
    if not data or 'monthly_data' not in data:
        return jsonify({'error': 'monthly_data is required'}), 400

    monthly = data['monthly_data']
    periods = int(data.get('periods', 6))

    if len(monthly) < 3:
        return jsonify({
            'error':   'Need at least 3 months of data for forecasting',
            'message': 'Upload more bank statements to unlock this feature'
        }), 400

    result = run_forecast(monthly, periods)
    total  = sum(r['predicted_savings'] for r in result)

    return jsonify({
        'forecast':       result,
        'total_predicted': round(total, 2),
        'periods':        periods,
        'months_used':    len(monthly),
    })


# ── Route 4: Anomaly detection ────────────────────────────────────────
@app.route('/api/anomaly', methods=['POST'])
def anomaly():
    """
    POST body: {
        "transactions": [
            {
                "description": "ZOMATO ORDER",
                "amount": 450,
                "category": "Food & Dining",
                "type": "DEBIT",
                "mode": "UPI"
            }
        ]
    }
    """
    data = request.get_json()
    if not data or 'transactions' not in data:
        return jsonify({'error': 'transactions array is required'}), 400

    results    = detect_anomalies(data['transactions'])
    flagged    = [r for r in results if r['is_anomaly']]

    return jsonify({
        'transactions':  results,
        'total':         len(results),
        'anomaly_count': len(flagged),
        'anomalies':     flagged,
    })


# ── Route 5: Full pipeline (categorize + anomaly in one call) ─────────
@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    The main endpoint your frontend will call after PDF parsing.
    POST body: {
        "transactions": [
            {
                "description": "ZOMATO ORDER 9182",
                "amount": 450,
                "type": "DEBIT",
                "mode": "UPI"
            }
        ]
    }
    """
    data = request.get_json()
    if not data or 'transactions' not in data:
        return jsonify({'error': 'transactions array is required'}), 400

    transactions = data['transactions']

    # Step 1: Categorize all transactions
    for txn in transactions:
        cat, conf = categorize_transaction(
            txn.get('description', ''),
            txn.get('type', 'DEBIT'),
            txn.get('mode', 'UPI')
        )
        txn['category']   = cat
        txn['confidence'] = conf

    # Step 2: Run anomaly detection on categorized data
    analyzed = detect_anomalies(transactions)
    flagged  = [t for t in analyzed if t['is_anomaly']]

    # Step 3: Summary stats
    debits  = [t for t in analyzed if t.get('type') == 'DEBIT']
    credits = [t for t in analyzed if t.get('type') == 'CREDIT']

    total_expense = sum(t['amount'] for t in debits)
    total_income  = sum(t['amount'] for t in credits)
    savings       = total_income - total_expense

    # Category breakdown
    cat_breakdown = {}
    for t in debits:
        cat = t['category']
        cat_breakdown[cat] = cat_breakdown.get(cat, 0) + t['amount']

    return jsonify({
        'transactions':    analyzed,
        'summary': {
            'total_income':   round(total_income, 2),
            'total_expense':  round(total_expense, 2),
            'savings':        round(savings, 2),
            'txn_count':      len(analyzed),
            'anomaly_count':  len(flagged),
        },
        'category_breakdown': {
            k: round(v, 2)
            for k, v in sorted(
                cat_breakdown.items(),
                key=lambda x: x[1], reverse=True
            )
        },
        'anomalies': flagged,
    })


# ==========================================================================
if __name__ == '__main__':
    # Render passes PORT env var automatically.
    # gunicorn is the actual server on Render (via render.yaml startCommand).
    # This block is only used for local development.
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'

    logger.info("Bachat AI ML API starting...")
    logger.info("Endpoints available:")
    logger.info("  GET  /health")
    logger.info("  POST /api/categorize")
    logger.info("  POST /api/categorize/batch")
    logger.info("  POST /api/forecast")
    logger.info("  POST /api/anomaly")
    logger.info("  POST /api/analyze      <- main endpoint")

    if debug:
        logger.info(f"Mode: DEVELOPMENT (debug=True) on port {port}")
        app.run(debug=True, host='0.0.0.0', port=port)
    else:
        logger.info(f"Mode: PRODUCTION on port {port}")
        try:
            from waitress import serve
            serve(app, host='0.0.0.0', port=port, threads=4)
        except ImportError:
            logger.warning("waitress not installed - using Flask dev server.")
            app.run(debug=False, host='0.0.0.0', port=port)