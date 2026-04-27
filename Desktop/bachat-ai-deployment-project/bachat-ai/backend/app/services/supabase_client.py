from supabase import create_client, Client
from app.config import Config

_client: Client = None

def get_supabase_client() -> Client:
    global _client
    if _client is not None:
        return _client

    url: str = Config.SUPABASE_URL
    key: str = Config.SUPABASE_KEY
    if not url or not key:
        raise RuntimeError(
            "Supabase credentials missing. "
            "Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in backend/.env"
        )
    _client = create_client(url, key)
    return _client
