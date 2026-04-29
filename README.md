# 🏦 🇮🇳 Bachat AI (बचत) - The Intelligent Financial Assistant

Bachat AI is a premium, AI-powered personal finance manager built to revolutionize how Indian banking users track, analyze, and optimize their money. 

By leveraging **Google Gemini AI** and a **Dedicated Machine Learning Microservice**, Bachat AI effortlessly parses complex, inconsistent PDF and CSV bank statements, running them through Prophet forecasting, Anomaly Detection, and a Smart Adaptive Ratio Engine. It turns raw data into beautiful, actionable insights, spending heatmaps, and gamified saving targets. It also features a deeply context-aware Chatbot that acts as your personal financial coach.

![Dashboard Preview](https://via.placeholder.com/1000x500?text=Bachat+AI+Dashboard)

---

## ✨ Core Features

*   📄 **AI-Powered Statement Parsing:** Upload PDF or CSV statements from any Indian bank (SBI, HDFC, ICICI, etc.). The AI structures the data flawlessly native to the app via Gemini Flash 2.5.
*   📐 **Smart Adaptive Ratio Engine:** Dynamically analyzes your spending, dependencies, and city tier to recommend the optimal Needs:Savings ratio (50:50 up to 90:10). Say goodbye to rigid hard-coded tracking.
*   🔮 **Microservice ML Forecasting:** Incorporates Facebook Prophet, ARIMA, and Linear Regression ensembles to plot your personalized 6-month wealth projections.
*   🚨 **Fraud & Anomaly Detection:** Utilizes Scikit-learn's Isolation Forest algorithm to spotlight unusual transactions that fall drastically outside your spending baseline.
*   🏷️ **Smart Categorization & Recurring Bills:** Transactions are auto-categorized into 15+ curated buckets, automatically flagging your EMI deductions and subscriptions.
*   💬 **Conversational AI Coach:** Chat with your finances natively! RAG (Retrieval-Augmented Generation) feeds your database context directly into a private instance of Gemini 2.0 Flash to provide immediate, math-accurate answers.
*   🏆 **Gamification Engine:** Earn achievements (e.g., "Saver Rookie", "60:40 Champion") dynamically as your spending habits improve.
*   💰 **Salary Day Intelligence:** Auto-detects your payday based on recurring income, calculating real-time daily safe-to-spend budgets, tracking burn rates, and alerting you of overspending streaks.
*   📈 **Real-time Investment Tracking:** View live NSE/BSE stock prices and Nifty50 indexes (powered by yfinance), along with AI-driven investment suggestions categorized by risk appetite based on your monthly savings.
*   🌓 **Glassmorphic UI:** A deeply custom "Modern Warm" design system built on Vite + React 18, supporting buttery smooth Light and Dark modes.

---

## 🛠️ The Technology Stack Architecture

Bachat AI operates across three distinct tiers to seamlessly handle heavy data manipulation, web rendering, and stateful tracking.

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│   Frontend      │────▶│    Backend      │────▶│    ML Service       │
│   (Vite/React)  │     │    (Flask)      │     │    (Flask)          │
│   Port 5173     │     │    Port 5000    │     │    Port 5001        │
└─────────────────┘     └─────────────────┘     └─────────────────────┘
       │                       │                          │
  Supabase Auth          PDF Parsing (Gemini)      Prophet + ARIMA Forecasts
  Dashboard UI           Categorization            TF-IDF Categorizer Engine
  Forecast Charts        Smart Ratio Engine        Isolation Forest Anomaly
  Anomaly Widgets        Supabase Client           
                         Gamification & Chatbot    
```

### 🌐 Frontend (React 18 + Vite)
- **Core:** React Router DOM, Tailwind CSS V3, PostCSS.
- **Visuals:** Recharts, Framer Motion, Lucide React, react-calendar-heatmap, dotted-map.
- **State & Data:** Zustand, Axios, date-fns, react-dropzone.
- **Testing:** Vitest, React Testing Library.

### ⚙️ Backend API (Flask Python 3.12)
- **Framework:** Flask, Flask-CORS, Flask-Limiter.
- **AI & Data:** google-genai, pdfplumber, PyMuPDF, pandas, openpyxl.
- **DB Client:** supabase-py, psycopg2-binary.
- **Financial Services:** yfinance (Live stocks), reportlab (PDF exports).

### 🧠 Data Science & ML Engine (Flask Microservice)
- **Core ML:** scikit-learn (Isolation Forest, Logistic Regression), Prophet (Meta), statsmodels (ARIMA).
- **Data:** numpy, pandas, joblib.
- **Visualization (Notebooks):** matplotlib, seaborn.

### 🗃️ Database Layer (Supabase PostgreSQL)
- **Auth & RLS:** Built-in JWT Auth, Row Level Security enforced on all tables.
- **Key Tables:** `profiles`, `statements`, `transactions`, `badges`, `forecasts`, `ratio_history`, `salary_intelligence`.

---

## 🚀 Local Development Setup

### 1. Requirements
*   Node.js v18+
*   Python 3.10+
*   A Supabase Project
*   A Google AI Studio API Key (`AIzaSy...`)

### 2. Configure Environment Variables
You must set up `.env` files in three directories.

**`frontend/.env`**
```env
VITE_SUPABASE_URL=https://your-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_API_URL=http://localhost:5000
```

**`backend/.env`**
```env
SUPABASE_URL=https://your-id.supabase.co
SUPABASE_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-private-admin-key
DATABASE_URL=postgresql://postgres:password@db.your-id.supabase.co:5432/postgres
GEMINI_API_KEY=AIzaSy...
ML_API_URL=http://localhost:5001
FLASK_APP=run.py
FLASK_ENV=development
```

### 3. Running the Stack

**Terminal 1: ML Microservice**
```bash
cd ml
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Terminal 2: Core Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

**Terminal 3: React Frontend**
```bash
cd frontend
npm install
npm run dev
```

### 4. Running Tests
- **Frontend:** `cd frontend && npm run test`
- **Backend:** `cd backend && pytest tests/`
- **ML:** `cd ml && python run_tests.py`

## 📜 License
MIT License.
