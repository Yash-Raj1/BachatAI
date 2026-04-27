"""
Stock Service — Real-time NSE stock prices via yfinance
========================================================
Completely FREE — no API key required.
Prices are ~15 minutes delayed (Yahoo Finance standard).
"""

import logging
import time as _time
import yfinance as yf
import numpy as np
from datetime import datetime

logger = logging.getLogger('bachat.stocks')

# ── Top 30 Nifty stocks with metadata ────────────────────────────────────────
NIFTY_STOCKS = [
    # symbol,         company name,          sector,           risk
    ('RELIANCE.NS',   'Reliance Industries', 'Energy',         'medium'),
    ('TCS.NS',        'Tata Consultancy',    'IT',             'low'),
    ('HDFCBANK.NS',   'HDFC Bank',           'Banking',        'low'),
    ('INFY.NS',       'Infosys',             'IT',             'low'),
    ('ICICIBANK.NS',  'ICICI Bank',          'Banking',        'low'),
    ('HINDUNILVR.NS', 'Hindustan Unilever',  'FMCG',           'low'),
    ('WIPRO.NS',      'Wipro',               'IT',             'low'),
    ('LT.NS',         'Larsen & Toubro',     'Infrastructure', 'medium'),
    ('TATAMOTORS.NS', 'Tata Motors',         'Auto',           'high'),
    ('BAJFINANCE.NS', 'Bajaj Finance',       'Finance',        'medium'),
    ('SBIN.NS',       'State Bank of India', 'Banking',        'medium'),
    ('AXISBANK.NS',   'Axis Bank',           'Banking',        'medium'),
    ('ADANIENT.NS',   'Adani Enterprises',   'Conglomerate',   'high'),
    ('MARUTI.NS',     'Maruti Suzuki',       'Auto',           'medium'),
    ('SUNPHARMA.NS',  'Sun Pharmaceutical',  'Pharma',         'medium'),
    ('TITAN.NS',      'Titan Company',       'Consumer',       'medium'),
    ('NESTLEIND.NS',  'Nestle India',        'FMCG',           'low'),
    ('ULTRACEMCO.NS', 'UltraTech Cement',    'Cement',         'medium'),
    ('POWERGRID.NS',  'Power Grid',          'Utilities',      'low'),
    ('NTPC.NS',       'NTPC',                'Power',          'low'),
    ('COALINDIA.NS',  'Coal India',          'Mining',         'low'),
    ('ONGC.NS',       'ONGC',                'Energy',         'medium'),
    ('HCLTECH.NS',    'HCL Technologies',    'IT',             'low'),
    ('DRREDDY.NS',    "Dr. Reddy's Lab",     'Pharma',         'medium'),
    ('DIVISLAB.NS',   "Divi's Lab",          'Pharma',         'medium'),
    ('TATASTEEL.NS',  'Tata Steel',          'Metals',         'high'),
    ('JSWSTEEL.NS',   'JSW Steel',           'Metals',         'high'),
    ('HINDALCO.NS',   'Hindalco',            'Metals',         'high'),
    ('BAJAJFINSV.NS', 'Bajaj Finserv',       'Finance',        'medium'),
    ('ASIANPAINT.NS', 'Asian Paints',        'Consumer',       'low'),
]

# ── Index symbols ─────────────────────────────────────────────────────────────
INDEX_SYMBOLS = {
    'NIFTY 50':   '^NSEI',
    'SENSEX':     '^BSESN',
    'BANK NIFTY': '^NSEBANK',
}

# ── Suggestion sets by risk appetite ──────────────────────────────────────────
SUGGESTION_MAP = {
    'low': [
        'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS',
        'NESTLEIND.NS', 'POWERGRID.NS', 'NTPC.NS', 'COALINDIA.NS',
        'ICICIBANK.NS', 'WIPRO.NS',
    ],
    'medium': [
        'RELIANCE.NS', 'BAJFINANCE.NS', 'SBIN.NS', 'AXISBANK.NS',
        'LT.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS',
        'BAJAJFINSV.NS', 'ASIANPAINT.NS',
    ],
    'high': [
        'TATAMOTORS.NS', 'ADANIENT.NS', 'TATASTEEL.NS',
        'JSWSTEEL.NS', 'HINDALCO.NS',
    ],
}

# ── In-memory cache ───────────────────────────────────────────────────────────
_cache = {}
_cache_ts = {}
CACHE_TTL = 60  # seconds


def _get_cached(key):
    if key in _cache_ts and (_time.time() - _cache_ts[key]) < CACHE_TTL:
        return _cache.get(key)
    return None


def _set_cached(key, value, ttl=CACHE_TTL):
    _cache[key] = value
    _cache_ts[key] = _time.time()


# ── Stock metadata lookup ─────────────────────────────────────────────────────
_META = {s[0]: {'company': s[1], 'sector': s[2], 'risk': s[3]} for s in NIFTY_STOCKS}


def get_live_prices(symbols: list) -> list:
    """Fetch live prices for a list of NSE stock symbols via yfinance batch call."""
    cached = _get_cached('all_stocks')
    if cached:
        return cached

    results = []
    try:
        tickers = yf.Tickers(' '.join(symbols))
        for symbol in symbols:
            try:
                ticker = tickers.tickers.get(symbol)
                if not ticker:
                    continue
                info = ticker.fast_info

                last_price = float(getattr(info, 'last_price', 0) or 0)
                prev_close = float(getattr(info, 'previous_close', 0) or 0)
                day_high   = float(getattr(info, 'day_high', 0) or 0)
                day_low    = float(getattr(info, 'day_low', 0) or 0)
                year_high  = float(getattr(info, 'year_high', 0) or 0)
                year_low   = float(getattr(info, 'year_low', 0) or 0)

                change     = last_price - prev_close
                change_pct = (change / prev_close * 100) if prev_close > 0 else 0
                meta       = _META.get(symbol, {})

                results.append({
                    'symbol':      symbol.replace('.NS', ''),
                    'full_symbol': symbol,
                    'company':     meta.get('company', symbol),
                    'sector':      meta.get('sector', 'Unknown'),
                    'risk':        meta.get('risk', 'medium'),
                    'price':       round(last_price, 2),
                    'change':      round(change, 2),
                    'change_pct':  round(change_pct, 2),
                    'prev_close':  round(prev_close, 2),
                    'day_high':    round(day_high, 2),
                    'day_low':     round(day_low, 2),
                    'year_high':   round(year_high, 2),
                    'year_low':    round(year_low, 2),
                    'is_up':       change >= 0,
                    'updated_at':  datetime.now().isoformat(),
                })
            except Exception as e:
                logger.warning("Error fetching %s: %s", symbol, e)
    except Exception as e:
        logger.error("Batch fetch error: %s", e)

    _set_cached('all_stocks', results)
    return results


def get_indices() -> dict:
    """Fetch Nifty 50, Sensex, Bank Nifty live values."""
    cached = _get_cached('indices')
    if cached:
        return cached

    indices = {}
    for name, symbol in INDEX_SYMBOLS.items():
        try:
            fi = yf.Ticker(symbol).fast_info
            price      = float(getattr(fi, 'last_price', 0) or 0)
            prev_close = float(getattr(fi, 'previous_close', 0) or 0)
            change     = price - prev_close
            change_pct = (change / prev_close * 100) if prev_close > 0 else 0
            indices[name] = {
                'name': name, 'symbol': symbol,
                'value': round(price, 2),
                'change': round(change, 2),
                'change_pct': round(change_pct, 2),
                'is_up': change >= 0,
            }
        except Exception as e:
            logger.warning("Index error %s: %s", name, e)
            indices[name] = {'name': name, 'value': 0, 'change': 0, 'change_pct': 0, 'is_up': True}

    _set_cached('indices', indices)
    return indices


def get_mini_chart(symbol: str, days: int = 30) -> list:
    """Get last N days of closing prices for sparkline chart."""
    key = f"chart_{symbol}_{days}"
    cached = _get_cached(key)
    if cached:
        return cached

    try:
        hist = yf.Ticker(symbol).history(period=f'{days}d', interval='1d')
        if hist.empty:
            return []
        data = [
            {'date': str(row.name.date()), 'price': round(float(row['Close']), 2)}
            for _, row in hist.iterrows()
        ]
        _set_cached(key, data, ttl=300)  # cache charts for 5 minutes
        return data
    except Exception as e:
        logger.warning("Chart error %s: %s", symbol, e)
        return []


def get_gainers_losers(all_stocks: list) -> dict:
    """From fetched stock list, extract top 5 gainers and top 5 losers."""
    sorted_stocks = sorted(all_stocks, key=lambda x: x.get('change_pct', 0), reverse=True)
    return {
        'top_gainers': sorted_stocks[:5],
        'top_losers':  sorted_stocks[-5:][::-1],
    }


def get_suggestions(monthly_savings: float, risk_appetite: str, all_stocks: list) -> list:
    """
    Suggest stocks based on user's monthly savings and risk appetite.
    Returns top 6 scored suggestions with investment amounts.
    """
    risk_key   = risk_appetite.lower() if risk_appetite in ('low', 'medium', 'high') else 'medium'
    candidates = SUGGESTION_MAP.get(risk_key, SUGGESTION_MAP['medium'])
    price_map  = {s['full_symbol']: s for s in all_stocks}

    suggestions = []
    for symbol in candidates:
        stock = price_map.get(symbol)
        if not stock or stock['price'] <= 0:
            continue

        price = stock['price']
        invest_amt     = monthly_savings * 0.10
        shares_can_buy = max(1, int(invest_amt / price))
        invest_needed  = round(shares_can_buy * price, 2)

        # Simple momentum + value scoring
        score = 50
        if stock['change_pct'] > 0:  score += 20
        if stock['change_pct'] > 2:  score += 10
        if stock['year_low'] > 0:
            pct_from_low = ((price - stock['year_low']) / stock['year_low']) * 100
            if pct_from_low < 20:    score += 20
        if stock['is_up']:           score += 10

        suggestions.append({
            **stock,
            'invest_amount':  invest_needed,
            'shares_can_buy': shares_can_buy,
            'score':          score,
            'why':            _build_reason(stock, risk_key),
            'sip_monthly':    round(monthly_savings * 0.05),
        })

    suggestions.sort(key=lambda x: -x['score'])
    return suggestions[:6]


def _build_reason(stock: dict, risk: str) -> str:
    """Generate a human-readable reason for the suggestion."""
    reasons = []
    if stock['change_pct'] > 1.5:
        reasons.append(f"Up {stock['change_pct']:.1f}% today — strong momentum")
    elif stock['change_pct'] < -1.5:
        reasons.append(f"Down {abs(stock['change_pct']):.1f}% today — possible dip buying opportunity")
    else:
        reasons.append("Stable price movement today")

    if stock['year_high'] > 0:
        pct_from_high = ((stock['year_high'] - stock['price']) / stock['year_high']) * 100
        if pct_from_high > 15:
            reasons.append(f"{pct_from_high:.0f}% below 52-week high")

    sector_desc = {
        'low':    f"{stock['sector']} sector — defensive and stable",
        'medium': f"{stock['sector']} sector — growth with moderate risk",
        'high':   f"{stock['sector']} sector — high growth potential",
    }
    reasons.append(sector_desc.get(risk, f"{stock['sector']} sector"))
    return '. '.join(reasons[:2])
