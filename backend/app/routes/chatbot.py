"""
Chatbot Route — Gemini-powered financial assistant
====================================================
Two modes:
  - PUBLIC  (no user_id): Answers locally — no API call needed (saves quota)
  - AUTH    (with user_id): Uses Gemini with real financial data from Supabase
"""
from flask import Blueprint, request, jsonify
import logging
from collections import defaultdict
import google.generativeai as genai

logger = logging.getLogger('bachat.chatbot')
from app.config import Config
from app.services.supabase_client import get_supabase_client
from app.extensions import limiter
from app.utils.api_keys import get_gemini_api_key

bp = Blueprint('chatbot', __name__)


# ── Public mode: Local responses (NO API call = no quota usage) ──────────────
PUBLIC_FAQ = [
    {
        "keywords": ["what", "bachat", "about", "app", "platform", "tell me"],
        "response": "**Bachat AI** (बचत = Savings) is an AI-powered personal finance manager built for Indian users. 🇮🇳\n\nUpload your bank statement (PDF/CSV) and the app automatically:\n- 🤖 Parses & categorizes every transaction\n- 📊 Shows interactive charts & spending heatmaps\n- 🔄 Detects recurring payments (EMIs, subscriptions)\n- 🧠 Generates AI-powered savings tips\n- 💬 Lets you chat with a financial coach (that's me!)\n\n**Sign up for free** to get started!"
    },
    {
        "keywords": ["feature", "can do", "what can", "offer", "capabilities"],
        "response": "Here's what Bachat AI can do for you:\n\n📄 **Statement Upload** — PDF/CSV from SBI, HDFC, ICICI, Axis & more (password-protected too!)\n🏷️ **Smart Categorization** — 15+ categories (Food, Transport, Shopping, etc.)\n📊 **Interactive Dashboard** — Pie charts, bar charts, monthly trends\n🔥 **Spending Heatmap** — GitHub-style calendar showing daily spending\n🔄 **Recurring Detection** — Auto-finds EMIs, subscriptions & rent\n🧠 **AI Insights** — Personalized saving tips based on your data\n💬 **AI Chatbot** — Ask questions about your real finances\n🌙 **Dark/Light Mode** — Beautiful theme support\n🏆 **Gamification** — Earn badges for financial milestones\n\nSign up to try it all! ✨"
    },
    {
        "keywords": ["how", "work", "process", "steps", "use"],
        "response": "Getting started is super easy! 🚀\n\n**Step 1:** Sign up for a free account\n**Step 2:** Upload your bank statement (PDF or CSV)\n**Step 3:** AI automatically parses & categorizes all transactions\n**Step 4:** Explore your personalized dashboard with charts, insights & savings tips!\n\nThe whole process takes less than a minute. Your data is secured with bank-level encryption. 🔒"
    },
    {
        "keywords": ["bank", "support", "which bank", "sbi", "hdfc", "icici", "axis"],
        "response": "We support bank statements from all major Indian banks! 🏦\n\n✅ **SBI** (State Bank of India)\n✅ **HDFC Bank**\n✅ **ICICI Bank**\n✅ **Axis Bank**\n✅ And many more!\n\nJust upload your PDF or CSV statement — our AI handles the rest. We also support **password-protected PDFs** (common with Indian bank statements). 🔐"
    },
    {
        "keywords": ["price", "cost", "free", "pay", "subscription", "pricing"],
        "response": "🎉 **Bachat AI is completely FREE** during our beta period!\n\nNo credit card required. No hidden charges. Just sign up and start analyzing your finances today!"
    },
    {
        "keywords": ["safe", "secure", "privacy", "data", "protect"],
        "response": "Your data security is our top priority! 🔒\n\n- 🛡️ Bank-level encryption (Supabase + PostgreSQL with Row Level Security)\n- 🔑 Each user can only access their own data\n- ⏱️ Auto-logout after 15 minutes of inactivity\n- 🚫 We never share your data with third parties\n- 📄 Statements are processed and stored securely"
    },
    {
        "keywords": ["category", "categories", "categorize", "classify"],
        "response": "Bachat AI categorizes transactions into **15+ categories** automatically:\n\n🍕 Food & Dining | 🛒 Groceries | 🚕 Transport\n🛍️ Shopping | 🎬 Entertainment | ⚡ Utilities\n🏠 Rent & Housing | 📈 Investments | 🛡️ Insurance\n📚 Education | 🏥 Health & Medical | ✈️ Travel\n💳 EMI & Loans | 💰 Income | 🤝 Charity\n\nOur AI recognizes 120+ Indian merchants (Zomato, Swiggy, Ola, Amazon, Flipkart, etc.)!"
    },
    {
        "keywords": ["spending", "how much", "expense", "spend"],
        "response": "Great question! To see your spending details, you'll need to:\n\n1️⃣ **Sign up** for a free account\n2️⃣ **Upload** your bank statement\n3️⃣ **Ask me** again — I'll have your real data!\n\nOnce you're logged in, I can tell you exact amounts like *\"You spent ₹4,250 on Food across 12 transactions\"*. 📊"
    },
    {
        "keywords": ["tech", "stack", "built", "technology", "made with"],
        "response": "Bachat AI is built with modern technologies:\n\n⚛️ **Frontend:** React 18 + Vite + TailwindCSS\n🐍 **Backend:** Flask (Python)\n🤖 **AI:** Google Gemini AI\n🗄️ **Database:** Supabase (PostgreSQL)\n🔐 **Auth:** Supabase Authentication\n📊 **Charts:** Recharts\n\nBuilt with ❤️ for Indian users!"
    },
    {
        "keywords": ["hello", "hi", "hey", "namaste", "good"],
        "response": "Namaste! 🙏 Welcome to Bachat AI!\n\nI'm here to tell you about our platform. You can ask me:\n- What is Bachat AI?\n- What features do you offer?\n- Which banks are supported?\n- Is it free?\n- How does it work?\n\nOr **sign up** to unlock personalized financial insights! ✨"
    },
    {
        "keywords": ["thank", "thanks", "dhanyavaad", "shukriya"],
        "response": "You're welcome! 😊 Happy to help!\n\nIf you're ready to start managing your finances smarter, **sign up for free** and upload your first bank statement. I'll be here to guide you! 💪"
    },
]

def get_public_response(message: str) -> str:
    """Match user message against FAQ keywords and return a response."""
    msg_lower = message.lower()

    best_match = None
    best_score = 0

    for faq in PUBLIC_FAQ:
        score = sum(1 for kw in faq["keywords"] if kw in msg_lower)
        if score > best_score:
            best_score = score
            best_match = faq

    if best_match and best_score >= 1:
        return best_match["response"]

    # Default fallback
    return (
        "I'm Bachat AI's assistant! 🤖 I can help you learn about our platform.\n\n"
        "Try asking:\n"
        "• *What is Bachat AI?*\n"
        "• *What features do you offer?*\n"
        "• *Which banks are supported?*\n"
        "• *Is it free?*\n"
        "• *How does it work?*\n\n"
        "Or **sign up** to unlock your personalized financial dashboard! ✨"
    )


# ── Authenticated mode context (real data) ───────────────────────────────────
def build_real_context(user_id: str) -> str:
    supabase = get_supabase_client()

    stmt_res = supabase.table('statements') \
        .select('*') \
        .eq('user_id', user_id) \
        .order('parsed_at', desc=True) \
        .limit(1) \
        .execute()

    if not stmt_res.data:
        return """
        The user is logged in but has not uploaded any bank statement yet.
        You are Bachat AI, a personal financial coach for Indian users.
        Politely tell them to upload a statement first (on the Dashboard page), then you can answer detailed questions about their finances.
        Keep your answer very short (1-2 sentences).
        """

    statement = stmt_res.data[0]
    total_credit = float(statement.get('total_credit', 0) or 0)
    total_debit = float(statement.get('total_debit', 0) or 0)
    bank_name = statement.get('bank_name', 'Unknown')
    period_start = statement.get('statement_period_start', '')
    period_end = statement.get('statement_period_end', '')

    txn_res = supabase.table('transactions') \
        .select('*') \
        .eq('statement_id', statement['id']) \
        .execute()

    transactions = txn_res.data or []

    cat_spend = defaultdict(float)
    cat_income = defaultdict(float)
    cat_count = defaultdict(int)

    for txn in transactions:
        amt = float(txn.get('amount', 0))
        cat = txn.get('category', 'Other')
        if txn.get('type') == 'debit':
            cat_spend[cat] += amt
            cat_count[cat] += 1
        else:
            cat_income[cat] += amt

    sorted_spend = sorted(cat_spend.items(), key=lambda x: x[1], reverse=True)

    spend_lines = "\n".join(
        f"    - {cat}: ₹{amt:,.2f} ({cat_count[cat]} transactions)"
        for cat, amt in sorted_spend
    )

    income_lines = "\n".join(
        f"    - {cat}: ₹{amt:,.2f}"
        for cat, amt in sorted(cat_income.items(), key=lambda x: x[1], reverse=True)
    ) or "    - No income breakdown available"

    savings = total_credit - total_debit

    top_category = sorted_spend[0] if sorted_spend else ("N/A", 0)

    # Fetch user's profile info (name, goals)
    profile_res = supabase.table('profiles').select('full_name, savings_goal').eq('id', user_id).single().execute()
    profile = profile_res.data or {}
    user_name = profile.get('full_name', 'User').split(' ')[0] # First name

    return f"""
    SYSTEM ROLE: You are Bachat AI, an expert personal financial coach. You have FULL ACCESS to {user_name}'s real bank data.
    CRITICAL: You MUST answer using ONLY the real data provided below. NEVER say "I don't have access". YOU DO HAVE ACCESS!

    ====== USER'S REAL BANK DATA ======
    User Name: {user_name}
    Bank: {bank_name}
    Period: {period_start} to {period_end}
    Total Transactions: {len(transactions)}
    Total Income: ₹{total_credit:,.2f}
    Total Spending: ₹{total_debit:,.2f}
    Net Savings: ₹{savings:,.2f}
    Highest Spending Category: {top_category[0]} (₹{top_category[1]:,.2f})

    ====== CATEGORY-WISE SPENDING ======
{spend_lines}

    ====== FORMATTING RULES (STRICTLY ENFORCED) ======
    1. NEVER say "I don't have access". You are an AI reading their exact database row.
    2. Address the user by their first name ({user_name}).
    3. KEEP IT CONCISE. Your answers will be displayed in a small chat UI. Use a maximum of 3-4 short sentences or bullet points. DO NOT write long paragraphs.
    4. Provide the EXACT ₹ amount from the data when answering spending questions.
    5. Be friendly and conversational, like a premium finance assistant.
    6. Do NOT suggest the user to "check their bank app". Answer the question directly using the data provided above!
    """


# ── Gemini model fallback chain ──────────────────────────────────────────────
MODELS_TO_TRY = [
    'gemini-2.5-flash-lite',   # Cheapest model with most generous free-tier quota
    'gemini-2.5-flash',        # Fallback — more capable but tighter quota
]


# ── Route ─────────────────────────────────────────────────────────────────────
@bp.route('/message', methods=['POST'])
@limiter.limit('20 per hour')
def send_message():
    data = request.json
    user_message = data.get('message', '')
    user_id = data.get('user_id', '')
    mode = data.get('mode', 'public')

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    # ── PUBLIC MODE: Local response (no API call = no quota usage!) ───────
    if mode != 'authenticated' or not user_id:
        logger.info("PUBLIC mode — local response")
        response_text = get_public_response(user_message)
        return jsonify({"response": response_text}), 200

    # ── AUTHENTICATED MODE: Use Gemini with real data ─────────────────────
    api_key = get_gemini_api_key()
    if not api_key:
        return jsonify({
            "response": "No Gemini API key configured. Please set GEMINI_API_KEY in your .env file."
        }), 200
        
    genai.configure(api_key=api_key)

    try:
        context = build_real_context(user_id)
        logger.info("AUTH mode — user %s...", user_id[:8])
    except Exception as ctx_err:
        logger.error("Context build failed: %s", ctx_err)
        context = "You are Bachat AI, a financial coach for Indian users. Answer helpfully using markdown."

    prompt = f"{context}\n\nUser: {user_message}\nBachat AI:"

    # Try models in order — fall back if quota exhausted
    last_error = None
    for model_name in MODELS_TO_TRY:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            ai_response = response.text
            logger.info("Response via %s: %s", model_name, user_message[:50])
            return jsonify({"response": ai_response}), 200
        except Exception as e:
            last_error = e
            err_str = str(e)
            if '429' in err_str or 'quota' in err_str.lower():
                logger.warning("%s quota hit, trying next...", model_name)
                continue
            else:
                logger.error("ERROR (%s): %s", model_name, e)
                return jsonify({"error": str(e)}), 500

    # All models exhausted
    logger.error("All models quota exhausted: %s", last_error)
    return jsonify({
        "response": "I'm temporarily overloaded 😅. The AI quota has been reached. Please try again in a minute or two! Your data is safe and waiting."
    }), 200
