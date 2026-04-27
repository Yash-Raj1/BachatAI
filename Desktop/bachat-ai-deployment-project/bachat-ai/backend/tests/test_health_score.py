"""
Tests for Health Score Calculator
==================================
Asserts that known input profiles produce expected score ranges.
Run: pytest tests/ -v
"""
import pytest
from app.services.health_score import calculate_health_score


class TestHealthScoreBasics:
    """Core scoring logic."""

    def test_perfect_financial_health(self):
        """Maximum possible inputs should yield a high score (85-100)."""
        data = {
            'savings': 25000,
            'income': 50000,
            'spending': 25000,        # 50% savings rate
            'overspend_pct': 0,
            'goals_on_track': 2,
            'total_goals': 2,
            'expense_std_deviation_pct': 5,
            'emergency_fund': 150000,  # 6 months of expenses
        }
        score = calculate_health_score(data)
        assert 85 <= score <= 100, f"Perfect profile should score 85-100, got {score}"

    def test_poor_financial_health(self):
        """High spending, no savings, no goals."""
        data = {
            'savings': 0,
            'income': 50000,
            'spending': 50000,
            'overspend_pct': 40,
            'goals_on_track': 0,
            'total_goals': 3,
            'expense_std_deviation_pct': 50,
            'emergency_fund': 0,
        }
        score = calculate_health_score(data)
        assert 0 <= score <= 30, f"Poor profile should score 0-30, got {score}"

    def test_average_financial_health(self):
        """Moderate profile — some savings, some goals met."""
        data = {
            'savings': 15000,
            'income': 50000,
            'spending': 35000,
            'overspend_pct': 0,
            'goals_on_track': 1,
            'total_goals': 2,
            'expense_std_deviation_pct': 10,
            'emergency_fund': 60000,
        }
        score = calculate_health_score(data)
        assert 50 <= score <= 90, f"Average profile should score 50-90, got {score}"


class TestHealthScoreComponents:
    """Test individual score components."""

    def test_savings_rate_capped_at_100(self):
        """Even with 100% savings rate, savings component should cap at 100 points."""
        data = {
            'savings': 50000,       # 100% savings rate
            'income': 50000,
            'spending': 0,
            'overspend_pct': 0,
            'goals_on_track': 1,
            'total_goals': 1,
            'expense_std_deviation_pct': 0,
            'emergency_fund': 0,
        }
        score = calculate_health_score(data)
        assert score <= 100, f"Score should never exceed 100, got {score}"

    def test_budget_under_60_40(self):
        """Spending <= 60% of income gets full budget score."""
        data = {
            'savings': 25000,
            'income': 50000,
            'spending': 25000,  # 50% = under 60% limit
            'overspend_pct': 0,
            'goals_on_track': 0,
            'total_goals': 1,
            'expense_std_deviation_pct': 50,
            'emergency_fund': 0,
        }
        score_under = calculate_health_score(data)

        data['spending'] = 40000  # 80% = over limit
        data['overspend_pct'] = 20
        data['savings'] = 10000
        score_over = calculate_health_score(data)

        assert score_under > score_over, "Under-budget should score higher than over-budget"


class TestHealthScoreEdgeCases:
    """Edge cases that shouldn't crash."""

    def test_zero_income(self):
        """income=0 shouldn't cause division by zero (defaults to 1)."""
        data = {
            'savings': 0, 'income': 0, 'spending': 0,
            'overspend_pct': 0, 'goals_on_track': 0, 'total_goals': 1,
            'expense_std_deviation_pct': 0, 'emergency_fund': 0,
        }
        score = calculate_health_score(data)
        assert isinstance(score, int)

    def test_missing_keys_use_defaults(self):
        """Empty dict should not crash — uses .get() defaults."""
        score = calculate_health_score({})
        assert isinstance(score, int)
        assert 0 <= score <= 100

    def test_score_is_integer(self):
        """Score should always be a rounded integer."""
        data = {
            'savings': 12345, 'income': 54321, 'spending': 41976,
            'overspend_pct': 3, 'goals_on_track': 1, 'total_goals': 3,
            'expense_std_deviation_pct': 22, 'emergency_fund': 80000,
        }
        score = calculate_health_score(data)
        assert isinstance(score, int)
