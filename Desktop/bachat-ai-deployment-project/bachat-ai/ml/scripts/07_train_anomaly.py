# ml/scripts/07_train_anomaly.py
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib, json, os, warnings
warnings.filterwarnings('ignore')

print("📂 Loading transaction data...")
df = pd.read_csv('data/processed/clean_transactions.csv')
print(f"   {len(df):,} transactions, {df['category'].nunique()} categories")

# ── Build features for anomaly detection ──────────────────────────────
# Anomalies = transactions that are unusually large for their category

print("\n🔧 Engineering features...")

# Label-encode category and mode
from sklearn.preprocessing import LabelEncoder
le_cat  = LabelEncoder()
le_mode = LabelEncoder()
le_type = LabelEncoder()

df['category_enc'] = le_cat.fit_transform(df['category'])
df['mode_enc']     = le_mode.fit_transform(df['mode'])
df['type_enc']     = le_type.fit_transform(df['type'])

# Calculate per-category statistics (what's "normal" for each category)
cat_stats = df.groupby('category')['amount'].agg(['mean','std','median']).reset_index()
cat_stats.columns = ['category', 'cat_mean', 'cat_std', 'cat_median']
df = df.merge(cat_stats, on='category', how='left')

# How many standard deviations away from category mean is this transaction?
df['cat_std'] = df['cat_std'].fillna(1)   # avoid division by zero
df['z_score'] = (df['amount'] - df['cat_mean']) / df['cat_std']

# Amount relative to category median
df['amount_vs_median'] = df['amount'] / (df['cat_median'] + 1)

# Final feature set
features = [
    'amount',
    'category_enc',
    'mode_enc',
    'type_enc',
    'z_score',
    'amount_vs_median',
    'cat_mean',
    'cat_median',
]

X = df[features].fillna(0)

# ── Scale features ─────────────────────────────────────────────────────
print("🔧 Scaling features...")
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ── Train Isolation Forest ─────────────────────────────────────────────
print("\n🚀 Training Isolation Forest...")
iso = IsolationForest(
    n_estimators=200,
    contamination=0.05,   # assume 5% of transactions are anomalous
    random_state=42,
    n_jobs=-1
)
iso.fit(X_scaled)

# ── Check what it flags ────────────────────────────────────────────────
df['anomaly_score'] = iso.decision_function(X_scaled)
df['is_anomaly']    = iso.predict(X_scaled)   # -1 = anomaly, 1 = normal

anomaly_count = (df['is_anomaly'] == -1).sum()
normal_count  = (df['is_anomaly'] == 1).sum()
print(f"   Normal transactions:   {normal_count:,}")
print(f"   Anomalous transactions: {anomaly_count:,}  ({anomaly_count/len(df)*100:.1f}%)")

# ── Show sample anomalies ──────────────────────────────────────────────
print("\n🔍 Sample flagged anomalies (high amount for category):")
anomalies = df[df['is_anomaly'] == -1].nlargest(10, 'amount')
print(f"{'Description':<35} {'Category':<20} {'Amount':>10} {'Z-score':>8}")
print("─" * 80)
for _, row in anomalies.iterrows():
    desc = str(row['description'])[:34]
    print(f"{desc:<35} {row['category']:<20} ₹{row['amount']:>8,.0f}  {row['z_score']:>7.1f}σ")

# ── Save everything ────────────────────────────────────────────────────
os.makedirs('models/anomaly', exist_ok=True)

joblib.dump(iso,    'models/anomaly/isolation_forest.pkl')
joblib.dump(scaler, 'models/anomaly/scaler.pkl')
joblib.dump(le_cat, 'models/anomaly/label_encoder_category.pkl')
joblib.dump(le_mode,'models/anomaly/label_encoder_mode.pkl')
joblib.dump(le_type,'models/anomaly/label_encoder_type.pkl')

# Save category stats (needed at inference time)
cat_stats.to_csv('models/anomaly/category_stats.csv', index=False)

# Save feature list and metadata
meta = {
    'features':      features,
    'contamination': 0.05,
    'n_estimators':  200,
    'anomaly_rate':  round(anomaly_count / len(df), 4),
    'categories':    le_cat.classes_.tolist(),
    'modes':         le_mode.classes_.tolist(),
}
with open('models/anomaly/model_info.json', 'w') as f:
    json.dump(meta, f, indent=2)

print("\n✅ Saved to models/anomaly/")
print("   isolation_forest.pkl")
print("   scaler.pkl")
print("   label_encoder_category.pkl")
print("   label_encoder_mode.pkl")
print("   label_encoder_type.pkl")
print("   category_stats.csv")
print("   model_info.json")
print("\n✅ Anomaly Detector training complete!")