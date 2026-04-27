"""
Tests for Transaction Categorizer (Two-Pass Strategy)
======================================================
Tests the merchant keyword lookup and pattern heuristic fallback.
Run: pytest tests/ -v
"""
import pytest
from app.services.categorizer import categorize_transaction


# ─── Pass 1: Merchant Keyword Lookup ─────────────────────────────────────────

class TestFoodDining:
    """Verify food delivery and restaurant merchants."""
    @pytest.mark.parametrize("desc, expected", [
        ("Zomato Order #12345",                 "Food & Dining"),
        ("SWIGGY FOOD DELIVERY",                "Food & Dining"),
        ("UPI/McDonalds/Payment",               "Food & Dining"),
        ("POS - Dominos Pizza Store",           "Food & Dining"),
        ("Starbucks Coffee",                    "Food & Dining"),
        ("NEFT to Hotel Taj Kitchen",           "Food & Dining"),
    ])
    def test_food_merchants(self, desc, expected):
        assert categorize_transaction(desc) == expected


class TestTransport:
    """Verify transport: cabs, fuel, rail, metro."""
    @pytest.mark.parametrize("desc, expected", [
        ("Ola Ride Payment",                    "Transport"),
        ("UBER TRIP BLR-TO-MYS",                "Transport"),
        ("IRCTC Booking PNR 12345",             "Transport"),
        ("HP Petrol Pump",                      "Transport"),
        ("FASTag NHAI Toll Payment",            "Transport"),
        ("Rapido Auto",                         "Transport"),
    ])
    def test_transport_merchants(self, desc, expected):
        assert categorize_transaction(desc) == expected


class TestShopping:
    """Verify e-commerce and retail merchants."""
    @pytest.mark.parametrize("desc, expected", [
        ("Amazon Pay Order",                    "Shopping"),
        ("Flipkart Marketplace",                "Shopping"),
        ("MYNTRA Fashion Purchase",             "Shopping"),
        ("Nykaa Beauty Order",                  "Shopping"),
        ("Decathlon Sports Store",              "Shopping"),
    ])
    def test_shopping_merchants(self, desc, expected):
        assert categorize_transaction(desc) == expected


class TestEntertainment:
    """Verify streaming, gaming, and entertainment."""
    @pytest.mark.parametrize("desc, expected", [
        ("Netflix Subscription",                "Entertainment"),
        ("Hotstar Premium",                     "Entertainment"),
        ("Spotify Monthly",                     "Entertainment"),
        ("BookMyShow Ticket",                   "Entertainment"),
        ("PVR Cinemas",                         "Entertainment"),
    ])
    def test_entertainment_merchants(self, desc, expected):
        assert categorize_transaction(desc) == expected


class TestUtilities:
    """Verify bill payments and recharges."""
    @pytest.mark.parametrize("desc, expected", [
        ("Airtel Prepaid Recharge",             "Utilities"),
        ("Jio Postpaid Bill",                   "Utilities"),
        ("BESCOM Electricity Bill",             "Utilities"),
        ("Tata Sky DTH Renewal",                "Utilities"),
        ("BBPS Bill Payment Water",             "Utilities"),
    ])
    def test_utility_merchants(self, desc, expected):
        assert categorize_transaction(desc) == expected


class TestInvestments:
    """Verify investment platforms and instruments."""
    @pytest.mark.parametrize("desc, expected", [
        ("Groww SIP Mutual Fund",               "Investments"),
        ("Zerodha Stock Purchase",              "Investments"),
        ("SBI PPF Deposit",                     "Investments"),
        ("NPS Contribution",                    "Investments"),
    ])
    def test_investment_merchants(self, desc, expected):
        assert categorize_transaction(desc) == expected


class TestGroceries:
    """Verify grocery platforms."""
    @pytest.mark.parametrize("desc, expected", [
        ("Blinkit Quick Delivery",              "Groceries"),
        ("Zepto Grocery Order",                 "Groceries"),
        ("BigBasket Monthly Order",             "Groceries"),
        ("DMart Ready Pickup",                  "Groceries"),
    ])
    def test_grocery_merchants(self, desc, expected):
        assert categorize_transaction(desc) == expected


class TestInsurance:
    @pytest.mark.parametrize("desc, expected", [
        ("LIC Premium Payment",                 "Insurance"),
        ("Star Health Insurance Renewal",       "Insurance"),
        ("ICICI Prudential Life",               "Insurance"),
    ])
    def test_insurance(self, desc, expected):
        assert categorize_transaction(desc) == expected


class TestEMILoans:
    @pytest.mark.parametrize("desc, expected", [
        ("HDFC Home Loan EMI",                  "EMI & Loans"),
        ("NACH Auto Debit Mandate",             "EMI & Loans"),
        ("Personal Loan Instalment",            "EMI & Loans"),
    ])
    def test_emi(self, desc, expected):
        assert categorize_transaction(desc) == expected


class TestHealthMedical:
    @pytest.mark.parametrize("desc, expected", [
        ("Apollo Pharmacy Purchase",            "Health & Medical"),
        ("Practo Doctor Consultation",          "Health & Medical"),
        ("1mg Order Medicines",                 "Health & Medical"),
    ])
    def test_health(self, desc, expected):
        assert categorize_transaction(desc) == expected


class TestIncome:
    @pytest.mark.parametrize("desc, expected", [
        ("SALARY CREDIT FOR MAR",              "Income"),
        ("Cashback Received",                  "Income"),
        ("Refund Received UPI",                "Income"),
        ("Interest Credit Savings Account",    "Income"),
    ])
    def test_income(self, desc, expected):
        assert categorize_transaction(desc) == expected


# ─── Pass 2: Pattern-Based Heuristic ─────────────────────────────────────────

class TestPatternFallback:
    """Verify regex patterns catch coded transactions."""
    @pytest.mark.parametrize("desc, expected", [
        ("NEFT CR-HDFC0001234 SALARY",          "Income"),      # NEFT credit
        ("ATM WDL at SBI Branch",               "Cash Withdrawal"),
        ("UPI/123456789/PAY",                   "UPI Payments"),  # Generic UPI
    ])
    def test_pattern_heuristic(self, desc, expected):
        assert categorize_transaction(desc) == expected


# ─── Edge Cases ──────────────────────────────────────────────────────────────

class TestEdgeCases:
    """Verify edge cases don't crash."""
    def test_empty_string(self):
        assert categorize_transaction("") == "Other"

    def test_none_input(self):
        assert categorize_transaction(None) == "Other"

    def test_random_gibberish(self):
        assert categorize_transaction("XYZABC123DEF456") == "Other"

    def test_case_insensitivity(self):
        assert categorize_transaction("ZOMATO ORDER") == "Food & Dining"
        assert categorize_transaction("zomato order") == "Food & Dining"
        assert categorize_transaction("ZoMaTo OrDeR") == "Food & Dining"

    def test_longest_match_wins(self):
        """'credit card bill' should match EMI & Loans, not Income (which has 'credit')."""
        result = categorize_transaction("Credit Card Bill Payment")
        assert result == "EMI & Loans"
