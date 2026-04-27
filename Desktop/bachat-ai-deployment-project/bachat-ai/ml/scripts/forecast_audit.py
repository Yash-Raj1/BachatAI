import pandas as pd, numpy as np, warnings
warnings.filterwarnings('ignore')
from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

df   = pd.read_csv('data/processed/monthly_summaries.csv')
demo = df[df['user_id']=='demo_user'].copy()
print('DEMO_ROWS:', len(demo))
print('SAVE_MIN:', round(demo.savings.min(),0))
print('SAVE_MAX:', round(demo.savings.max(),0))
print('SAVE_MEAN:', round(demo.savings.mean(),0))

train  = demo.iloc[:-3]
test   = demo.iloc[-3:]
actual = test['savings'].values
print('ACTUAL_3:', [round(x,0) for x in actual])

model_preds = {}

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
    print('PROPHET_MAE:', round(mae, 0))
    print('PROPHET_PRED:', [round(x,0) for x in model_preds['prophet']])
    print('PROPHET_STATUS: OK')
except Exception as e:
    print('PROPHET_STATUS: FAILED')
    print('PROPHET_ERR:', str(e)[:200])

# ARIMA
try:
    res = ARIMA(train['savings'].values, order=(1,1,1)).fit()
    model_preds['arima'] = res.forecast(steps=3)
    mae = mean_absolute_error(actual, model_preds['arima'])
    print('ARIMA_MAE:', round(mae, 0))
    print('ARIMA_PRED:', [round(x,0) for x in model_preds['arima']])
    print('ARIMA_STATUS: OK')
except Exception as e:
    print('ARIMA_STATUS: FAILED')
    print('ARIMA_ERR:', str(e)[:200])

# Linear
try:
    X  = np.arange(len(train)).reshape(-1,1)
    y  = train['savings'].values
    lr = LinearRegression().fit(X, y)
    model_preds['linear'] = lr.predict(
        np.arange(len(train), len(train)+3).reshape(-1,1))
    mae = mean_absolute_error(actual, model_preds['linear'])
    print('LINEAR_MAE:', round(mae, 0))
    print('LINEAR_PRED:', [round(x,0) for x in model_preds['linear']])
    print('LINEAR_STATUS: OK')
except Exception as e:
    print('LINEAR_STATUS: FAILED')
    print('LINEAR_ERR:', str(e)[:200])

if model_preds:
    weights = {'prophet':0.5,'arima':0.3,'linear':0.2}
    total_w = sum(weights[k] for k in model_preds)
    ens = np.zeros(3)
    for k,v in model_preds.items():
        ens += np.array(v) * (weights[k]/total_w)
    mae_ens = mean_absolute_error(actual, ens)
    nonzero = actual != 0
    if nonzero.any():
        mape = np.mean(np.abs((actual[nonzero]-ens[nonzero])/actual[nonzero]))*100
    else:
        mape = 999.0
    print('ENS_MAE:', round(mae_ens, 0))
    print('ENS_MAPE:', round(mape, 2))
    print('ENS_ACC:', round(100-mape, 2))
    for i in range(3):
        print(f'MONTH_{i}: actual={actual[i]:.0f} predicted={ens[i]:.0f} diff={abs(actual[i]-ens[i]):.0f}')
else:
    print('ENS_STATUS: ALL_FAILED')

print('DONE')
