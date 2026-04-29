import os
import warnings

# Suppress the google.generativeai deprecation FutureWarning in production logs
warnings.filterwarnings('ignore', category=FutureWarning, module='google.generativeai')

from app import create_app

app = create_app()

if __name__ == '__main__':
    # Render passes PORT env var automatically.
    # Local dev default is 8000 to match VITE_API_URL convention.
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'

    if debug:
        print(f"[DEV] Bachat AI Backend starting in DEVELOPMENT mode on port {port}...")
        app.run(host='0.0.0.0', port=port, debug=True)
    else:
        print(f"[PROD] Bachat AI Backend starting in PRODUCTION mode on port {port}...")
        # On Render, gunicorn is used directly via startCommand in render.yaml.
        # This fallback is for other production environments.
        try:
            from waitress import serve
            serve(app, host='0.0.0.0', port=port, threads=4)
        except ImportError:
            print("[WARN] waitress not installed -- falling back to Flask dev server.")
            app.run(host='0.0.0.0', port=port, debug=False)
