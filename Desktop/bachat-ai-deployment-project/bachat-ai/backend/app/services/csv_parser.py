import pandas as pd
from typing import Dict, Any
from app.services.pdf_parser import extract_via_gemini

def parse_csv_statement(file_path: str) -> Dict[str, Any]:
    try:
        # Read the raw CSV text to pass to Gemini
        with open(file_path, 'r', encoding='utf-8') as f:
            text_content = f.read()
            
    except Exception as e:
        raise ValueError(f"Failed to read CSV file: {str(e)}")
        
    if len(text_content.strip()) < 20:
        raise ValueError("CSV appears to be empty.")
        
    # Reuse the same Gemini extraction prompt logic
    return extract_via_gemini(text_content)
