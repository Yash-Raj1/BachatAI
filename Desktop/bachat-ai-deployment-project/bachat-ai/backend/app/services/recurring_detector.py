"""
Recurring Transaction Detection Service
========================================
Detects recurring payments (EMI, subscriptions, rent) by:
1. Normalizing descriptions to group similar transactions
2. Finding transactions with similar amounts (±5%) appearing across 2+ months
3. Flagging amount changes as alerts
"""

import re
from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Any


def _normalize_description(desc: str) -> str:
    """
    Strip variable parts (dates, references, IDs) from a description
    to group similar recurring transactions together.
    """
    d = desc.lower().strip()
    # Remove long numeric sequences (reference IDs, transaction codes)
    d = re.sub(r'\b\d{6,}\b', '', d)
    # Remove date-like patterns
    d = re.sub(r'\d{2,4}[-/]\d{2}[-/]\d{2,4}', '', d)
    # Remove UPI reference suffixes (e.g. -519630163978)
    d = re.sub(r'[-]\d{10,}', '', d)
    # Collapse whitespace
    d = re.sub(r'\s+', ' ', d).strip()
    # Take first 40 chars for grouping (merchant part)
    return d[:40] if len(d) > 40 else d


def _simple_similarity(a: str, b: str) -> float:
    """Simple token-overlap similarity (no fuzzywuzzy dependency needed)."""
    tokens_a = set(a.lower().split())
    tokens_b = set(b.lower().split())
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    return len(intersection) / len(union) if union else 0.0


def _amounts_within_threshold(amounts: List[float], threshold: float = 0.05) -> bool:
    """Check if all amounts are within ±threshold of the median."""
    if len(amounts) < 2:
        return False
    median = sorted(amounts)[len(amounts) // 2]
    if median == 0:
        return all(a == 0 for a in amounts)
    return all(abs(a - median) / median <= threshold for a in amounts)


def detect_recurring_transactions(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze transactions and return recurring payment groups.
    
    Returns:
    {
        "recurring": [
            {
                "label": "Bill Payment",
                "category": "Utilities",
                "type": "subscription|emi|rent|recurring",
                "avg_amount": 299.0,
                "frequency": "monthly",
                "months_seen": 3,
                "total_spent": 897.0,
                "last_date": "2025-08-07",
                "amount_history": [{"month": "Jul 2025", "amount": 299}, ...],
                "alerts": [{"type": "amount_change", "message": "..."}]
            }
        ],
        "total_monthly_commitment": 1500.0,
        "locked_pct": 15.2,
        "summary": {"subscriptions": 2, "emis": 1, "other_recurring": 3}
    }
    """
    # Only look at debits
    debits = [t for t in transactions if t.get('type') == 'debit']
    if not debits:
        return {"recurring": [], "total_monthly_commitment": 0, "locked_pct": 0, "summary": {}}

    # Step 1: Group by normalized description
    groups = defaultdict(list)
    for txn in debits:
        key = _normalize_description(txn.get('description', ''))
        if len(key) < 3:
            continue
        groups[key].append(txn)

    # Step 2: Merge groups with high similarity
    merged_keys = list(groups.keys())
    merge_map = {}
    for i, k1 in enumerate(merged_keys):
        if k1 in merge_map:
            continue
        for k2 in merged_keys[i + 1:]:
            if k2 in merge_map:
                continue
            if _simple_similarity(k1, k2) >= 0.6:
                merge_map[k2] = k1

    # Apply merges
    merged_groups = defaultdict(list)
    for key, txns in groups.items():
        target = merge_map.get(key, key)
        merged_groups[target].extend(txns)

    # Step 3: For each group, check if it's recurring (appears in 2+ distinct months)
    recurring = []
    total_debit_all = sum(float(t.get('amount', 0)) for t in debits)

    for label, txns in merged_groups.items():
        if len(txns) < 2:
            continue

        # Group by month
        monthly = defaultdict(list)
        for t in txns:
            try:
                dt = datetime.strptime(t['date'], '%Y-%m-%d')
                month_key = dt.strftime('%Y-%m')
                monthly[month_key].append(float(t.get('amount', 0)))
            except (ValueError, KeyError):
                continue

        distinct_months = len(monthly)
        if distinct_months < 2:
            continue

        # Get one representative amount per month (most common / median)
        month_amounts = {}
        for m, amounts in sorted(monthly.items()):
            month_amounts[m] = sorted(amounts)[len(amounts) // 2]  # median

        amounts_list = list(month_amounts.values())

        # Check if amounts are consistent (within 5%)
        is_consistent = _amounts_within_threshold(amounts_list, threshold=0.10)
        if not is_consistent and not _amounts_within_threshold(amounts_list, threshold=0.25):
            continue  # Too much variance — not recurring

        avg_amount = sum(amounts_list) / len(amounts_list)
        total_spent = sum(a for amts in monthly.values() for a in amts)

        # Build amount history
        amount_history = []
        for m, amt in sorted(month_amounts.items()):
            try:
                dt = datetime.strptime(m, '%Y-%m')
                amount_history.append({
                    "month": dt.strftime('%b %Y'),
                    "amount": round(amt, 2)
                })
            except ValueError:
                pass

        # Detect the last transaction date
        all_dates = [t.get('date', '') for t in txns]
        last_date = max(all_dates) if all_dates else ''

        # Classify the type
        desc_lower = label.lower()
        if any(w in desc_lower for w in ['emi', 'loan', 'mandate']):
            rec_type = 'emi'
        elif any(w in desc_lower for w in ['netflix', 'hotstar', 'spotify', 'prime', 'subscription', 'bill payment']):
            rec_type = 'subscription'
        elif any(w in desc_lower for w in ['rent', 'house', 'flat']):
            rec_type = 'rent'
        else:
            rec_type = 'recurring'

        # Category from first transaction
        category = txns[0].get('category', 'Other')

        # Alerts: check if latest amount differs from average
        alerts = []
        if len(amounts_list) >= 2 and not is_consistent:
            latest = amounts_list[-1]
            prev_avg = sum(amounts_list[:-1]) / len(amounts_list[:-1])
            pct_change = ((latest - prev_avg) / prev_avg * 100) if prev_avg > 0 else 0
            if abs(pct_change) > 5:
                direction = "increased" if pct_change > 0 else "decreased"
                alerts.append({
                    "type": "amount_change",
                    "message": f"Amount {direction} by {abs(pct_change):.0f}% (Rs.{prev_avg:.0f} to Rs.{latest:.0f})"
                })

        # Clean up the label for display
        display_label = label.strip()
        # Capitalize first letter of each word
        display_label = ' '.join(w.capitalize() for w in display_label.split()[:6])

        recurring.append({
            "label": display_label,
            "category": category,
            "type": rec_type,
            "avg_amount": round(avg_amount, 2),
            "frequency": "monthly",
            "months_seen": distinct_months,
            "total_spent": round(total_spent, 2),
            "last_date": last_date,
            "amount_history": amount_history,
            "alerts": alerts,
        })

    # Sort by average amount descending
    recurring.sort(key=lambda r: r['avg_amount'], reverse=True)

    # Calculate totals
    total_monthly = sum(r['avg_amount'] for r in recurring)
    locked_pct = (total_monthly / (total_debit_all / max(1, len(set(
        datetime.strptime(t['date'], '%Y-%m-%d').strftime('%Y-%m')
        for t in debits if t.get('date')
    ))))) * 100 if total_debit_all > 0 else 0

    summary = {
        "subscriptions": len([r for r in recurring if r['type'] == 'subscription']),
        "emis": len([r for r in recurring if r['type'] == 'emi']),
        "rent": len([r for r in recurring if r['type'] == 'rent']),
        "other_recurring": len([r for r in recurring if r['type'] == 'recurring']),
    }

    return {
        "recurring": recurring,
        "total_monthly_commitment": round(total_monthly, 2),
        "locked_pct": round(min(locked_pct, 100), 1),
        "summary": summary,
    }
