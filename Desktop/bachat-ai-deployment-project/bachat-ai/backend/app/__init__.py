from flask import Flask, jsonify
import logging
import os
from flask_cors import CORS
from .config import Config
from .extensions import limiter


def _configure_logging():
    """Set up structured logging for all bachat.* loggers."""
    fmt = logging.Formatter(
        fmt='%(asctime)s | %(levelname)-7s | %(name)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler = logging.StreamHandler()
    handler.setFormatter(fmt)

    root_logger = logging.getLogger('bachat')
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(handler)
    # Prevent duplicate logs when Flask's logger also captures them
    root_logger.propagate = False

def create_app(config_class=Config):
    _configure_logging()

    app = Flask(__name__)
    app.config.from_object(config_class)

    # Dynamic CORS — supports localhost in dev, Vercel URL(s) in prod
    allowed_origins = os.environ.get(
        'ALLOWED_ORIGINS',
        'http://localhost:5173,http://localhost:3000'
    ).split(',')
    allowed_origins = [o.strip() for o in allowed_origins if o.strip()]

    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type"],
    )
    limiter.init_app(app)

    # Exempt CORS preflight OPTIONS requests from rate limiting
    @app.before_request
    def skip_options():
        from flask import request
        if request.method == 'OPTIONS':
            return None

    # Custom error handler for rate limit exceeded
    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return jsonify({
            "error": "Rate limit exceeded. Please slow down and try again later.",
            "retry_after": e.description,
        }), 429

    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'ok',
            'service': 'bachatai-backend',
            'message': 'Bachat AI Backend running',
        }), 200

    # Start keep-alive thread in production to prevent Render free tier sleep
    if os.environ.get('FLASK_ENV') == 'production':
        try:
            from keep_alive import start_keep_alive
            start_keep_alive()
        except Exception as _ka_err:
            logging.getLogger('bachat').warning(
                f"[keep-alive] Could not start pinger: {_ka_err}"
            )

    from .routes.upload import bp as upload_bp
    from .routes.analysis import bp as analysis_bp
    from .routes.chatbot import bp as chatbot_bp
    from .routes.reports import bp as reports_bp
    from .routes.goals_badges import bp as goals_badges_bp
    from .routes.forecast import bp as forecast_bp
    from .routes.ratio import bp as ratio_bp
    from .routes.stocks import bp as stocks_bp
    from .routes.salary import bp as salary_bp

    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
    app.register_blueprint(chatbot_bp, url_prefix='/api/chat')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(goals_badges_bp, url_prefix='/api/gamification')
    app.register_blueprint(forecast_bp, url_prefix='/api/forecast')
    app.register_blueprint(ratio_bp, url_prefix='/api/ratio')
    app.register_blueprint(stocks_bp, url_prefix='/api/stocks')
    app.register_blueprint(salary_bp, url_prefix='/api/salary')

    return app
