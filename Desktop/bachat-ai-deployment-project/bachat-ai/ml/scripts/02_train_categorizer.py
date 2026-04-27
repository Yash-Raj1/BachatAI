# ml/scripts/02_train_categorizer.py
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import joblib
import os, json

print("📂 Loading clean data...")
df = pd.read_csv('data/processed/clean_transactions.csv')
print(f"   {len(df):,} rows, {df['category'].nunique()} categories")

# ── Build combined text feature ────────────────────────────────────────
# Combine description + type + mode → richer signal for the model
df['text_feature'] = (
    df['description'] + ' ' +
    df['type'] + ' ' +
    df['mode']
)

X = df['text_feature']
y = df['category']

# ── Train / Test split ─────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\n   Train: {len(X_train):,}  |  Test: {len(X_test):,}")

# ── Build Ensemble Pipeline ────────────────────────────────────────────
# TF-IDF converts text → numbers, then Voting combines two classifiers
print("\n🔧 Building model pipeline...")

tfidf = TfidfVectorizer(
    analyzer='word',
    ngram_range=(1, 2),      # unigrams + bigrams
    max_features=15000,
    min_df=2,
    sublinear_tf=True        # dampens very frequent terms
)

# Transform text first (needed for both classifiers)
X_train_tfidf = tfidf.fit_transform(X_train)
X_test_tfidf  = tfidf.transform(X_test)

# Classifier 1 — Logistic Regression (fast, great for text)
lr = LogisticRegression(
    max_iter=1000,
    C=5.0,
    class_weight='balanced',   # handles imbalanced categories
    random_state=42
)

# Classifier 2 — Random Forest (catches non-linear patterns)
rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=30,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)

print("\n🚀 Training Logistic Regression...")
lr.fit(X_train_tfidf, y_train)
lr_score = lr.score(X_test_tfidf, y_test)
print(f"   LR Accuracy: {lr_score:.4f} ({lr_score*100:.1f}%)")

print("\n🚀 Training Random Forest...")
rf.fit(X_train_tfidf, y_train)
rf_score = rf.score(X_test_tfidf, y_test)
print(f"   RF Accuracy: {rf_score:.4f} ({rf_score*100:.1f}%)")

# ── Full Classification Report ─────────────────────────────────────────
print("\n📊 Detailed Report (Logistic Regression):")
y_pred_lr = lr.predict(X_test_tfidf)
print(classification_report(y_test, y_pred_lr))

# ── Pick best model ────────────────────────────────────────────────────
best_model     = lr if lr_score >= rf_score else rf
best_model_name = 'LogisticRegression' if lr_score >= rf_score else 'RandomForest'
print(f"\n🏆 Best model: {best_model_name} ({max(lr_score, rf_score)*100:.1f}%)")

# ── Save everything ────────────────────────────────────────────────────
os.makedirs('models/categorizer', exist_ok=True)

joblib.dump(tfidf,       'models/categorizer/tfidf_vectorizer.pkl')
joblib.dump(best_model,  'models/categorizer/classifier.pkl')

# Save category list for reference
categories = sorted(df['category'].unique().tolist())
with open('models/categorizer/categories.json', 'w') as f:
    json.dump(categories, f, indent=2)

# Save accuracy metadata
meta = {
    'model':       best_model_name,
    'accuracy':    round(max(lr_score, rf_score), 4),
    'categories':  categories,
    'train_rows':  len(X_train),
    'test_rows':   len(X_test),
    'features':    'description + type + mode (TF-IDF bigrams)'
}
with open('models/categorizer/model_info.json', 'w') as f:
    json.dump(meta, f, indent=2)

print("\n✅ Saved to models/categorizer/")
print(f"   - tfidf_vectorizer.pkl")
print(f"   - classifier.pkl")
print(f"   - categories.json")
print(f"   - model_info.json")