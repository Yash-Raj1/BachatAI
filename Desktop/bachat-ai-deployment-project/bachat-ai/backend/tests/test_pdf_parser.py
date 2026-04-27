"""
Tests for PDF Parser — JSON Repair & Extraction
=================================================
Tests the _repair_truncated_json helper (does NOT call Gemini API).
Run: pytest tests/ -v
"""
import pytest
from app.services.pdf_parser import _repair_truncated_json


class TestRepairTruncatedJSON:
    """The JSON repair function recovers transactions from malformed Gemini output."""

    def test_clean_json_array(self):
        """Properly formatted JSON should extract all transactions."""
        raw = '''{"transactions": [
            {"date": "2025-01-15", "description": "Zomato Order", "amount": 450.00, "type": "debit"},
            {"date": "2025-01-16", "description": "Salary Credit", "amount": 50000.00, "type": "credit"}
        ]}'''
        txns = _repair_truncated_json(raw)
        assert len(txns) == 2
        assert txns[0]["date"] == "2025-01-15"
        assert txns[0]["description"] == "Zomato Order"
        assert txns[0]["amount"] == 450.0
        assert txns[0]["type"] == "debit"
        assert txns[1]["type"] == "credit"

    def test_truncated_json(self):
        """Output truncated mid-transaction — should recover complete ones."""
        raw = '''{"transactions": [
            {"date": "2025-01-15", "description": "Uber Ride", "amount": 350.00, "type": "debit"},
            {"date": "2025-01-16", "description": "Netflix Sub", "amount": 649.00, "type": "debit"},
            {"date": "2025-01-17", "description": "Incomplet'''
        txns = _repair_truncated_json(raw)
        assert len(txns) == 2  # Third one is incomplete
        assert txns[0]["description"] == "Uber Ride"
        assert txns[1]["amount"] == 649.0

    def test_json_with_markdown_wrapper(self):
        """Gemini sometimes wraps output in ```json blocks."""
        raw = '''```json
        {"transactions": [
            {"date": "2025-03-01", "description": "Amazon Purchase", "amount": 1299.00, "type": "debit"}
        ]}
        ```'''
        txns = _repair_truncated_json(raw)
        assert len(txns) == 1
        assert txns[0]["description"] == "Amazon Purchase"

    def test_empty_input(self):
        """Empty or garbage input should return empty list, not crash."""
        assert _repair_truncated_json("") == []
        assert _repair_truncated_json("no json here") == []

    def test_amounts_parsed_as_float(self):
        """All amount values should be float, not string."""
        raw = '{"date": "2025-06-01", "description": "Test", "amount": 99.50, "type": "debit"}'
        txns = _repair_truncated_json(raw)
        assert len(txns) == 1
        assert isinstance(txns[0]["amount"], float)
        assert txns[0]["amount"] == 99.50

    def test_multiple_objects_without_array(self):
        """Some Gemini outputs have objects without a wrapping array."""
        raw = '''
        {"date": "2025-01-01", "description": "Item A", "amount": 100.00, "type": "debit"}
        {"date": "2025-01-02", "description": "Item B", "amount": 200.00, "type": "credit"}
        '''
        txns = _repair_truncated_json(raw)
        assert len(txns) == 2

    def test_large_amounts(self):
        """Handle large Indian-format amounts (no commas in JSON though)."""
        raw = '{"date": "2025-01-15", "description": "Rent Payment", "amount": 25000.00, "type": "debit"}'
        txns = _repair_truncated_json(raw)
        assert len(txns) == 1
        assert txns[0]["amount"] == 25000.0

    def test_only_credit_and_debit_types(self):
        """Only 'credit' and 'debit' should be captured — not invalid types."""
        valid = '{"date": "2025-01-01", "description": "OK", "amount": 100.00, "type": "credit"}'
        invalid = '{"date": "2025-01-01", "description": "Bad", "amount": 100.00, "type": "refund"}'
        assert len(_repair_truncated_json(valid)) == 1
        assert len(_repair_truncated_json(invalid)) == 0
