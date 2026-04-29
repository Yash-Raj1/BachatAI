"""
date_normalizer.py — Robust date string normalizer
=====================================================
Converts any date format commonly seen in Indian bank statements
into a standard YYYY-MM-DD string for consistent database storage.

Supported formats (and variations):
  - 2026-04-14         (ISO standard)
  - 14/04/2026         (DD/MM/YYYY)
  - 14-04-2026         (DD-MM-YYYY)
  - 14.04.2026         (DD.MM.YYYY)
  - 14/4/2026          (D/M/YYYY)
  - 04/14/2026         (MM/DD/YYYY — only if month > 12)
  - 14 Apr 2026        (DD Mon YYYY)
  - 14 April 2026      (DD Month YYYY)
  - 22 Oct '25         (DD Mon 'YY)
  - 22-Oct-2025        (DD-Mon-YYYY)
  - 22/Oct/2025        (DD/Mon/YYYY)
  - Apr 14, 2026       (Mon DD, YYYY)
  - April 14 2026      (Month DD YYYY)
  - 14-Apr-25          (DD-Mon-YY)
  - 2026/04/14         (YYYY/MM/DD)
"""

import re
import logging
from datetime import datetime

logger = logging.getLogger('bachat.date_normalizer')

# Month name → number mapping (case-insensitive)
MONTH_MAP = {}
MONTH_NAMES = [
    ('jan', 'january'), ('feb', 'february'), ('mar', 'march'),
    ('apr', 'april'), ('may', 'may'), ('jun', 'june'),
    ('jul', 'july'), ('aug', 'august'), ('sep', 'september'),
    ('oct', 'october'), ('nov', 'november'), ('dec', 'december'),
]
for i, (short, full) in enumerate(MONTH_NAMES, 1):
    MONTH_MAP[short] = i
    MONTH_MAP[full] = i


def _month_str_to_num(s: str) -> int:
    """Convert 'Jan', 'January', 'jan', etc. to month number (1-12)."""
    return MONTH_MAP.get(s.lower().strip('.'), 0)


def _expand_year(y: int) -> int:
    """Expand 2-digit year to 4-digit: 25 → 2025, 99 → 1999."""
    if y < 100:
        return 2000 + y if y <= 50 else 1900 + y
    return y


def normalize_date(raw: str) -> str:
    """
    Normalize any date string to 'YYYY-MM-DD'.
    Returns the original string if parsing completely fails.
    """
    if not raw:
        return raw

    s = str(raw).strip().replace(',', ' ').replace("'", " ")
    # Collapse multiple spaces
    s = re.sub(r'\s+', ' ', s).strip()

    # ── 1. Already ISO: YYYY-MM-DD ─────────────────────────────────────
    m = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})$', s)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{y:04d}-{mo:02d}-{d:02d}"

    # ── 2. YYYY/MM/DD ──────────────────────────────────────────────────
    m = re.match(r'^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$', s)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{y:04d}-{mo:02d}-{d:02d}"

    # ── 3. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY ─────────────────────
    m = re.match(r'^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$', s)
    if m:
        a, b, c = int(m.group(1)), int(m.group(2)), _expand_year(int(m.group(3)))
        # Disambiguate DD/MM vs MM/DD:
        # If first number > 12, it must be the day → DD/MM/YYYY
        # If second number > 12, it must be the day → MM/DD/YYYY
        # If both ≤ 12, assume DD/MM (Indian convention)
        if a > 12 and b <= 12:
            d, mo, y = a, b, c
        elif b > 12 and a <= 12:
            mo, d, y = a, b, c
        else:
            d, mo, y = a, b, c  # Default: DD/MM/YYYY (Indian standard)
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    # ── 4. DD Mon YYYY, DD-Mon-YYYY, DD/Mon/YYYY, DD Mon YY ───────────
    #    Examples: 22 Oct 2025, 14-Apr-2026, 1 Feb 26, 22 Oct  25
    m = re.match(r'^(\d{1,2})[/\-.\s]+([A-Za-z]+)[/\-.\s]+(\d{2,4})$', s)
    if m:
        d = int(m.group(1))
        mo = _month_str_to_num(m.group(2))
        y = _expand_year(int(m.group(3)))
        if mo and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    # ── 5. Mon DD YYYY or Month DD YYYY ───────────────────────────────
    #    Examples: Apr 14, 2026 / April 14 2026
    m = re.match(r'^([A-Za-z]+)[.\s]+(\d{1,2})[,\s]+(\d{2,4})$', s)
    if m:
        mo = _month_str_to_num(m.group(1))
        d = int(m.group(2))
        y = _expand_year(int(m.group(3)))
        if mo and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    # ── 6. Fallback: Python's datetime parser ─────────────────────────
    for fmt in [
        '%d %b %Y', '%d %B %Y', '%b %d %Y', '%B %d %Y',
        '%d-%b-%Y', '%d-%B-%Y', '%d/%b/%Y',
        '%d %b %y', '%d-%b-%y', '%d/%b/%y',
        '%Y%m%d',  # 20260414
        '%m/%d/%Y', '%m-%d-%Y',
    ]:
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue

    # ── 7. Last resort: Python's flexible parsing ─────────────────────
    try:
        dt = datetime.fromisoformat(s)
        return dt.strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        pass

    logger.warning("Could not normalize date: %r — storing as-is", raw)
    return str(raw).strip()


def normalize_transaction_dates(transactions: list) -> list:
    """
    Normalize the 'date' field of every transaction dict in-place.
    Returns the same list.
    """
    for txn in transactions:
        raw = txn.get('date')
        if raw:
            txn['date'] = normalize_date(raw)
    return transactions
