# Bachat AI - Machine Learning Microservice

This directory contains an independent ML microservice powered by FastAPI/Flask. By separating heavy mathematical forecasting and Isolation Forest algorithms from the main web server, Bachat AI remains highly responsive during statement uploads.

## Tech Stack
- **Flask/FastAPI**: Microservice API structure.
- **scikit-learn**: TF-IDF models, Logistic Regression, Isolation Forest (Anomaly Detection).
- **Prophet**: Meta's time-series forecasting framework for monthly savings projections.
- **statsmodels**: ARIMA fallback models.
- **pandas & numpy**: Data frame manipulation.

## Core Responsibilities
1. **Transaction Categorization (`/api/categorize`)**: Uses TF-IDF and Logistic Regression to auto-assign 15+ curated categories to raw bank statement strings based on historical patterns.
2. **Anomaly Detection (`/api/analyze`)**: Identifies statistical outliers in spending behavior (e.g., massive abnormal debits) using an Isolation Forest.
3. **Savings Forecasting (`/api/forecast`)**: Predicts the user's 6-month wealth trajectory using ensemble models.

## Setup & Running

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
*The ML server runs on Port 5001 to prevent conflicts with the core backend on Port 5000.*

## Testing
Run the comprehensive test script to ping all ML endpoints and verify the Prophet models and categorization logic.
```bash
python run_tests.py
```
