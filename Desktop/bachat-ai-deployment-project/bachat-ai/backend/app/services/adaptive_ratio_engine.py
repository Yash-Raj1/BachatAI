"""
Adaptive Budget Ratio Engine
Analyzes each user's real spending behaviour and recommends a personalized
needs:savings ratio from the set {50:50, 60:40, 70:30, 80:20, 90:10}.
"""
from datetime import datetime
from typing import Optional

# ── Ratio presets ─────────────────────────────────────────────────────────────
RATIO_PRESETS = {
    'aggressive_saver': {
        'key': 'aggressive_saver', 'needs': 50, 'savings': 50,
        'label': 'Aggressive Saver (50:50)', 'short_label': '50:50',
        'description': 'Save half your income — exceptional financial discipline.',
        'advice': 'Invest the extra savings in SIPs and PPF to build wealth faster.',
        'color': '#00B07C', 'bg_color': '#E6F7F2', 'difficulty': 'Ambitious',
    },
    'balanced': {
        'key': 'balanced', 'needs': 60, 'savings': 40,
        'label': 'Balanced (60:40)', 'short_label': '60:40',
        'description': 'The classic personal finance rule. Works for most salaried Indians.',
        'advice': 'Split savings: emergency fund 15%, SIP 15%, goals 10%.',
        'color': '#0D9488', 'bg_color': '#F0FDFA', 'difficulty': 'Standard',
    },
    'moderate': {
        'key': 'moderate', 'needs': 70, 'savings': 30,
        'label': 'Moderate (70:30)', 'short_label': '70:30',
        'description': 'Suitable if you have high fixed costs, EMIs, or dependents.',
        'advice': 'Prioritize emergency fund first, then start a small ₹500 SIP.',
        'color': '#F59E0B', 'bg_color': '#FEF9EC', 'difficulty': 'Achievable',
    },
    'constrained': {
        'key': 'constrained', 'needs': 80, 'savings': 20,
        'label': 'Constrained (80:20)', 'short_label': '80:20',
        'description': 'High-cost situation. Even 20% savings builds real wealth over time.',
        'advice': 'Focus on cutting one flexible category to move toward 70:30.',
        'color': '#F97316', 'bg_color': '#FFF7ED', 'difficulty': 'Tight',
    },
    'survival': {
        'key': 'survival', 'needs': 90, 'savings': 10,
        'label': 'Survival Mode (90:10)', 'short_label': '90:10',
        'description': 'Very tight budget. Save anything — even ₹500/month matters.',
        'advice': 'Target reducing one expense by ₹500 to unlock an 80:20 ratio.',
        'color': '#E53935', 'bg_color': '#FFF0F0', 'difficulty': 'Critical',
    },
}

CITY_TIER_ADJUSTMENT = {1: 8.0, 2: 4.0, 3: 0.0}

INCOME_BRACKET_TARGET_SAVINGS = [
    (15000, 0.10), (25000, 0.15), (40000, 0.25),
    (60000, 0.35), (100000, 0.40), (float('inf'), 0.50),
]


class AdaptiveRatioEngine:

    def calculate(self, transactions: list, user_income: float,
                  city_tier: int = 2, dependents: int = 0) -> dict:
        """
        Main entry point. Accepts a flat list of transaction dicts
        (same shape as Supabase rows) and returns the full ratio analysis.
        """
        if not transactions or user_income <= 0:
            return self._fallback_response(user_income)

        debits   = [t for t in transactions if t.get('type') == 'debit']
        total_ex = sum(float(t.get('amount', 0)) for t in debits)

        if total_ex == 0:
            return self._fallback_response(user_income)

        actual_expense_pct = round((total_ex / user_income) * 100, 1)

        # Fixed-cost categories
        fixed_cats = {'emi & loans', 'utilities', 'healthcare', 'education',
                      'rent & housing', 'insurance'}
        fixed_ex = sum(
            float(t.get('amount', 0)) for t in debits
            if (t.get('category') or '').lower() in fixed_cats
        )
        fixed_pct = round((fixed_ex / user_income) * 100, 1)

        # City + dependent adjustments
        city_adj = CITY_TIER_ADJUSTMENT.get(city_tier, 4.0)
        dep_adj  = dependents * 2.5
        min_needs = round(min(fixed_pct + city_adj + dep_adj + 10.0, 92.0), 1)

        # Income bracket target
        income_target_savings = next(
            (t for thresh, t in INCOME_BRACKET_TARGET_SAVINGS if user_income < thresh), 0.50
        )
        income_target_needs = 100 - (income_target_savings * 100)

        # Weighted blend: 60% actual + 40% income bracket
        blended = (actual_expense_pct * 0.60) + (income_target_needs * 0.40)
        rec_needs = int(round(blended / 5) * 5)
        rec_needs = max(rec_needs, int(min_needs) + 5)
        rec_needs = min(rec_needs, 90)
        rec_needs = min([50, 60, 70, 80, 90], key=lambda x: abs(x - rec_needs))
        rec_savings = 100 - rec_needs

        preset = self._find_preset(rec_needs)
        target_savings_amount  = user_income * rec_savings / 100
        current_savings_amount = max(user_income - total_ex, 0)
        improvement_monthly    = round(target_savings_amount - current_savings_amount)

        # Top flexible category for advice
        flex_cats = {'food & dining', 'shopping', 'entertainment', 'transport'}
        flex_spend: dict[str, float] = {}
        for t in debits:
            cat = (t.get('category') or 'other').lower()
            if any(f in cat for f in ['food', 'shop', 'entertain', 'transport']):
                flex_spend[cat] = flex_spend.get(cat, 0) + float(t.get('amount', 0))
        top_flex = max(flex_spend, key=flex_spend.get).title() if flex_spend else None

        # Reduction potential
        reduction_potential = {}
        total_flex = 0
        for cat, amt in flex_spend.items():
            saving = round(amt * 0.20)
            reduction_potential[cat.title()] = {
                'current_avg': round(amt), 'saving_20pct': saving, 'saving_yearly': saving * 12
            }
            total_flex += saving
        reduction_summary = {
            'by_category': reduction_potential,
            'total_monthly': total_flex,
            'total_yearly': total_flex * 12,
            'message': f"Reducing flexible spending by 20% saves ₹{total_flex:,.0f}/month"
        }

        all_presets = self._all_presets_ranked(min_needs, actual_expense_pct, user_income)
        improvement_path = self._improvement_path(rec_needs, actual_expense_pct,
                                                   top_flex, flex_spend, user_income)
        explanation = self._explanation(rec_needs, actual_expense_pct, fixed_pct,
                                        min_needs, city_tier, dependents)

        return {
            'recommended_needs_pct':      rec_needs,
            'recommended_savings_pct':    rec_savings,
            'current_actual_expense_pct': actual_expense_pct,
            'fixed_burden_pct':           fixed_pct,
            'min_viable_needs_pct':       min_needs,
            'preset':                     preset,
            'monthly_income':             round(user_income),
            'target_monthly_savings':     round(target_savings_amount),
            'current_monthly_savings':    round(current_savings_amount),
            'improvement_monthly':        improvement_monthly,
            'improvement_yearly':         improvement_monthly * 12,
            'explanation':                explanation,
            'top_flexible_category':      top_flex,
            'reduction_potential':        reduction_summary,
            'all_presets':                all_presets,
            'improvement_path':           improvement_path,
            'months_analyzed':            1,
            'city_tier':                  city_tier,
            'dependents':                 dependents,
            'calculated_at':              datetime.utcnow().isoformat(),
        }

    def _find_preset(self, needs_pct: int) -> dict:
        mapping = {50: 'aggressive_saver', 60: 'balanced',
                   70: 'moderate', 80: 'constrained', 90: 'survival'}
        return RATIO_PRESETS[mapping.get(needs_pct, 'balanced')]

    def _all_presets_ranked(self, min_needs, actual_pct, income):
        result = []
        for preset in RATIO_PRESETS.values():
            needs = preset['needs']
            gap   = round(needs - actual_pct, 1)
            feasible = needs >= min_needs
            if gap > 5:     diff_text = 'Easy — you already spend less'
            elif gap >= -5: diff_text = 'Achievable with small adjustments'
            elif gap >= -15: diff_text = 'Needs moderate spending cuts'
            else:           diff_text = 'Significant lifestyle change required'
            result.append({
                **preset,
                'feasible': feasible,
                'savings_amount': round(income * preset['savings'] / 100),
                'gap_from_actual': gap,
                'difficulty_text': diff_text,
            })
        return result

    def _improvement_path(self, rec_needs, actual_pct, top_cat, flex_spend, income):
        gap = round(actual_pct - rec_needs, 1)
        if gap <= 2:
            return {'needs_improvement': False,
                    'message': 'You are already at or near your recommended ratio. Great work!',
                    'steps': []}
        steps = []
        remaining = gap
        if top_cat and flex_spend:
            cat_key = top_cat.lower()
            amt = flex_spend.get(cat_key, 0)
            if amt > 0:
                cut = round(amt * 0.20)
                cut_pct = round((cut / income) * 100, 1)
                steps.append({'step': 1, 'action': f'Reduce {top_cat} spending by 20%',
                               'monthly_saving': cut,
                               'ratio_improvement': f'{cut_pct}% closer to target'})
                remaining -= cut_pct
        if remaining > 1:
            steps.append({'step': 2, 'action': 'Cancel one unused OTT subscription',
                           'monthly_saving': 499,
                           'ratio_improvement': f'{round((499/income)*100, 1)}% closer to target'})
            remaining -= (499 / income) * 100
        if remaining > 1:
            steps.append({'step': 3, 'action': 'Cook at home 3 extra days per week',
                           'monthly_saving': 1200,
                           'ratio_improvement': f'{round((1200/income)*100, 1)}% closer to target'})
        total = sum(s['monthly_saving'] for s in steps)
        return {
            'needs_improvement': True, 'gap_pct': gap, 'steps': steps,
            'total_monthly_saving': total, 'total_yearly_saving': total * 12,
            'message': f'Follow these {len(steps)} steps to reach your {rec_needs}:{100-rec_needs} target.',
        }

    def _explanation(self, rec, actual, fixed, min_viable, city_tier, dependents):
        lines = [f"Based on your spending, you use {actual:.0f}% of income on average.",
                 f"Fixed costs (EMI, bills, utilities) are {fixed:.0f}% of your income."]
        if city_tier == 1:
            lines.append("Living in a metro adds ~8% to your cost of living.")
        if dependents > 0:
            lines.append(f"Supporting {dependents} dependent(s) adds ~{dependents*2.5:.0f}% to needs.")
        lines.append(f"Minimum viable needs budget is {min_viable:.0f}%, "
                     f"so we recommend a {rec}:{100-rec} ratio.")
        return ' '.join(lines)

    def _fallback_response(self, income=0):
        preset = RATIO_PRESETS['balanced']
        return {
            'recommended_needs_pct': 60, 'recommended_savings_pct': 40,
            'preset': preset,
            'current_actual_expense_pct': 60.0, 'fixed_burden_pct': 35.0,
            'min_viable_needs_pct': 45.0,
            'monthly_income': round(income),
            'target_monthly_savings': round(income * 0.4),
            'current_monthly_savings': round(income * 0.4),
            'improvement_monthly': 0, 'improvement_yearly': 0,
            'explanation': 'Upload at least 1 month of transactions for a personalized ratio.',
            'all_presets': list(RATIO_PRESETS.values()),
            'improvement_path': {'needs_improvement': False, 'steps': []},
            'months_analyzed': 0,
        }
