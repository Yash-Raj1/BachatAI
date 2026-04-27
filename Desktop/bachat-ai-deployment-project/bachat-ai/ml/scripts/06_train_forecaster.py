# ml/scripts/06_train_forecaster.py
import pandas as pd
import numpy as np
import joblib, json, os, warnings
warnings.filterwarnings('ignore')

from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

print("📂 Loading monthly summaries...")
df = pd.read_csv('data/processed/monthly_summaries.csv')
print(f"   {len(df)} monthly records, {df['user_id'].nunique()} users")

# ── Core forecasting function ──────────────────────────────────────────
def forecast_savings(monthly_df, periods=6):
    """
    Takes a user's monthly savings history,
    returns forecast for next `periods` months.
    Uses Prophet + ARIMA ensemble.
    """
    monthly_df = monthly_df.sort_values('ds').reset_index(drop=True)
    n = len(monthly_df)

    results = {
        'prophet': None,
        'arima':   None,
        'linear':  None,
    }

    # ── 1. Prophet ─────────────────────────────────────────────────────
    try:
        prophet_df = monthly_df[['ds', 'savings']].rename(
            columns={'savings': 'y'}
        )
        prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])

        m = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.1
        )
        m.fit(prophet_df)

        future   = m.make_future_dataframe(periods=periods, freq='MS')
        forecast = m.predict(future)
        results['prophet'] = forecast.tail(periods)[['ds', 'yhat']].rename(
            columns={'yhat': 'predicted_savings'}
        )
        print(f"   ✅ Prophet trained on {n} months")
    except Exception as e:
        print(f"   ⚠️  Prophet failed: {e}")

    # ── 2. ARIMA ───────────────────────────────────────────────────────
    try:
        savings_series = monthly_df['savings'].values
        order = (1, 1, 1) if n >= 6 else (1, 0, 0)

        arima_model  = ARIMA(savings_series, order=order)
        arima_result = arima_model.fit()
        arima_pred   = arima_result.forecast(steps=periods)

        # Build future dates
        last_date  = pd.to_datetime(monthly_df['ds'].iloc[-1])
        future_dates = pd.date_range(
            start=last_date + pd.DateOffset(months=1),
            periods=periods, freq='MS'
        )
        results['arima'] = pd.DataFrame({
            'ds':                future_dates,
            'predicted_savings': arima_pred
        })
        print(f"   ✅ ARIMA trained ({order})")
    except Exception as e:
        print(f"   ⚠️  ARIMA failed: {e}")

    # ── 3. Linear Regression trend ────────────────────────────────────
    try:
        X = np.arange(n).reshape(-1, 1)
        y = monthly_df['savings'].values
        lr = LinearRegression()
        lr.fit(X, y)

        future_X     = np.arange(n, n + periods).reshape(-1, 1)
        linear_pred  = lr.predict(future_X)

        last_date    = pd.to_datetime(monthly_df['ds'].iloc[-1])
        future_dates = pd.date_range(
            start=last_date + pd.DateOffset(months=1),
            periods=periods, freq='MS'
        )
        results['linear'] = pd.DataFrame({
            'ds':                future_dates,
            'predicted_savings': linear_pred
        })
        print(f"   ✅ Linear Regression trained")
    except Exception as e:
        print(f"   ⚠️  Linear failed: {e}")

    # ── 4. Weighted Ensemble ───────────────────────────────────────────
    available = {k: v for k, v in results.items() if v is not None}

    # Weights: Prophet is most reliable, then ARIMA, then Linear
    weights = {'prophet': 0.5, 'arima': 0.3, 'linear': 0.2}

    if not available:
        return None

    # Normalize weights for available models only
    total_w = sum(weights[k] for k in available)
    norm_w  = {k: weights[k] / total_w for k in available}

    # Combine predictions
    ensemble_preds = np.zeros(periods)
    for model_name, forecast_df in available.items():
        preds = forecast_df['predicted_savings'].values[:periods]
        ensemble_preds += preds * norm_w[model_name]

    last_date    = pd.to_datetime(monthly_df['ds'].iloc[-1])
    future_dates = pd.date_range(
        start=last_date + pd.DateOffset(months=1),
        periods=periods, freq='MS'
    )

    ensemble_df = pd.DataFrame({
        'month':             [d.strftime('%b %Y') for d in future_dates],
        'predicted_savings': np.round(ensemble_preds, 2),
        'lower_bound':       np.round(ensemble_preds * 0.85, 2),
        'upper_bound':       np.round(ensemble_preds * 1.15, 2),
    })

    return ensemble_df

# ── Test on demo_user ──────────────────────────────────────────────────
print("\n🧪 Testing forecaster on demo_user...")
demo_df = df[df['user_id'] == 'demo_user'].copy()

forecast = forecast_savings(demo_df, periods=6)

print("\n📊 Demo User — 6-Month Savings Forecast:")
print(f"{'Month':<15} {'Predicted':>12} {'Low':>10} {'High':>10}")
print("─" * 50)
for _, row in forecast.iterrows():
    bar = '█' * int(row['predicted_savings'] / 1000)
    print(f"{row['month']:<15} ₹{row['predicted_savings']:>10,.0f}"
          f"  ₹{row['lower_bound']:>8,.0f}  ₹{row['upper_bound']:>8,.0f}  {bar}")

total = forecast['predicted_savings'].sum()
print(f"\n💰 Total predicted savings (6 months): ₹{total:,.0f}")

# ── Save the forecaster function + demo result ────────────────────────
os.makedirs('models/forecaster', exist_ok=True)

# Save the demo forecast for API testing
forecast.to_csv('models/forecaster/demo_forecast.csv', index=False)

# Save metadata
meta = {
    'models_used':   ['Prophet', 'ARIMA', 'LinearRegression'],
    'weights':       {'prophet': 0.5, 'arima': 0.3, 'linear': 0.2},
    'forecast_months': 6,
    'min_months_needed': 3,
    'description': 'Ensemble forecaster: Prophet + ARIMA + Linear Regression'
}
with open('models/forecaster/model_info.json', 'w') as f:
    json.dump(meta, f, indent=2)

print("\n✅ Saved to models/forecaster/")
print("   demo_forecast.csv")
print("   model_info.json")
print("\n✅ Forecaster training complete!")