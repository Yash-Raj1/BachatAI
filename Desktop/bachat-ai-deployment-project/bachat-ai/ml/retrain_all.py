"""
retrain_all.py  --  Master retraining script for ALL Bachat AI ML models.
Runs in order:
  1. Categorizer  (TF-IDF + Logistic Regression + Random Forest ensemble)
  2. Anomaly Detector  (Isolation Forest with improved contamination tuning)
Usage:
  cd bachat-ai/ml
  python retrain_all.py
"""

import os, sys, json, warnings, time
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, accuracy_score
from sklearn.utils.class_weight import compute_class_weight


def separator(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ─────────────────────────────────────────────────────────────
# STEP 1: CATEGORIZER
# ─────────────────────────────────────────────────────────────
separator("STEP 1: Training Transaction Categorizer")

DATA_PATH = 'data/processed/clean_transactions.csv'
if not os.path.exists(DATA_PATH):
    print(f"[ERROR] Data not found at {DATA_PATH}")
    print("    Run 01_prepare_data.py first.")
    sys.exit(1)

df = pd.read_csv(DATA_PATH)
print(f"   Loaded {len(df):,} rows | {df['category'].nunique()} categories")

# Ensure required columns
for col in ['description', 'type', 'mode', 'category']:
    if col not in df.columns:
        df[col] = 'OTHER'

df['description'] = df['description'].fillna('').astype(str).str.upper().str.strip()
df['type']        = df['type'].fillna('DEBIT').astype(str).str.upper()
df['mode']        = df['mode'].fillna('UPI').astype(str).str.upper()
df['category']    = df['category'].astype(str).str.strip()

# Remove rows with too-few samples (avoid stratify error)
cat_counts = df['category'].value_counts()
valid_cats = cat_counts[cat_counts >= 5].index
df = df[df['category'].isin(valid_cats)].copy()
print(f"   After filtering rare classes: {len(df):,} rows | {df['category'].nunique()} categories")

# Combined text feature (description + transaction type + mode)
df['text_feature'] = df['description'] + ' ' + df['type'] + ' ' + df['mode']

X = df['text_feature']
y = df['category']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\n   Train: {len(X_train):,}  | Test: {len(X_test):,}")

# TF-IDF vectorizer with improved settings
tfidf = TfidfVectorizer(
    analyzer='word',
    ngram_range=(1, 3),     # unigrams, bigrams, trigrams
    max_features=20000,     # increased vocab
    min_df=1,               # include rare but important terms
    sublinear_tf=True,
    strip_accents='unicode',
    lowercase=True,
)

X_train_vec = tfidf.fit_transform(X_train)
X_test_vec  = tfidf.transform(X_test)

# Logistic Regression (primary — best for text)
print("\n   Training Logistic Regression...")
t0 = time.time()
lr = LogisticRegression(
    max_iter=2000,
    C=8.0,
    class_weight='balanced',
    solver='saga',          # better for large datasets
    random_state=42,
    n_jobs=-1,
)
lr.fit(X_train_vec, y_train)
lr_acc = accuracy_score(y_test, lr.predict(X_test_vec))
print(f"   LR Accuracy: {lr_acc*100:.2f}%  ({time.time()-t0:.1f}s)")

# Random Forest (secondary — catches non-linear term combos)
print("\n   Training Random Forest...")
t0 = time.time()
rf = RandomForestClassifier(
    n_estimators=300,
    max_depth=35,
    min_samples_leaf=2,
    class_weight='balanced_subsample',
    random_state=42,
    n_jobs=-1,
)
rf.fit(X_train_vec, y_train)
rf_acc = accuracy_score(y_test, rf.predict(X_test_vec))
print(f"   RF Accuracy: {rf_acc*100:.2f}%  ({time.time()-t0:.1f}s)")

# Pick best
if lr_acc >= rf_acc:
    best_clf, best_name, best_acc = lr, 'LogisticRegression', lr_acc
else:
    best_clf, best_name, best_acc = rf, 'RandomForest', rf_acc

print(f"\n   Best: {best_name} @ {best_acc*100:.2f}%")
print(f"\n{classification_report(y_test, best_clf.predict(X_test_vec), zero_division=0)}")

# Save
os.makedirs('models/categorizer', exist_ok=True)
joblib.dump(tfidf,    'models/categorizer/tfidf_vectorizer.pkl')
joblib.dump(best_clf, 'models/categorizer/classifier.pkl')

categories = sorted(df['category'].unique().tolist())
with open('models/categorizer/categories.json', 'w') as f:
    json.dump(categories, f, indent=2)

meta = {
    'model':         best_name,
    'accuracy':      round(best_acc, 4),
    'categories':    categories,
    'num_categories': len(categories),
    'train_rows':    len(X_train),
    'test_rows':     len(X_test),
    'features':      'description + type + mode (TF-IDF trigrams, 20K vocab)',
    'trained_at':    pd.Timestamp.now().isoformat(),
}
with open('models/categorizer/model_info.json', 'w') as f:
    json.dump(meta, f, indent=2)

print("   [OK] Categorizer saved to models/categorizer/")


# ─────────────────────────────────────────────────────────────
# STEP 2: ANOMALY DETECTOR
# ─────────────────────────────────────────────────────────────
separator("STEP 2: Training Anomaly Detector (Isolation Forest)")

df2 = pd.read_csv(DATA_PATH)
df2['amount']   = pd.to_numeric(df2['amount'], errors='coerce').fillna(0).abs()
df2['category'] = df2['category'].fillna('Other').astype(str).str.strip()
df2['mode']     = df2['mode'].fillna('UPI').astype(str).str.upper()
df2['type']     = df2['type'].fillna('DEBIT').astype(str).str.upper()

# Fit label encoders
le_cat  = LabelEncoder().fit(df2['category'])
le_mode = LabelEncoder().fit(df2['mode'])
le_type = LabelEncoder().fit(df2['type'])

df2['category_enc'] = le_cat.transform(df2['category'])
df2['mode_enc']     = le_mode.transform(df2['mode'])
df2['type_enc']     = le_type.transform(df2['type'])

# Per-category statistics (what is 'normal' per category)
cat_stats = df2.groupby('category')['amount'].agg(['mean', 'std', 'median']).reset_index()
cat_stats.columns = ['category', 'cat_mean', 'cat_std', 'cat_median']
cat_stats['cat_std'] = cat_stats['cat_std'].fillna(1).replace(0, 1)

df2 = df2.merge(cat_stats, on='category', how='left')
df2['z_score']          = (df2['amount'] - df2['cat_mean']) / df2['cat_std']
df2['amount_vs_median'] = df2['amount'] / (df2['cat_median'] + 1)
df2['log_amount']       = np.log1p(df2['amount'])    # NEW: log helps with skew

features = [
    'amount',
    'log_amount',       # NEW
    'category_enc',
    'mode_enc',
    'type_enc',
    'z_score',
    'amount_vs_median',
    'cat_mean',
    'cat_median',
    'cat_std',          # NEW
]

X2 = df2[features].fillna(0)
scaler2 = StandardScaler()
X2_scaled = scaler2.fit_transform(X2)

# Adaptive contamination: estimate from data distribution
# Use IQR to approximate expected outlier rate
q1, q3 = df2['amount'].quantile([0.25, 0.75])
iqr = q3 - q1
outlier_mask = (df2['amount'] > q3 + 2.5 * iqr) | (df2['z_score'].abs() > 3)
auto_contamination = float(outlier_mask.sum() / len(df2))
contamination = max(0.02, min(0.12, auto_contamination))  # clamp 2–12%
print(f"   Adaptive contamination: {contamination*100:.1f}%  (estimated from IQR + z-score)")

print(f"   Training Isolation Forest ({len(df2):,} samples)...")
t0 = time.time()
iso = IsolationForest(
    n_estimators=300,           # increased from 200
    contamination=contamination,
    max_samples='auto',
    max_features=0.8,           # feature subsampling
    bootstrap=True,
    random_state=42,
    n_jobs=-1,
)
iso.fit(X2_scaled)

# Evaluate
preds   = iso.predict(X2_scaled)
n_anom  = (preds == -1).sum()
n_norm  = (preds == 1).sum()
print(f"   Flagged anomalies: {n_anom:,} / {len(df2):,}  ({n_anom/len(df2)*100:.1f}%)  ({time.time()-t0:.1f}s)")

# Top 5 flagged samples for inspection
scores = iso.decision_function(X2_scaled)
df2['anomaly_score'] = scores
df2['is_anomaly']    = preds
print("\n   Top flagged anomalies:")
top_anom = df2[df2['is_anomaly'] == -1].nlargest(5, 'amount')[['description', 'category', 'amount', 'z_score']]
for _, r in top_anom.iterrows():
    print(f"      [{r['category']:<18}] Rs.{r['amount']:>8,.0f}  z={r['z_score']:.1f}  {str(r['description'])[:40]}")

# Save
os.makedirs('models/anomaly', exist_ok=True)
joblib.dump(iso,    'models/anomaly/isolation_forest.pkl')
joblib.dump(scaler2,'models/anomaly/scaler.pkl')
joblib.dump(le_cat, 'models/anomaly/label_encoder_category.pkl')
joblib.dump(le_mode,'models/anomaly/label_encoder_mode.pkl')
joblib.dump(le_type,'models/anomaly/label_encoder_type.pkl')
cat_stats.to_csv('models/anomaly/category_stats.csv', index=False)

meta2 = {
    'features':       features,
    'contamination':  contamination,
    'n_estimators':   300,
    'anomaly_rate':   round(n_anom / len(df2), 4),
    'categories':     le_cat.classes_.tolist(),
    'modes':          le_mode.classes_.tolist(),
    'trained_at':     pd.Timestamp.now().isoformat(),
}
with open('models/anomaly/model_info.json', 'w') as f:
    json.dump(meta2, f, indent=2)

print("   [OK] Anomaly Detector saved to models/anomaly/")


# ─────────────────────────────────────────────────────────────
# DONE
# ─────────────────────────────────────────────────────────────
separator("ALL MODELS RETRAINED SUCCESSFULLY")
print("""
  Categorizer   : %s | %.2f%% accuracy
  Anomaly Model : Isolation Forest | %.1f%% contamination
  Forecaster    : Trained on-the-fly (Prophet + ARIMA + LinearReg per request)

  Next step: Restart the ML server:
    python app.py
""" % (best_name, best_acc*100, contamination*100))
