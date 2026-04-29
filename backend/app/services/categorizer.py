"""
Transaction Categorizer — Two-Pass Strategy
=============================================
Pass 1: Merchant keyword lookup (covers ~70% of transactions instantly)
Pass 2: Pattern-based heuristic fallback (handles UPI codes, NEFT, etc.)

Flow:   Description → Keyword Lookup → (no match?) → Pattern Heuristic → "Other"
"""

import re

# ──────────────────────────────────────────────────────────────────────────────
# MERCHANT KEYWORD TABLE  (~120 merchants across 15 categories)
# Each key becomes a substring search against the lowercased description.
# Order: more specific keywords first to avoid false positives.
# ──────────────────────────────────────────────────────────────────────────────
MERCHANT_TABLE = {
    # ── Food & Dining ─────────────────────────────────────────────────────
    'Food & Dining': [
        'zomato', 'swiggy', 'eatsure', 'dunzo', 'box8', 'faasos',
        'dominos', 'domino', 'pizza hut', 'mcdonald', 'kfc', 'burger king',
        'starbucks', 'cafe coffee day', 'ccd', 'haldiram', 'barbeque nation',
        'restaurant', 'food', 'biryani', 'chai', 'bakery', 'kitchen',
        'dine', 'dining', 'eatery', 'dhaba', 'mess ', 'canteen',
        'shudh shakahari', 'hotel ',
    ],
    # ── Groceries ─────────────────────────────────────────────────────────
    'Groceries': [
        'blinkit', 'zepto', 'instamart', 'bigbasket', 'jiomart',
        'dmart', 'd-mart', 'reliance fresh', 'more retail', 'spencer',
        'nature basket', 'grofers', 'grocery', 'supermarket', 'kirana',
        'vegetables', 'fruits', 'provision', 'dairy', 'milk',
    ],
    # ── Transport ─────────────────────────────────────────────────────────
    'Transport': [
        'uber', 'ola', 'rapido', 'meru', 'blue smart',
        'irctc', 'railways', 'makemytrip', 'goibibo', 'redbus', 'abhibus',
        'metro', 'dmrc', 'bmtc', 'tsrtc', 'ksrtc', 'upsrtc',
        'fuel', 'petrol', 'diesel', 'hp pay', 'iocl', 'bpcl',
        'filling sta', 'indian oil', 'shell ', 'fastag', 'toll',
        'parking', 'cab ', 'auto ',
    ],
    # ── Shopping ──────────────────────────────────────────────────────────
    'Shopping': [
        'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'snapdeal',
        'nykaa', 'purplle', 'tata cliq', 'croma', 'reliance digital',
        'shoppers stop', 'lifestyle', 'pantaloons',  'westside', 'h&m',
        'zara', 'decathlon', 'ikea', 'pepperfry', 'urban ladder',
        'lenskart', 'boat ', 'noise ', 'shopping', 'mall',
    ],
    # ── Entertainment ─────────────────────────────────────────────────────
    'Entertainment': [
        'netflix', 'hotstar', 'disney', 'prime video', 'sony liv', 'zee5',
        'spotify', 'gaana', 'wynk', 'apple music', 'youtube premium',
        'bookmyshow', 'pvr', 'inox', 'cinepolis', 'movie',
        'gaming', 'steam', 'playstation', 'xbox', 'dream11', 'mpl',
        'entertainment', 'amusement',
    ],
    # ── Utilities & Bills ─────────────────────────────────────────────────
    'Utilities': [
        'electricity', 'bescom', 'tpddl', 'bses', 'msedcl', 'tneb',
        'water bill', 'water board',
        'gas', 'piped gas', 'indane', 'bharat gas', 'hp gas',
        'broadband', 'wifi', 'fibernet', 'act fibernet',
        'jio', 'airtel', 'vi ', 'vodafone', 'idea ', 'bsnl',
        'recharge', 'prepaid', 'postpaid', 'mobile bill',
        'bill payment', 'billdesk', 'bbps',
        'dth', 'tata sky', 'dish tv', 'sun direct',
    ],
    # ── Rent & Housing ────────────────────────────────────────────────────
    'Rent & Housing': [
        'rent', 'house rent', 'flat rent', 'pg ', 'paying guest',
        'society maintenance', 'maintenance charge', 'housing',
        'nobroker', 'nestaway',
    ],
    # ── Investments ───────────────────────────────────────────────────────
    'Investments': [
        'groww', 'zerodha', 'upstox', 'angel one', 'angel broking',
        'motilal oswal', 'icici direct', 'hdfc securities', '5paisa',
        'mutual fund', 'sip', 'smallcase', 'kuvera', 'coin by zerodha',
        'ppf', 'nps', 'sovereign gold', 'fd renewal', 'rd instalment',
        'investment', 'shares', 'stock',
    ],
    # ── Insurance ─────────────────────────────────────────────────────────
    'Insurance': [
        'lic ', 'lic premium', 'max life', 'hdfc life', 'icici prudential',
        'star health', 'care health', 'bajaj allianz', 'sbi life',
        'policy bazaar', 'policybazaar', 'digit insurance', 'acko',
        'insurance', 'premium',
    ],
    # ── Education ─────────────────────────────────────────────────────────
    'Education': [
        'coursera', 'udemy', 'unacademy', 'byju', 'vedantu', 'upgrad',
        'school fee', 'college fee', 'tuition', 'coaching',
        'exam fee', 'library', 'textbook', 'education',
    ],
    # ── Health & Medical ──────────────────────────────────────────────────
    'Health & Medical': [
        'apollo', 'pharmeasy', 'netmeds', '1mg', 'medplus', 'tata 1mg',
        'practo', 'hospital', 'clinic', 'pharmacy', 'medical',
        'doctor', 'diagnostic', 'lab test', 'pathology',
        'gym', 'cult.fit', 'cultfit', 'healthify',
    ],
    # ── Travel & Vacation ─────────────────────────────────────────────────
    'Travel': [
        'cleartrip', 'yatra', 'ixigo', 'expedia', 'booking.com',
        'oyo ', 'treebo', 'fabhotel', 'airbnb', 'goibibo',
        'air india', 'indigo', 'spicejet', 'vistara', 'akasa',
        'flight', 'airline', 'travel', 'vacation', 'trip',
    ],
    # ── EMI & Loans ───────────────────────────────────────────────────────
    'EMI & Loans': [
        'emi', 'loan', 'mandate', 'nach', 'auto debit',
        'equated monthly', 'instalment', 'installment',
        'home loan', 'car loan', 'personal loan', 'education loan',
        'credit card bill', 'cc payment',
    ],
    # ── Income / Credits ──────────────────────────────────────────────────
    'Income': [
        'salary', 'sal cr', 'payroll',
        'cashback', 'cash back', 'refund', 'reversal',
        'interest cr', 'int cr', 'interest credit',
        'dividend', 'bonus', 'incentive', 'reward',
    ],
    # ── Charity & Donations ───────────────────────────────────────────────
    'Charity': [
        'donation', 'charity', 'ngo', 'trust fund', 'temple',
        'gurudwara', 'church', 'mosque', 'religious',
    ],
}

# Pre-flatten into a list of (keyword, category) sorted longest-first
# so that "credit card bill" matches before "credit"
_LOOKUP_PAIRS = []
for category, keywords in MERCHANT_TABLE.items():
    for kw in keywords:
        _LOOKUP_PAIRS.append((kw.lower(), category))
_LOOKUP_PAIRS.sort(key=lambda x: len(x[0]), reverse=True)


# ──────────────────────────────────────────────────────────────────────────────
# PATTERN-BASED HEURISTIC FALLBACK
# Catches things like "UPI/123456/PAY" or "NEFT CR-HDFC0001"
# ──────────────────────────────────────────────────────────────────────────────
_PATTERN_RULES = [
    # NEFT/RTGS/IMPS credits are usually income
    (re.compile(r'(neft|rtgs|imps)\s*(cr|credit)', re.I), 'Income'),
    # NEFT/RTGS/IMPS debits are transfers
    (re.compile(r'(neft|rtgs|imps)\s*(dr|debit)?', re.I), 'Transfer'),
    # ATM withdrawal
    (re.compile(r'atm\s*(wd|wdl|withdrawal|cash)', re.I), 'Cash Withdrawal'),
    # Generic UPI — catchall after merchant lookup missed
    (re.compile(r'upi|paytm|phonepe|gpay|bharatpe|@ybl|@paytm|@okaxis|@oksbi|@icici|@axl|@apl', re.I), 'UPI Payments'),
    # Bank charges
    (re.compile(r'(service charge|sms charge|annual fee|maintenance charge|gst|tax deducted)', re.I), 'Bank Charges'),
]


# ──────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ──────────────────────────────────────────────────────────────────────────────

def categorize_transaction(description: str) -> str:
    """
    Two-pass categorization:
      Pass 1 — Merchant keyword lookup (~70% coverage, instant)
      Pass 2 — Regex pattern heuristic (catches UPI codes, NEFT, ATM etc.)
      Fallback — "Other"
    """
    if not description:
        return 'Other'

    desc = description.lower()

    # ── Pass 1: Keyword lookup (longest match first) ──────────────────────
    for keyword, category in _LOOKUP_PAIRS:
        if keyword in desc:
            return category

    # ── Pass 2: Pattern heuristic ─────────────────────────────────────────
    for pattern, category in _PATTERN_RULES:
        if pattern.search(desc):
            return category

    return 'Other'
