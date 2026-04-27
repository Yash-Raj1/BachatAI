# ml/scripts/05_generate_forecast_data.py
# Generates realistic monthly financial data for forecaster training/demo

import pandas as pd
import numpy as np
import random, os
from datetime import date

random.seed(42)
np.random.seed(42)

def generate_user_statement(user_id, income_base, months=18):
    """Generate realistic monthly transaction data for one user"""
    rows = []
    start_year, start_month = 2023, 1

    for m in range(months):
        # Calculate actual month/year
        total_month = start_month + m - 1
        year  = start_year + total_month // 12
        month = total_month % 12 + 1

        # Income varies slightly each month (bonus, overtime)
        income = income_base + random.randint(-3000, 8000)

        # Expenses grow slightly over time (lifestyle inflation)
        inflation_factor = 1 + (m * 0.003)

        # Category-wise monthly spend (realistic Indian middle class)
        expenses = {
            'Food & Dining':  random.randint(4000,  9000)  * inflation_factor,
            'Groceries':      random.randint(3000,  6000)  * inflation_factor,
            'Travel':         random.randint(1000,  5000)  * inflation_factor,
            'Shopping':       random.randint(2000,  8000)  * inflation_factor,
            'Bills':          random.randint(2000,  4000),   # bills are stable
            'EMI':            random.randint(5000, 15000),   # EMI is fixed
            'Entertainment':  random.randint(500,   2000)  * inflation_factor,
            'Healthcare':     random.randint(0,     3000),   # irregular
            'Fuel':           random.randint(1000,  3000),
        }

        total_expense = sum(expenses.values())
        savings       = income - total_expense

        rows.append({
            'user_id':       user_id,
            'year':          year,
            'month':         month,
            'ds':            f"{year}-{month:02d}-01",   # Prophet needs 'ds'
            'income':        round(income, 2),
            'total_expense': round(total_expense, 2),
            'savings':       round(savings, 2),
            **{k: round(v, 2) for k, v in expenses.items()}
        })

    return rows

# ── Generate for multiple income levels ───────────────────────────────
all_rows = []

user_profiles = [
    # (user_id,         income_base)
    ('user_low_1',       25000),
    ('user_low_2',       30000),
    ('user_mid_1',       50000),
    ('user_mid_2',       60000),
    ('user_mid_3',       75000),
    ('user_high_1',     100000),
    ('user_high_2',     150000),
    ('demo_user',        52000),   # ← this is your demo account
]

for user_id, income in user_profiles:
    user_data = generate_user_statement(user_id, income, months=18)
    all_rows.extend(user_data)
    print(f"✅ {user_id:<20} income: ₹{income:>7,}  →  {len(user_data)} months generated")

df = pd.DataFrame(all_rows)

os.makedirs('data/processed', exist_ok=True)
df.to_csv('data/processed/monthly_summaries.csv', index=False)

print(f"\n✅ Saved {len(df)} monthly records → data/processed/monthly_summaries.csv")
print(f"   Users: {df['user_id'].nunique()}")
print(f"   Date range: {df['ds'].min()} → {df['ds'].max()}")
print(f"\nSample (demo_user):")
demo = df[df['user_id'] == 'demo_user'][['ds','income','total_expense','savings']].head(6)
print(demo.to_string(index=False))