import os
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

class Config:
    SECRET_KEY          = os.environ.get('FLASK_SECRET_KEY', 'dev_key123')
    SUPABASE_URL        = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY        = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')   # use service-role for server-side writes
    GEMINI_API_KEY      = os.environ.get('GEMINI_API_KEY')
    ML_API_URL          = os.environ.get('ML_API_URL', 'http://localhost:5001')
