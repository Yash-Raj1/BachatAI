# ml/scripts/03_test_categorizer.py
import joblib, json

# Load saved model
tfidf      = joblib.load('models/categorizer/tfidf_vectorizer.pkl')
classifier = joblib.load('models/categorizer/classifier.pkl')

def predict_category(description: str, txn_type: str = 'DEBIT', mode: str = 'UPI') -> dict:
    text = f"{description.upper()} {txn_type} {mode}"
    vec  = tfidf.transform([text])
    pred = classifier.predict(vec)[0]
    prob = classifier.predict_proba(vec).max()
    return {
        'category':   pred,
        'confidence': round(float(prob) * 100, 1)
    }

# Test with real Indian transactions
test_cases = [
    ("ZOMATO ORDER 9182",            "DEBIT",  "UPI"),
    ("SWIGGY DELIVERY 4521",         "DEBIT",  "UPI"),
    ("AMAZON PURCHASE 7841",         "DEBIT",  "NETBANKING"),
    ("IRCTC BOOKING 3312",           "DEBIT",  "NETBANKING"),
    ("SALARY CREDIT INFOSYS",        "CREDIT", "NEFT"),
    ("NETFLIX SUBSCRIPTION",         "DEBIT",  "ECS"),
    ("HDFC HOME LOAN EMI",           "DEBIT",  "ECS"),
    ("ATM CASH WITHDRAWAL",          "DEBIT",  "ATM"),
    ("BESCOM ELECTRICITY BILL",      "DEBIT",  "NETBANKING"),
    ("OLA CABS TRIP",                "DEBIT",  "UPI"),
    ("APOLLO PHARMACY",              "DEBIT",  "UPI"),
    ("GROWW SIP MUTUAL FUND",        "DEBIT",  "ECS"),
    ("BIGBASKET GROCERY",            "DEBIT",  "UPI"),
    ("PVR CINEMAS TICKET",           "DEBIT",  "UPI"),
    ("AIRTEL MOBILE RECHARGE",       "DEBIT",  "UPI"),
]

print("🧪 Model Predictions:\n")
print(f"{'Description':<40} {'Predicted':<20} {'Confidence'}")
print("-" * 75)
for desc, txn_type, mode in test_cases:
    result = predict_category(desc, txn_type, mode)
    conf_bar = '█' * int(result['confidence'] / 10)
    print(f"{desc:<40} {result['category']:<20} {result['confidence']}%  {conf_bar}")