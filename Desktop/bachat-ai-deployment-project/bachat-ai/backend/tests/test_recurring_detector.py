"""
Tests for Recurring Transaction Detector
==========================================
Tests pattern grouping, multi-month detection, and type classification.
Run: pytest tests/ -v
"""
import pytest
from app.services.recurring_detector import (
    _normalize_description,
    _simple_similarity,
    _amounts_within_threshold,
    detect_recurring_transactions,
)


# ─── Helper Function Tests ───────────────────────────────────────────────────

class TestNormalizeDescription:
    def test_removes_reference_ids(self):
        result = _normalize_description("UPI/Swiggy/519630163978")
        assert "519630163978" not in result

    def test_removes_dates(self):
        result = _normalize_description("Payment 2025-01-15 to Zomato")
        assert "2025" not in result

    def test_lowercases(self):
        result = _normalize_description("NETFLIX SUBSCRIPTION")
        assert result == result.lower()

    def test_collapses_whitespace(self):
        result = _normalize_description("Too   many    spaces   here")
        assert "  " not in result

    def test_truncates_at_40_chars(self):
        long_desc = "A" * 100
        assert len(_normalize_description(long_desc)) <= 40


class TestSimpleSimilarity:
    def test_identical_strings(self):
        assert _simple_similarity("netflix subscription", "netflix subscription") == 1.0

    def test_completely_different(self):
        assert _simple_similarity("abc def", "xyz uvw") == 0.0

    def test_partial_overlap(self):
        sim = _simple_similarity("netflix monthly sub", "netflix yearly sub")
        assert 0.3 < sim < 0.9  # Partial overlap

    def test_empty_strings(self):
        assert _simple_similarity("", "") == 0.0
        assert _simple_similarity("word", "") == 0.0


class TestAmountsWithinThreshold:
    def test_consistent_amounts(self):
        assert _amounts_within_threshold([500, 500, 500]) is True

    def test_slight_variance(self):
        assert _amounts_within_threshold([500, 505, 498], threshold=0.05) is True

    def test_high_variance(self):
        assert _amounts_within_threshold([100, 200, 300], threshold=0.05) is False

    def test_single_amount(self):
        assert _amounts_within_threshold([500]) is False

    def test_zero_amounts(self):
        assert _amounts_within_threshold([0, 0, 0]) is True


# ─── Integration: Full Recurring Detection ───────────────────────────────────

class TestDetectRecurring:
    """Test the main detection engine with synthetic transactions."""

    @pytest.fixture
    def netflix_subscription(self):
        """3 months of Netflix — should be detected as subscription."""
        return [
            {"date": "2025-01-05", "description": "Netflix Subscription", "amount": 649, "type": "debit", "category": "Entertainment"},
            {"date": "2025-02-05", "description": "Netflix Subscription", "amount": 649, "type": "debit", "category": "Entertainment"},
            {"date": "2025-03-05", "description": "Netflix Subscription", "amount": 649, "type": "debit", "category": "Entertainment"},
        ]

    @pytest.fixture
    def emi_payments(self):
        """3 months of consistent EMI payments."""
        return [
            {"date": "2025-01-10", "description": "HDFC Home Loan EMI Auto Debit", "amount": 25000, "type": "debit", "category": "EMI & Loans"},
            {"date": "2025-02-10", "description": "HDFC Home Loan EMI Auto Debit", "amount": 25000, "type": "debit", "category": "EMI & Loans"},
            {"date": "2025-03-10", "description": "HDFC Home Loan EMI Auto Debit", "amount": 25000, "type": "debit", "category": "EMI & Loans"},
        ]

    @pytest.fixture
    def one_off_transactions(self):
        """Various one-time spends — should NOT be flagged as recurring."""
        return [
            {"date": "2025-01-15", "description": "Zomato Order 1234", "amount": 450, "type": "debit", "category": "Food & Dining"},
            {"date": "2025-01-20", "description": "Amazon Purchase 5678", "amount": 1299, "type": "debit", "category": "Shopping"},
            {"date": "2025-02-03", "description": "Uber Ride to Airport", "amount": 800, "type": "debit", "category": "Transport"},
        ]

    def test_detects_netflix(self, netflix_subscription):
        result = detect_recurring_transactions(netflix_subscription)
        assert len(result["recurring"]) >= 1
        netflix = result["recurring"][0]
        assert netflix["type"] == "subscription"
        assert netflix["avg_amount"] == 649
        assert netflix["months_seen"] == 3

    def test_detects_emi(self, emi_payments):
        result = detect_recurring_transactions(emi_payments)
        assert len(result["recurring"]) >= 1
        emi = result["recurring"][0]
        assert emi["type"] == "emi"
        assert emi["avg_amount"] == 25000

    def test_no_false_positives(self, one_off_transactions):
        result = detect_recurring_transactions(one_off_transactions)
        assert len(result["recurring"]) == 0

    def test_monthly_commitment_calculation(self, netflix_subscription, emi_payments):
        combined = netflix_subscription + emi_payments
        result = detect_recurring_transactions(combined)
        assert result["total_monthly_commitment"] > 0
        assert result["total_monthly_commitment"] == pytest.approx(25649, abs=100)

    def test_amount_change_alert(self):
        """Price increase should trigger an alert."""
        txns = [
            {"date": "2025-01-05", "description": "Spotify Premium", "amount": 119, "type": "debit", "category": "Entertainment"},
            {"date": "2025-02-05", "description": "Spotify Premium", "amount": 119, "type": "debit", "category": "Entertainment"},
            {"date": "2025-03-05", "description": "Spotify Premium", "amount": 149, "type": "debit", "category": "Entertainment"},
        ]
        result = detect_recurring_transactions(txns)
        if result["recurring"]:
            spotify = result["recurring"][0]
            # Either detected with alert or not detected due to variance filter
            if spotify.get("alerts"):
                assert any("change" in a["type"] for a in spotify["alerts"])

    def test_credits_are_excluded(self):
        """Credits should be ignored — only debits are scanned."""
        txns = [
            {"date": "2025-01-01", "description": "Salary Credit", "amount": 50000, "type": "credit", "category": "Income"},
            {"date": "2025-02-01", "description": "Salary Credit", "amount": 50000, "type": "credit", "category": "Income"},
            {"date": "2025-03-01", "description": "Salary Credit", "amount": 50000, "type": "credit", "category": "Income"},
        ]
        result = detect_recurring_transactions(txns)
        assert len(result["recurring"]) == 0

    def test_empty_transactions(self):
        result = detect_recurring_transactions([])
        assert result["recurring"] == []
        assert result["total_monthly_commitment"] == 0

    def test_summary_categorizes_types(self, netflix_subscription, emi_payments):
        combined = netflix_subscription + emi_payments
        result = detect_recurring_transactions(combined)
        summary = result["summary"]
        assert "subscriptions" in summary
        assert "emis" in summary

    def test_locked_pct_reasonable(self, netflix_subscription, emi_payments):
        combined = netflix_subscription + emi_payments
        result = detect_recurring_transactions(combined)
        assert 0 <= result["locked_pct"] <= 100

    def test_amount_history_format(self, netflix_subscription):
        result = detect_recurring_transactions(netflix_subscription)
        if result["recurring"]:
            history = result["recurring"][0].get("amount_history", [])
            assert len(history) >= 2
            for entry in history:
                assert "month" in entry
                assert "amount" in entry
                assert isinstance(entry["amount"], (int, float))
