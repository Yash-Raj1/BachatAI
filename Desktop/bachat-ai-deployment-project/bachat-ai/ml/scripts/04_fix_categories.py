# ml/scripts/04_fix_categories.py
# Adds missing Indian categories to training data and retrains

import pandas as pd
import random, re, os

random.seed(42)

# ── New merchants for missing categories ───────────────────────────────
NEW_CATEGORIES = {
    'Healthcare': [
        'APOLLO PHARMACY', 'FORTIS HOSPITAL', 'MEDPLUS PHARMACY',
        'NETMEDS', 'PRACTO CONSULTATION', 'PHARMEASY', 'THYROCARE',
        '1MG MEDICINES', 'MAX HOSPITAL', 'AIIMS', 'MANIPAL HOSPITAL',
        'HEALTHKART', 'CIPLA MED', 'DR CONSULTATION'
    ],
    'Investments': [
        'ZERODHA', 'GROWW SIP', 'COIN MUTUAL FUND', 'SIP DEBIT',
        'NIFTY ETF', 'PPF DEPOSIT', 'NSC INVESTMENT', 'LIC PREMIUM',
        'HDFC MUTUAL FUND', 'SBI MUTUAL FUND', 'AXIS MF', 'ELSS FUND',
        'UPSTOX', 'ANGEL BROKING', 'ICICI DIRECT'
    ],
    'Entertainment': [
        'PVR CINEMAS', 'INOX MOVIES', 'BOOKMYSHOW', 'ZEE5',
        'SONY LIV', 'HOTSTAR SUBSCRIPTION', 'DISNEY PLUS',
        'YOUTUBE PREMIUM', 'SPOTIFY MUSIC', 'APPLE MUSIC',
        'HUNGAMA', 'GAANA MUSIC', 'GAMING PURCHASE'
    ],
}

rows = []
for category, merchants in NEW_CATEGORIES.items():
    for merchant in merchants:
        for _ in range(500):   # 500 rows per merchant
            amount = random.randint(50, 5000)
            suffix = random.randint(1000, 9999)

            # Vary the description like real bank statements do
            templates = [
                f"{merchant} {suffix}",
                f"UPI/{merchant.replace(' ','')}{suffix}",
                f"POS {merchant} {suffix}",
                f"{merchant} PAYMENT {suffix}",
            ]
            desc = random.choice(templates)
            mode = random.choice(['UPI', 'NETBANKING', 'ECS', 'NEFT'])

            rows.append({
                'description': desc.upper(),
                'amount':      amount,
                'type':        'DEBIT',
                'mode':        mode,
                'category':    category
            })

new_df = pd.DataFrame(rows)
print(f"Generated {len(new_df):,} new rows")
print(new_df['category'].value_counts())

# ── Merge with existing clean data ─────────────────────────────────────
existing = pd.read_csv('data/processed/clean_transactions.csv')
print(f"\nExisting rows: {len(existing):,}")

combined = pd.concat([existing, new_df], ignore_index=True)
combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)
print(f"Combined rows: {len(combined):,}")
print(f"\nFinal category distribution:")
print(combined['category'].value_counts())

# ── Save ───────────────────────────────────────────────────────────────
combined.to_csv('data/processed/clean_transactions.csv', index=False)
print(f"\n✅ Saved updated dataset → data/processed/clean_transactions.csv")
print("Now run: python scripts/02_train_categorizer.py")