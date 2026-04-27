"""
Pytest configuration for Bachat AI backend tests.
Ensures the app module is importable.
"""
import sys
import os

# Add backend/ to path so imports like `from app.services...` work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
