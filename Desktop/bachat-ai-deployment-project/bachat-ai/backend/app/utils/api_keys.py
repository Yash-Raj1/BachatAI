import os
import random

def get_gemini_api_key():
    """
    Returns a random Gemini API key from the GEMINI_API_KEY environment variable.
    Allows passing multiple keys separated by commas.
    """
    keys_str = os.environ.get('GEMINI_API_KEY', '')
    if not keys_str:
        return None
    
    # Split by comma and clean up whitespace
    keys = [k.strip() for k in keys_str.split(',') if k.strip()]
    
    if not keys:
        return None
    
    # Return a random key to distribute load (round-robin via randomness)
    return random.choice(keys)
