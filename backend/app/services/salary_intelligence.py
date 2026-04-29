"""
Salary Intelligence Engine — Auto-detect salary day & compute daily budget
===========================================================================
Zero manual input — fully automatic from transaction data.
"""

import logging
import calendar
from datetime import date, datetime, timedelta
from collections import Counter
from typing import Optional

import pandas as pd

logger = logging.getLogger('bachat.salary')


class SalaryIntelligenceEngine:

    # ── STEP 1: Detect salary day ─────────────────────────────────────────
    def detect_salary_day(self, df: pd.DataFrame) -> dict:
        if df is None or df.empty:
            return self._no_salary()

        df = df.copy()
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df = df.dropna(subset=['date'])
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0).abs()
        df['month'] = df['date'].dt.to_period('M')
        df['day'] = df['date'].dt.day

        credits = df[df['type'] == 'credit'].copy()
        credits = credits[credits['amount'] >= 5000]
        if credits.empty:
            return self._no_salary()

        # Largest credit per month ≈ salary
        monthly_max = credits.groupby('month').apply(
            lambda g: g.loc[g['amount'].idxmax()]
        ).reset_index(drop=True)

        if len(monthly_max) < 1:
            return self._no_salary()

        if len(monthly_max) == 1:
            row = monthly_max.iloc[0]
            return {
                'salary_day':         int(row['day']),
                'confidence':         55.0,
                'avg_salary':         round(float(row['amount']), 2),
                'last_salary_date':   str(row['date'].date()),
                'last_salary_amount': round(float(row['amount']), 2),
                'detection_method':   'single_month',
            }

        day_counts = Counter(monthly_max['day'].tolist())
        most_common_day, _ = day_counts.most_common(1)[0]
        total_months = len(monthly_max)

        # ±2 day tolerance for weekends / holidays
        tolerance_count = sum(
            v for k, v in day_counts.items() if abs(k - most_common_day) <= 2
        )
        confidence = round((tolerance_count / total_months) * 100, 1)
        avg_salary = float(monthly_max['amount'].mean())
        latest = monthly_max.sort_values('date').iloc[-1]

        return {
            'salary_day':         int(most_common_day),
            'confidence':         confidence,
            'avg_salary':         round(avg_salary, 2),
            'last_salary_date':   str(latest['date'].date()),
            'last_salary_amount': round(float(latest['amount']), 2),
            'detection_method':   'multi_month',
            'months_analyzed':    total_months,
        }

    # ── STEP 2: Calculate current cycle budget ────────────────────────────
    def calculate_current_budget(self, df: pd.DataFrame, salary_day: int,
                                  today: Optional[date] = None) -> dict:
        today = today or date.today()
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0).abs()

        cycle_start, cycle_end = self._get_cycle(today, salary_day)
        days_in_cycle = (cycle_end - cycle_start).days
        days_elapsed = (today - cycle_start).days + 1
        days_remaining = max(0, (cycle_end - today).days)

        cycle_txns = df[(df['date'].dt.date >= cycle_start) & (df['date'].dt.date <= today)]
        total_income = float(cycle_txns[cycle_txns['type'] == 'credit']['amount'].sum())
        total_spent = float(cycle_txns[cycle_txns['type'] == 'debit']['amount'].sum())
        balance = max(0.0, total_income - total_spent)

        daily_budget = round(balance / days_remaining, 2) if days_remaining > 0 else 0.0
        daily_avg_spent = round(total_spent / max(days_elapsed, 1), 2)
        ideal_daily = round(total_income * 0.60 / max(days_in_cycle, 1), 2)
        burn_rate = round((daily_avg_spent / ideal_daily * 100) if ideal_daily > 0 else 100, 1)

        status, message = self._classify(balance, days_remaining, daily_budget,
                                          daily_avg_spent, ideal_daily, total_income)

        return {
            'cycle_start': str(cycle_start), 'cycle_end': str(cycle_end),
            'days_in_cycle': days_in_cycle, 'days_elapsed': days_elapsed,
            'days_remaining': days_remaining,
            'total_income': round(total_income, 2), 'total_spent': round(total_spent, 2),
            'balance_remaining': round(balance, 2),
            'daily_budget': daily_budget, 'ideal_daily_budget': ideal_daily,
            'daily_avg_spent': daily_avg_spent, 'burn_rate_pct': burn_rate,
            'status': status, 'status_message': message,
            'pct_cycle_elapsed': round(days_elapsed / max(days_in_cycle, 1) * 100, 1),
            'pct_money_spent': round(total_spent / total_income * 100 if total_income > 0 else 0, 1),
        }

    # ── STEP 3: Daily history ─────────────────────────────────────────────
    def build_daily_history(self, df: pd.DataFrame, cycle_start: date,
                             today: date, ideal_daily: float) -> list:
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'], errors='coerce').dt.date
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0).abs()
        debits = df[df['type'] == 'debit']

        history = []
        current = cycle_start
        while current <= today:
            day_spent = float(debits[debits['date'] == current]['amount'].sum())
            history.append({
                'date': str(current), 'spent': round(day_spent, 2),
                'budget': round(ideal_daily, 2), 'is_over': day_spent > ideal_daily,
            })
            current += timedelta(days=1)
        return history

    # ── STEP 4: Overspend streak ──────────────────────────────────────────
    def detect_overspend_streak(self, daily_history: list) -> dict:
        if not daily_history:
            return {'streak': 0, 'has_streak': False, 'message': ''}
        spending_days = [d for d in reversed(daily_history) if d['spent'] > 0]
        streak = 0
        for day in spending_days:
            if day['is_over']:
                streak += 1
            else:
                break
        return {
            'streak': streak,
            'has_streak': streak >= 2,
            'message': self._streak_msg(streak),
        }

    # ── STEP 5: Master widget builder ─────────────────────────────────────
    def build_widget(self, df: pd.DataFrame, today: Optional[date] = None) -> dict:
        if df is None or df.empty:
            return {'status': 'insufficient_data', 'message': 'No transactions'}

        if not today:
            try:
                # Use the latest transaction date as "today" for accurate historical cycle
                df_dates = pd.to_datetime(df['date'], errors='coerce').dropna()
                if not df_dates.empty:
                    today = df_dates.max().date()
                else:
                    today = date.today()
            except Exception:
                today = date.today()

        salary_info = self.detect_salary_day(df)
        salary_day = salary_info.get('salary_day')

        if not salary_day:
            return {'status': 'insufficient_data',
                    'message': 'Upload at least 1 month of transactions'}

        budget = self.calculate_current_budget(df, salary_day, today)
        cycle_start = datetime.strptime(budget['cycle_start'], '%Y-%m-%d').date()
        history = self.build_daily_history(df, cycle_start, today,
                                           budget['ideal_daily_budget'])
        streak = self.detect_overspend_streak(history)
        headline = self._headline(salary_day, budget, streak)

        return {
            'status': 'success',
            'salary_info': salary_info,
            'budget': budget,
            'daily_history': history[-7:],
            'streak': streak,
            'headline': headline,
            'widget_summary': {
                'salary_day': salary_day,
                'days_remaining': budget['days_remaining'],
                'balance_remaining': budget['balance_remaining'],
                'daily_budget': budget['daily_budget'],
                'daily_avg_spent': budget['daily_avg_spent'],
                'burn_rate_pct': budget['burn_rate_pct'],
                'status': budget['status'],
                'has_overspend_alert': streak['has_streak'],
                'overspend_streak': streak['streak'],
            },
        }

    # ── Private helpers ───────────────────────────────────────────────────
    def _get_cycle(self, today: date, salary_day: int):
        def _safe_date(y, m, d):
            last = calendar.monthrange(y, m)[1]
            return date(y, m, min(d, last))

        start_this = _safe_date(today.year, today.month, salary_day)
        if today >= start_this:
            cycle_start = start_this
        else:
            pm = today.month - 1 or 12
            py = today.year if today.month > 1 else today.year - 1
            cycle_start = _safe_date(py, pm, salary_day)

        nm = cycle_start.month % 12 + 1
        ny = cycle_start.year + (1 if cycle_start.month == 12 else 0)
        cycle_end = _safe_date(ny, nm, salary_day) - timedelta(days=1)
        return cycle_start, cycle_end

    def _classify(self, balance, days_rem, daily_budget, avg_spent, ideal, income):
        if balance <= 0:
            return 'critical', 'You have run out of budget for this cycle'
        if ideal > 0 and avg_spent > ideal * 1.40:
            return 'critical', f'Spending {round((avg_spent/ideal-1)*100)}% above daily budget'
        if ideal > 0 and avg_spent > ideal * 1.15:
            return 'warning', f'Slightly over daily budget — ₹{round(avg_spent-ideal)} extra/day'
        pct = (income - balance) / income * 100 if income > 0 else 0
        if pct > 85 and days_rem > 5:
            return 'warning', 'Over 85% of salary spent with many days remaining'
        return 'on_track', 'You are within your daily budget. Keep it up!'

    def _streak_msg(self, streak):
        if streak < 2: return ''
        if streak == 2: return f'⚠️ You have overspent {streak} days in a row. Try to cut back today.'
        if streak == 3: return f'⚠️ {streak} consecutive overspend days! This will deplete your balance fast.'
        return f'🚨 {streak} days of overspending in a row! Serious action needed today.'

    def _headline(self, salary_day, budget, streak):
        def ordinal(n):
            s = {1: 'st', 2: 'nd', 3: 'rd'}
            return str(n) + s.get(n if n < 20 else n % 10, 'th')
        bal = int(budget['balance_remaining'])
        dr = budget['days_remaining']
        db = int(budget['daily_budget'])
        parts = [
            f"You get your salary on the {ordinal(salary_day)} of every month.",
            f"You have ₹{bal:,} left and {dr} day{'s' if dr != 1 else ''} remaining.",
            f"Your safe daily budget is ₹{db:,}.",
        ]
        if streak['has_streak']:
            parts.append(streak['message'])
        return ' '.join(parts)

    def _no_salary(self):
        return {'salary_day': None, 'confidence': 0, 'avg_salary': 0,
                'last_salary_date': None, 'last_salary_amount': 0,
                'detection_method': 'not_detected'}
