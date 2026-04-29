def detect_bank(pdf_text: str) -> str:
    text_lower = pdf_text.lower()
    if 'state bank of india' in text_lower or 'sbi' in text_lower:
        return 'SBI'
    elif 'hdfc bank' in text_lower:
        return 'HDFC'
    elif 'icici bank' in text_lower:
        return 'ICICI'
    elif 'axis bank' in text_lower:
        return 'AXIS'
    return 'UNKNOWN'
