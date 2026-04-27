# ml/scripts/01_prepare_data.py
import pandas as pd
import numpy as np
import os

print("📂 Loading dataset...")
df = pd.read_csv('data/raw/synthetic_100k.csv')
print(f"   Loaded {len(df):,} rows, {len(df.columns)} columns")

# ── Step 1: Keep only columns needed for training ──────────────────────
df = df[['description', 'amount', 'type', 'mode', 'category']].copy()

# ── Step 2: Fix negative amounts (DEBITs are stored as negative) ───────
df['amount'] = df['amount'].abs()

# ── Step 3: Clean description text ────────────────────────────────────
df['description'] = df['description'].str.upper().str.strip()

# Remove reference numbers like Ref:123456 (not useful for categorization)
import re
df['description'] = df['description'].apply(
    lambda x: re.sub(r'REF[:\s]?\d+', '', str(x)).strip()
)
# Remove extra whitespace
df['description'] = df['description'].apply(
    lambda x: re.sub(r'\s+', ' ', x).strip()
)

# ── Step 4: Drop rows with missing values ──────────────────────────────
before = len(df)
df = df.dropna()
print(f"   Dropped {before - len(df)} rows with nulls")

# ── Step 5: Check category distribution ───────────────────────────────
print("\n📊 Category distribution:")
dist = df['category'].value_counts()
for cat, count in dist.items():
    pct = count / len(df) * 100
    bar = '█' * int(pct / 2)
    print(f"   {cat:<20} {count:>6,}  {pct:>5.1f}%  {bar}")

# ── Step 6: Remove categories with too few samples ────────────────────
MIN_SAMPLES = 100
small_cats = dist[dist < MIN_SAMPLES].index.tolist()
if small_cats:
    print(f"\n⚠️  Removing low-sample categories: {small_cats}")
    df = df[~df['category'].isin(small_cats)]

# ── Step 7: Save cleaned data ──────────────────────────────────────────
os.makedirs('data/processed', exist_ok=True)
df.to_csv('data/processed/clean_transactions.csv', index=False)
print(f"\n✅ Saved {len(df):,} clean rows → data/processed/clean_transactions.csv")
print(f"   Final categories: {df['category'].nunique()}")