# Bachat AI - Backend API Service

This directory contains the primary backend application powered by Python and Flask. It acts as the central router for the platform, orchestrating data between the frontend, the Supabase PostgreSQL database, and the separate ML microservice.

## Tech Stack
- **Python 3.12**
- **Flask**: Core routing framework.
- **google-genai**: Google Gemini API client for AI statement parsing and the RAG chatbot.
- **supabase-py**: Service Role database management and queries.
- **yfinance**: Real-time Nifty 50 and Sensex tracking for the Investment Portal.
- **pytest**: Automated testing suite.

## Project Structure
```text
app/
├── routes/         # API Controllers
│   ├── analysis.py # Financial health scores
│   ├── chatbot.py  # Gemini RAG Chatbot
│   ├── forecast.py # Proxies requests to ML service
│   ├── gamification.py # Gamified goals
│   ├── reports.py  # Excel / PDF generation
│   ├── salary.py   # Salary intelligence tracking
│   ├── stocks.py   # Live stock market data
│   └── upload.py   # PDF/CSV statement processing
├── services/       # Core Business Logic
│   ├── ml_client.py        # HTTP Wrapper connecting to the ML Microservice
│   ├── pdf_parser.py       # Gemini Flash 2.5 statement extraction
│   └── salary_intelligence.py # Payday & streak engine
└── utils/          # Helpers (Date normalization, prompt strings)
```

## Setup & Running

### Requirements
Create a `.env` file referencing `.env.example` with your Supabase keys and Gemini API key.

### Start the Server
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
*The server will start on port 5000.*

### Running Tests
We enforce rigorous testing for our data parsing logic.
```bash
pytest tests/
```
