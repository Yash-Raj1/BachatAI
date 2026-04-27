"""
run_tests.py — Test all BachatAI ML API endpoints
Run: python run_tests.py
"""
import requests, json

BASE = "http://localhost:5001"

def hr(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def show(resp):
    try:
        data = resp.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"[raw] {resp.text}")

# ── Test 0: Health ────────────────────────────────────────────────────
hr("GET /health")
r = requests.get(f"{BASE}/health")
show(r)

# ── Test 1: Categorize single transaction ─────────────────────────────
hr("POST /api/categorize  (single)")
r = requests.post(f"{BASE}/api/categorize", json={
    "description": "ZOMATO ORDER 9182",
    "type": "DEBIT",
    "mode": "UPI"
})
show(r)

# ── Test 2: Batch categorize ──────────────────────────────────────────
hr("POST /api/categorize/batch  (3 transactions)")
r = requests.post(f"{BASE}/api/categorize/batch", json={
    "transactions": [
        {"description": "SWIGGY DELIVERY",      "type": "DEBIT",  "mode": "UPI"},
        {"description": "SALARY CREDIT TCS",    "type": "CREDIT", "mode": "NEFT"},
        {"description": "NETFLIX SUBSCRIPTION", "type": "DEBIT",  "mode": "ECS"},
    ]
})
show(r)

# ── Test 3: Forecast ──────────────────────────────────────────────────
hr("POST /api/forecast  (3 months -> 6 month prediction)")
r = requests.post(f"{BASE}/api/forecast", json={
    "monthly_data": [
        {"ds": "2024-01-01", "savings": 12000},
        {"ds": "2024-02-01", "savings":  9500},
        {"ds": "2024-03-01", "savings": 14000},
    ],
    "periods": 6
})
show(r)

# ── Test 4: Full analyze pipeline ─────────────────────────────────────
hr("POST /api/analyze  (full pipeline: categorize + anomaly)")
r = requests.post(f"{BASE}/api/analyze", json={
    "transactions": [
        {"description": "ZOMATO ORDER",       "amount":   450, "type": "DEBIT",  "mode": "UPI"},
        {"description": "AMAZON PURCHASE",    "amount":  8500, "type": "DEBIT",  "mode": "NETBANKING"},
        {"description": "SALARY CREDIT WIPRO","amount": 75000, "type": "CREDIT", "mode": "NEFT"},
        {"description": "HDFC HOME LOAN EMI", "amount": 15000, "type": "DEBIT",  "mode": "ECS"},
    ]
})
data = r.json()

# Pretty summary
print("\nSummary:")
for k, v in data.get("summary", {}).items():
    print(f"   {k:<20}: {v}")

print("\nCategory Breakdown:")
for cat, amt in data.get("category_breakdown", {}).items():
    print(f"   {cat:<25}: Rs {amt:,.2f}")

print("\nPer-Transaction Results:")
print(f"{'Description':<30} {'Category':<22} {'Conf':>5}  {'Anomaly':>7}  {'Z':>6}")
print("-" * 80)
for t in data.get("transactions", []):
    flag = "YES" if t["is_anomaly"] else "no"
    print(f"{str(t['description']):<30} {t['category']:<22} "
          f"{t['confidence']:>4}%  {flag:>7}  {t['z_score']:>6.2f}")

print("\nAll tests complete!")
