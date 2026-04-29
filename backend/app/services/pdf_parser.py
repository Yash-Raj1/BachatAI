import pdfplumber
import json
import re
import logging
import google.generativeai as genai
from typing import Dict, Any, List
from app.utils.api_keys import get_gemini_api_key

logger = logging.getLogger('bachat.pdf_parser')

PAGES_PER_CHUNK = 15   # Call Gemini once per 15 pages — minimizes API calls aggressively
PARSE_MODELS = [
    'gemini-2.5-flash-lite',   # Cheapest model with most generous free-tier quota
    'gemini-2.5-flash',        # Fallback — more capable but tighter quota
]

# ── Helpers ──────────────────────────────────────────────────────────────────

def _repair_truncated_json(raw: str) -> List[dict]:
    """Extract every COMPLETE transaction object from a truncated JSON string."""
    pattern = re.compile(
        r'\{\s*"date"\s*:\s*"([^"]+)"\s*,\s*"description"\s*:\s*"([^"]*)"\s*,'
        r'\s*"amount"\s*:\s*([\d.]+)\s*,\s*"type"\s*:\s*"(credit|debit)"\s*\}',
        re.DOTALL
    )
    txns = []
    for m in pattern.finditer(raw):
        txns.append({
            "date":        m.group(1),
            "description": m.group(2),
            "amount":      float(m.group(3)),
            "type":        m.group(4),
        })
    return txns


def _parse_chunk(chunk_text: str, chunk_num: int) -> List[dict]:
    """
    Send one page-chunk to Gemini and return a list of transaction dicts.
    Falls back to regex repair if the JSON is truncated.
    """
    prompt = """
You are a bank statement parser. Extract ONLY the transactions from the text below.
Output STRICTLY valid JSON (no markdown, no explanation) in this exact format:
{"transactions": [{"date": "YYYY-MM-DD", "description": "brief text max 80 chars", "amount": 0.0, "type": "credit or debit"}]}

Rules:
- YYYY-MM-DD date format only.
- Absolute amounts (no negative signs).
- type = "credit" for money coming IN, "debit" for money going OUT.
- Keep descriptions short (max 80 chars). Strip extra whitespace.
- If no transactions exist in the text, return {"transactions": []}.
"""
    try:
        api_key = get_gemini_api_key()
        if api_key:
            genai.configure(api_key=api_key)

        for model_name in PARSE_MODELS:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    [prompt, chunk_text],
                    generation_config={"temperature": 0.0}
                )
                raw = response.text.strip()

                # Strategy 1: clean JSON parse
                match = re.search(r'\{.*\}', raw, re.DOTALL)
                if match:
                    candidate = match.group(0)
                    try:
                        parsed = json.loads(candidate)
                        txns = parsed.get("transactions", [])
                        logger.info("Chunk %d: clean parse — %d transactions", chunk_num, len(txns))
                        return txns
                    except json.JSONDecodeError:
                        pass  # fall through to repair

                # Strategy 2: regex repair for truncated output
                txns = _repair_truncated_json(raw)
                logger.info("Chunk %d: repaired truncated JSON — %d transactions", chunk_num, len(txns))
                return txns

            except Exception as e:
                err_str = str(e)
                if '429' in err_str or 'quota' in err_str.lower():
                    logger.warning("Chunk %d: %s quota hit, trying next model...", chunk_num, model_name)
                    continue
                raise  # re-raise non-quota errors

        logger.error("Chunk %d: all models exhausted", chunk_num)
        return []

    except Exception as e:
        logger.error("Chunk %d failed: %s", chunk_num, e)
        return []


def _extract_metadata(first_page_text: str) -> Dict[str, Any]:
    """Extract bank name, statement period, and totals from the first page."""
    prompt = """
Extract bank statement metadata from the text. Output ONLY valid JSON (no markdown):
{"bank_name": "Bank Name", "statement_period_start": "YYYY-MM-DD", "statement_period_end": "YYYY-MM-DD", "total_credit": 0.0, "total_debit": 0.0}
If any field is missing, use null for dates and 0.0 for amounts.
"""
    try:
        api_key = get_gemini_api_key()
        if api_key:
            genai.configure(api_key=api_key)

        for model_name in PARSE_MODELS:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    [prompt, first_page_text],
                    generation_config={"temperature": 0.0}
                )
                raw = response.text.strip()
                match = re.search(r'\{.*\}', raw, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
            except Exception as e:
                err_str = str(e)
                if '429' in err_str or 'quota' in err_str.lower():
                    logger.warning("Metadata: %s quota hit, trying next model...", model_name)
                    continue
                raise

    except Exception as e:
        logger.error("Metadata extraction failed: %s", e)
    return {"bank_name": "Unknown", "statement_period_start": None, "statement_period_end": None, "total_credit": 0.0, "total_debit": 0.0}


# ── Public API ────────────────────────────────────────────────────────────────
import time

def extract_via_gemini(pages: List[str]) -> Dict[str, Any]:
    """
    Split pages into chunks, call Gemini per chunk, merge all transactions.
    """
    # Extract metadata from the first page
    logger.info("Extracting metadata from first page...")
    metadata = _extract_metadata(pages[0])
    logger.info("Metadata: %s", metadata)

    # Process pages in chunks
    all_transactions: List[dict] = []
    total_pages = len(pages)
    chunk_num = 0

    for start in range(0, total_pages, PAGES_PER_CHUNK):
        if chunk_num > 0:
            logger.debug("Throttling for 4 seconds to respect Gemini RPM quotas...")
            time.sleep(4)
            
        chunk_pages = pages[start : start + PAGES_PER_CHUNK]
        chunk_text = "\n".join(chunk_pages)
        chunk_num += 1
        logger.info("Processing chunk %d (pages %d–%d of %d)...",
                     chunk_num, start + 1, min(start + PAGES_PER_CHUNK, total_pages), total_pages)
        txns = _parse_chunk(chunk_text, chunk_num)
        all_transactions.extend(txns)

    logger.info("All chunks done. Total transactions extracted: %d", len(all_transactions))

    return {
        "bank_name":              metadata.get("bank_name", "Unknown"),
        "statement_period_start": metadata.get("statement_period_start"),
        "statement_period_end":   metadata.get("statement_period_end"),
        "total_credit":           metadata.get("total_credit", 0.0),
        "total_debit":            metadata.get("total_debit", 0.0),
        "transactions":           all_transactions,
    }


def parse_pdf_statement(file_path: str, password: str = None) -> Dict[str, Any]:
    pages: List[str] = []

    # ── Try opening PDF ──────────────────────────────────────────────────────
    try:
        open_kwargs = {}
        if password:
            open_kwargs['password'] = password

        with pdfplumber.open(file_path, **open_kwargs) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text and text.strip():
                    pages.append(text)
    except Exception as e:
        etype = type(e).__name__
        emsg = str(e).lower().strip()
        logger.error("Open failed — %s: %s", etype, e)

        # Detect encryption by exception class name or message
        is_encrypted = (
            any(kw in etype.lower() for kw in ['password', 'encrypt', 'permission']) or
            any(kw in emsg for kw in ['password', 'encrypt', 'decrypt', 'permission']) or
            emsg == ''  # pdfminer often raises empty-message exceptions for encrypted PDFs
        )

        if is_encrypted:
            if password:
                raise ValueError("Incorrect PDF password. Please check and try again.")
            else:
                raise ValueError("This PDF is password-protected. Please provide the password and try again.")

        raise ValueError(f"Failed to read PDF file: {etype}: {e}")

    if not pages:
        raise ValueError("PDF appears to be empty or contains only non-extractable (image-based) text.")

    logger.info("PDF loaded: %d pages", len(pages))
    return extract_via_gemini(pages)

