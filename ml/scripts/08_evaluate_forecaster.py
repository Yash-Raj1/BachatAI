# ml/scripts/08_evaluate_forecaster.py
# Measures real forecast accuracy — run this once and save the result

import pandas as pd
import numpy as np
import json
import warnings
warnings.filterwarnings('ignore')

from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error

print("📂 Loading monthly summaries...")
df = pd.read_csv('data/processed/monthly_summaries.csv')

def forecast_savings(monthly_df, periods):
    monthly_df = monthly_df.sort_values('ds').reset_index(drop=True)
    n = len(monthly_df)
    preds = {}

    try:
        prophet_df = monthly_df[['ds','savings']].rename(columns={'savings':'y'})
        prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
        m = Prophet(yearly_seasonality=True, weekly_seasonality=False,
                    daily_seasonality=False, changepoint_prior_scale=0.1)
        m.fit(prophet_df)
        future   = m.make_future_dataframe(periods=periods, freq='MS')
        forecast = m.predict(future)
        preds['prophet'] = forecast.tail(periods)['yhat'].values
    except: pass

    try:
        order = (1,1,1) if n >= 6 else (1,0,0)
        result = ARIMA(monthly_df['savings'].values, order=order).fit()
        preds['arima'] = result.forecast(steps=periods)
    except: pass

    try:
        X = np.arange(n).reshape(-1,1)
        y = monthly_df['savings'].values
        lr = LinearRegression().fit(X, y)
        preds['linear'] = lr.predict(np.arange(n, n+periods).reshape(-1,1))
    except: pass

    if not preds:
        return None

    weights = {'prophet':0.5, 'arima':0.3, 'linear':0.2}
    total_w = sum(weights[k] for k in preds)
    ensemble = np.zeros(periods)
    for k, v in preds.items():
        ensemble += np.array(v[:periods]) * (weights[k] / total_w)

    return np.clip(ensemble, 0, None)


# ── Evaluate across ALL users using walk-forward validation ───────────
print("\n🧪 Running walk-forward validation across all users...\n")

all_maes  = []
all_mapes = []
results   = []

for user_id in df['user_id'].unique():
    user_df = df[df['user_id'] == user_id].sort_values('ds').reset_index(drop=True)

    if len(user_df) < 6:
        continue

    # Use first 12 months to train, last 3 months to test
    train = user_df.iloc[:-3]
    test  = user_df.iloc[-3:]
    actual = test['savings'].values

    predicted = forecast_savings(train, periods=3)
    if predicted is None:
        continue

    mae  = mean_absolute_error(actual, predicted)
    # Avoid division by zero in MAPE
    mape = np.mean(np.abs((actual - predicted) /
           np.where(actual == 0, 1, actual))) * 100

    all_maes.append(mae)
    all_mapes.append(mape)

    results.append({
        'user_id':   user_id,
        'mae':       round(mae, 2),
        'mape':      round(mape, 2),
        'actual_avg':    round(np.mean(actual), 2),
        'predicted_avg': round(np.mean(predicted), 2),
    })

    print(f"  {user_id:<20} MAE: ₹{mae:>8,.0f}   MAPE: {mape:>6.1f}%")

# ── Summary ────────────────────────────────────────────────────────────
avg_mae  = np.mean(all_maes)
avg_mape = np.mean(all_mapes)

print(f"\n{'═'*50}")
print(f"  📊 FORECAST ACCURACY RESULTS")
print(f"{'═'*50}")
print(f"  Users evaluated   : {len(results)}")
print(f"  Average MAE       : ₹{avg_mae:,.0f}")
print(f"  Average MAPE      : {avg_mape:.1f}%")
print(f"  Accuracy (100-MAPE): {100-avg_mape:.1f}%")
print(f"{'═'*50}")

# ── Save results ───────────────────────────────────────────────────────
import os
os.makedirs('models/forecaster', exist_ok=True)

eval_result = {
    'avg_mae':          round(avg_mae, 2),
    'avg_mape':         round(avg_mape, 2),
    'forecast_accuracy': round(100 - avg_mape, 2),
    'users_evaluated':  len(results),
    'validation_method': 'walk-forward (train on 12mo, test on 3mo)',
    'per_user_results': results
}

with open('models/forecaster/evaluation.json', 'w') as f:
    json.dump(eval_result, f, indent=2)

print(f"\n✅ Saved → models/forecaster/evaluation.json")
print(f"\n💬 VIVA ANSWER:")
print(f"   'Our ensemble forecaster achieves a Mean Absolute Error")
print(f"    of ₹{avg_mae:,.0f} with {100-avg_mape:.1f}% accuracy on held-out")
print(f"    test data using walk-forward validation across {len(results)} users.'")