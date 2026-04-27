import pandas as pd
import numpy as np
import json, warnings
warnings.filterwarnings('ignore')

print("=" * 55)
print("BACHATAI ML — FULL MODEL PERFORMANCE AUDIT")
print("=" * 55)

# ── 1. CATEGORIZER ────────────────────────────────────
print("\n[1] CATEGORIZER MODEL")
import joblib
tfidf = joblib.load('models/categorizer/tfidf_vectorizer.pkl')
clf   = joblib.load('models/categorizer/classifier.pkl')

with open('models/categorizer/model_info.json') as f:
    info = json.load(f)

print(f"  Algorithm  : {info['model']}")
print(f"  Accuracy   : {info['accuracy']*100:.2f}%")
print(f"  Train rows : {info['train_rows']:,}")
print(f"  Test rows  : {info['test_rows']:,}")
print(f"  Categories : {len(info['categories'])}")

# Quick prediction test
tests = [
  ("ZOMATO ORDER 9182","DEBIT","UPI","Food & Dining"),
  ("SALARY CREDIT NEFT","CREDIT","NEFT","Salary"),
  ("HDFC HOME LOAN EMI","DEBIT","ECS","EMI"),
  ("NETFLIX SUBSCRIPTION","DEBIT","ECS","Entertainment"),
  ("AMAZON PURCHASE","DEBIT","NETBANKING","Shopping"),
  ("APOLLO PHARMACY","DEBIT","UPI","Healthcare"),
  ("GROWW SIP","DEBIT","ECS","Investments"),
  ("BESCOM ELECTRICITY","DEBIT","NETBANKING","Bills"),
  ("OLA CABS","DEBIT","UPI","Travel"),
  ("BIGBASKET GROCERY","DEBIT","UPI","Groceries"),
]
correct = 0
print(f"\n  {'Description':<30} {'Expected':<15} {'Got':<15} {'Conf':>6}")
print(f"  {'─'*70}")
for desc, typ, mode, expected in tests:
    text = f"{desc} {typ} {mode}"
    vec  = tfidf.transform([text])
    pred = clf.predict(vec)[0]
    conf = clf.predict_proba(vec).max() * 100
    ok   = "YES" if pred == expected else "NO"
    if pred == expected: correct += 1
    print(f"  {desc:<30} {expected:<15} {pred:<15} {conf:>5.1f}% {ok}")

print(f"\n  Spot-check accuracy: {correct}/{len(tests)} = "
      f"{correct/len(tests)*100:.0f}%")
verdict = "PRODUCTION READY" if correct >= 9 else "NEEDS WORK"
print(f"  Verdict: {verdict}")

# ── 2. ANOMALY DETECTOR ───────────────────────────────
print("\n[2] ANOMALY DETECTOR MODEL")
iso    = joblib.load('models/anomaly/isolation_forest.pkl')
scaler = joblib.load('models/anomaly/scaler.pkl')
le_cat = joblib.load('models/anomaly/label_encoder_category.pkl')
le_mod = joblib.load('models/anomaly/label_encoder_mode.pkl')
le_typ = joblib.load('models/anomaly/label_encoder_type.pkl')
stats  = pd.read_csv('models/anomaly/category_stats.csv')

with open('models/anomaly/model_info.json') as f:
    ainfo = json.load(f)

print(f"  Algorithm     : Isolation Forest")
print(f"  n_estimators  : {ainfo['n_estimators']}")
print(f"  Contamination : {ainfo['contamination']*100:.0f}%")
print(f"  Anomaly rate  : {ainfo['anomaly_rate']*100:.1f}%")

# Test anomaly detection
anomaly_tests = [
  # (desc, amount, category, expect_anomaly)
  ("ZOMATO ORDER",  350,    "Food & Dining", False),
  ("ZOMATO ORDER",  45000,  "Food & Dining", True),
  ("SALARY CREDIT", 52000,  "Salary",        False),
  ("SALARY CREDIT", 500000, "Salary",        True),
  ("OLA CABS",      200,    "Travel",        False),
  ("OLA CABS",      85000,  "Travel",        True),
]

def check_anomaly(desc, amount, category, typ="DEBIT", mode="UPI"):
    try:
        cat_enc  = le_cat.transform([category])[0]
    except:
        cat_enc  = 0
    try:
        mode_enc = le_mod.transform([mode])[0]
    except:
        mode_enc = 0
    try:
        typ_enc  = le_typ.transform([typ])[0]
    except:
        typ_enc  = 0

    row = stats[stats['category'] == category]
    cat_mean   = float(row['cat_mean'].iloc[0])   if len(row) else amount
    cat_std    = float(row['cat_std'].iloc[0])    if len(row) else 1
    cat_median = float(row['cat_median'].iloc[0]) if len(row) else amount
    cat_std    = max(cat_std, 1)

    z_score = (amount - cat_mean) / cat_std
    amt_vs_median = amount / (cat_median + 1)

    X = scaler.transform([[amount, cat_enc, mode_enc, typ_enc,
                           z_score, amt_vs_median,
                           cat_mean, cat_median]])
    pred  = iso.predict(X)[0]
    score = iso.decision_function(X)[0]
    return pred == -1, round(score, 4), round(z_score, 2)

correct_a = 0
print(f"\n  {'Description':<20} {'Amount':>8} {'Expected':>10} "
      f"{'Got':>10} {'Z-score':>8}")
print(f"  {'─'*65}")
for desc, amt, cat, expected in anomaly_tests:
    is_anom, score, z = check_anomaly(desc, amt, cat)
    ok = "YES" if is_anom == expected else "NO"
    if is_anom == expected: correct_a += 1
    exp_str = "ANOMALY" if expected  else "normal"
    got_str = "ANOMALY" if is_anom   else "normal"
    print(f"  {desc:<20} Rs{amt:>7,} {exp_str:>10} "
          f"{got_str:>10} {z:>7.1f}s  {ok}")

print(f"\n  Spot-check accuracy: {correct_a}/{len(anomaly_tests)} = "
      f"{correct_a/len(anomaly_tests)*100:.0f}%")
verdict_a = "PRODUCTION READY" if correct_a >= 5 else "NEEDS WORK"
print(f"  Verdict: {verdict_a}")

# ── 3. FORECASTER ─────────────────────────────────────
print("\n[3] FORECASTER MODEL")
from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

df = pd.read_csv('data/processed/monthly_summaries.csv')
demo = df[df['user_id']=='demo_user'].copy()

print(f"  Models     : Prophet(50%) + ARIMA(30%) + LinearReg(20%)")
print(f"  Train data : {len(demo)} months demo_user data")
print(f"  Savings range: Rs{demo.savings.min():,.0f} "
      f"- Rs{demo.savings.max():,.0f}")

# Test each model individually with error reporting
train = demo.iloc[:-3]
test  = demo.iloc[-3:]
actual = test['savings'].values
model_preds = {}

print(f"\n  Testing each model (train={len(train)}mo, test=3mo):")

# Prophet
try:
    pdf = train[['ds','savings']].rename(columns={'savings':'y'})
    pdf['ds'] = pd.to_datetime(pdf['ds'])
    m = Prophet(yearly_seasonality=True, weekly_seasonality=False,
                daily_seasonality=False, changepoint_prior_scale=0.1)
    m.fit(pdf)
    future = m.make_future_dataframe(periods=3, freq='MS')
    fc = m.predict(future)
    model_preds['prophet'] = fc.tail(3)['yhat'].values
    mae = mean_absolute_error(actual, model_preds['prophet'])
    print(f"  Prophet     : OK MAE=Rs{mae:,.0f}")
except Exception as e:
    print(f"  Prophet     : FAILED -- {e}")

# ARIMA
try:
    res = ARIMA(train['savings'].values, order=(1,1,1)).fit()
    model_preds['arima'] = res.forecast(steps=3)
    mae = mean_absolute_error(actual, model_preds['arima'])
    print(f"  ARIMA       : OK MAE=Rs{mae:,.0f}")
except Exception as e:
    print(f"  ARIMA       : FAILED -- {e}")

# Linear
try:
    X = np.arange(len(train)).reshape(-1,1)
    y = train['savings'].values
    lr = LinearRegression().fit(X, y)
    model_preds['linear'] = lr.predict(
        np.arange(len(train), len(train)+3).reshape(-1,1))
    mae = mean_absolute_error(actual, model_preds['linear'])
    print(f"  LinearReg   : OK MAE=Rs{mae:,.0f}")
except Exception as e:
    print(f"  LinearReg   : FAILED -- {e}")

# Ensemble
if model_preds:
    weights = {'prophet':0.5,'arima':0.3,'linear':0.2}
    total_w = sum(weights[k] for k in model_preds)
    ens = np.zeros(3)
    for k,v in model_preds.items():
        ens += np.array(v) * (weights[k]/total_w)
    mae_ens = mean_absolute_error(actual, ens)
    # Guard against division by zero in MAPE
    nonzero_mask = actual != 0
    if nonzero_mask.any():
        mape = np.mean(np.abs((actual[nonzero_mask]-ens[nonzero_mask])/actual[nonzero_mask]))*100
    else:
        mape = float('inf')
    print(f"\n  Ensemble MAE  : Rs{mae_ens:,.0f}")
    print(f"  Ensemble MAPE : {mape:.1f}%")
    print(f"  Accuracy      : {100-mape:.1f}%")
    verdict_f = "PRODUCTION READY" if mape < 30 else "ACCEPTABLE"
    print(f"  Verdict       : {verdict_f}")

    print(f"\n  Actual vs Predicted (last 3 months):")
    months = test['ds'].tolist()
    for i,mo in enumerate(months):
        print(f"  {mo[:7]}: actual=Rs{actual[i]:>8,.0f}  "
              f"predicted=Rs{ens[i]:>8,.0f}  "
              f"diff=Rs{abs(actual[i]-ens[i]):>6,.0f}")

else:
    print("  ALL models FAILED - no ensemble possible")

print("\n" + "="*55)
print("AUDIT COMPLETE")
print("="*55)
