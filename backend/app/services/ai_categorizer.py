"""
ai_categorizer.py — Gemini-powered transaction categorizer
===========================================================
Used as a fallback when:
  1. ML model is completely unavailable (ML microservice down)
  2. ML model returns low-confidence predictions (< threshold)

Falls back gracefully to keyword-based categorizer if Gemini
API key is missing or quota is exhausted.
"""

import json
import re
import logging
import google.generativeai as genai
from app.config import Config
from app.services.categorizer import categorize_transaction as keyword_categorize

logger = logging.getLogger('bachat.ai_categorizer')

# Valid categories (must match what the rest of the pipeline expects)
VALID_CATEGORIES = [
    'Food & Dining', 'Groceries', 'Shopping', 'Transport', 'Fuel',
    'Entertainment', 'Healthcare', 'Travel', 'Bills', 'Rent',
    'EMI', 'Investments', 'Salary', 'Transfer', 'Cash', 'Other'
]

# Gemini models to try in order (cheapest first)
MODELS_TO_TRY = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
]

BATCH_SIZE = 30   # Max transactions per Gemini call (stay within token limits)
LOW_CONFIDENCE_THRESHOLD = 60.0   # Below this % → re-categorize with Gemini


def _build_prompt(transactions: list) -> str:
    """Build a compact JSON prompt for Gemini to categorize transactions."""
    txn_lines = []
    for i, txn in enumerate(transactions):
        desc = str(txn.get('description', '')).strip()[:80]
        amount = txn.get('amount', 0)
        txn_type = txn.get('type', 'DEBIT').upper()
        txn_lines.append(f'{i}: "{desc}" | {txn_type} | ₹{amount}')

    txn_block = '\n'.join(txn_lines)

    return f"""You are a financial transaction categorizer for Indian bank statements.
Categorize each transaction into EXACTLY one of these categories:
{', '.join(VALID_CATEGORIES)}

Rules:
- Salary/payroll credits → Salary
- UPI transfers with no clear purpose → Transfer
- ATM/cash withdrawals → Cash
- Zomato, Swiggy, restaurants → Food & Dining
- BigBasket, DMart, Blinkit, supermarkets → Groceries
- Amazon, Flipkart, Myntra, Ajio → Shopping
- Ola, Uber, Metro, auto → Transport
- Netflix, Hotstar, Spotify, cinema → Entertainment
- Hospitals, pharmacies, clinics → Healthcare
- Airlines, hotels, MakeMyTrip → Travel
- Electricity, water, gas, internet, mobile recharge → Bills
- Rent payment → Rent
- EMI, loan repayment → EMI
- Mutual fund, SIP, stocks, Zerodha → Investments
- Petrol, diesel pumps → Fuel
- Anything unclear → Other

Transactions to classify:
{txn_block}

Respond with ONLY a valid JSON array of exactly {len(transactions)} objects.
Each object must have: "index" (number, 0-based) and "category" (string from the list above).
Example: [{{"index": 0, "category": "Food & Dining"}}, {{"index": 1, "category": "Salary"}}]
No explanation. No markdown. Pure JSON only."""


from app.utils.api_keys import get_gemini_api_key

def _call_gemini(prompt: str) -> list | None:
    """Call Gemini and parse the JSON response. Returns list of {index, category} or None."""
    api_key = get_gemini_api_key()
    if not api_key:
        return None

    genai.configure(api_key=api_key)

    for model_name in MODELS_TO_TRY:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            raw = response.text.strip()

            # Strip markdown code fences if Gemini wraps in ```json ... ```
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)

            parsed = json.loads(raw)
            if isinstance(parsed, list) and len(parsed) > 0:
                logger.info("Gemini (%s) categorized %d transactions", model_name, len(parsed))
                return parsed

        except json.JSONDecodeError as je:
            logger.warning("JSON parse error from %s: %s", model_name, je)
        except Exception as e:
            err_str = str(e)
            if '429' in err_str or 'quota' in err_str.lower():
                logger.warning("%s quota hit, trying next model...", model_name)
                continue
            logger.error("%s error: %s", model_name, e)
            return None

    logger.error("All Gemini models failed or quota exhausted")
    return None


def ai_categorize_batch(transactions: list) -> list:
    """
    Categorize a list of transactions using Gemini AI.
    Each transaction dict needs: description, amount, type (DEBIT/CREDIT), mode.

    Returns the same list with 'category' and 'ai_categorized' fields set.
    Falls back to keyword-based if Gemini fails.
    """
    if not transactions:
        return transactions

    results = list(transactions)  # work on a copy

    # Process in batches to respect token limits
    for batch_start in range(0, len(results), BATCH_SIZE):
        batch = results[batch_start : batch_start + BATCH_SIZE]
        prompt = _build_prompt(batch)
        gemini_result = _call_gemini(prompt)

        if gemini_result:
            # Build a lookup: index → category
            lookup = {item['index']: item['category'] for item in gemini_result if 'index' in item and 'category' in item}

            for local_idx, txn in enumerate(batch):
                cat = lookup.get(local_idx)
                if cat and cat in VALID_CATEGORIES:
                    txn['category']       = cat
                    txn['ai_categorized'] = True
                else:
                    # Gemini gave invalid category — fall back to keyword
                    txn['category']       = keyword_categorize(txn.get('description', ''))
                    txn['ai_categorized'] = False
        else:
            # Gemini completely failed — use keyword categorizer for this batch
            logger.warning("Batch %d: Gemini unavailable, using keyword categorizer",
                           batch_start // BATCH_SIZE + 1)
            for txn in batch:
                txn['category']       = keyword_categorize(txn.get('description', ''))
                txn['ai_categorized'] = False

    return results


def ai_recategorize_low_confidence(transactions: list, ml_txns: list, threshold: float = LOW_CONFIDENCE_THRESHOLD) -> list:
    """
    Given ML results, find transactions with confidence below `threshold`
    and re-categorize them using Gemini AI.

    transactions : original parsed transactions list (will be mutated in-place)
    ml_txns      : ML API response transactions (with 'category' and 'confidence')
    threshold    : confidence % below which we ask Gemini to re-categorize

    Returns the updated transactions list.
    """
    low_conf_indices = []
    low_conf_txns = []

    for i, ml_txn in enumerate(ml_txns):
        confidence = float(ml_txn.get('confidence', 100))
        if confidence < threshold:
            low_conf_indices.append(i)
            low_conf_txns.append({
                'description': transactions[i].get('description', ''),
                'amount':      float(transactions[i].get('amount', 0)),
                'type':        transactions[i].get('type', 'DEBIT').upper(),
                'mode':        transactions[i].get('mode', 'UPI'),
            })

    if not low_conf_txns:
        return transactions  # All confident — nothing to do

    logger.info("%d low-confidence ML predictions (< %.0f%%) — sending to Gemini for re-categorization...",
                 len(low_conf_txns), threshold)

    recategorized = ai_categorize_batch(low_conf_txns)

    # Apply Gemini results back to the original transactions list
    for i, orig_idx in enumerate(low_conf_indices):
        if orig_idx < len(transactions):
            transactions[orig_idx]['category']       = recategorized[i].get('category', 'Other')
            transactions[orig_idx]['ai_categorized'] = recategorized[i].get('ai_categorized', False)

    ai_fixed = sum(1 for i in low_conf_indices if transactions[i].get('ai_categorized'))
    logger.info("Re-categorized %d/%d low-confidence transactions via Gemini",
                 ai_fixed, len(low_conf_txns))

    return transactions
