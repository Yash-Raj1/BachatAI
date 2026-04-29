import requests

# ── Real Supabase data (from SQL Check 3 output) ──────────────────────
real_supabase_data = {
    'monthly_data': [
        {'ds': '2025-10-01', 'savings': 13838},
        {'ds': '2025-11-01', 'savings': 12469},
        {'ds': '2025-12-01', 'savings': 12457},
        {'ds': '2026-01-01', 'savings': 11178},
        {'ds': '2026-02-01', 'savings':  8181},
        {'ds': '2026-03-01', 'savings':  9811},
    ],
    'periods': 6
}

# ── Alternative test: mix of higher and lower savings ─────────────────
alt_test_data = {
    'monthly_data': [
        {'ds': '2025-01-01', 'savings': 18000},
        {'ds': '2025-02-01', 'savings': 22000},
        {'ds': '2025-03-01', 'savings': 15000},
        {'ds': '2025-04-01', 'savings': 25000},
        {'ds': '2025-05-01', 'savings': 19000},
        {'ds': '2025-06-01', 'savings': 21000},
        {'ds': '2025-07-01', 'savings': 17000},
        {'ds': '2025-08-01', 'savings': 23000},
    ],
    'periods': 6
}

# ── Test with declining savings (stress test) ─────────────────────────
declining_data = {
    'monthly_data': [
        {'ds': '2025-07-01', 'savings': 20000},
        {'ds': '2025-08-01', 'savings': 16000},
        {'ds': '2025-09-01', 'savings': 12000},
        {'ds': '2025-10-01', 'savings':  8000},
        {'ds': '2025-11-01', 'savings':  5000},
        {'ds': '2025-12-01', 'savings':  3000},
    ],
    'periods': 6
}

separator = "=" * 55


def test_forecast(label, payload):
    print(separator)
    print("TEST:", label)
    print(separator)
    input_savings = [d['savings'] for d in payload['monthly_data']]
    print("Input months   :", len(input_savings))
    print("Input savings  :", input_savings)
    print("Input range    : Rs", min(input_savings), "- Rs", max(input_savings))
    print()

    try:
        r = requests.post(
            'http://localhost:5000/api/forecast',
            json=payload,
            timeout=60
        )
        print("HTTP Status    :", r.status_code)
        result = r.json()

        if 'error' in result:
            print("API ERROR      :", result['error'])
            return

        forecast = result.get('forecast', [])
        total    = result.get('total_predicted', 0)
        avg_pred = total / len(forecast) if forecast else 0

        print("Months forecast:", result.get('periods'))
        print("Total predicted: Rs {:,.0f}".format(total))
        print("Avg per month  : Rs {:,.0f}".format(avg_pred))
        print()
        print("  {:<10} {:>12} {:>12} {:>12}".format(
            "Month", "Predicted", "Lower", "Upper"))
        print("  " + "-" * 50)

        all_positive = True
        for f in forecast:
            pred = f['predicted_savings']
            low  = f['lower_bound']
            high = f['upper_bound']
            flag = ""
            if pred <= 0:
                flag = " <-- ZERO/NEGATIVE!"
                all_positive = False
            print("  {:<10} Rs {:>8,.0f}  Rs {:>8,.0f}  Rs {:>8,.0f}{}".format(
                f['month'], pred, low, high, flag))

        print()
        if total > 0 and all_positive:
            print("STATUS: WORKING -- all values positive and non-zero")
        elif total > 0 and not all_positive:
            print("STATUS: PARTIAL -- some months zero or negative")
        else:
            print("STATUS: BROKEN  -- total predicted is zero or negative")

    except requests.exceptions.ConnectionError:
        print("STATUS: FAILED  -- ML server not running on localhost:5000")
    except Exception as e:
        print("STATUS: ERROR   --", str(e))

    print()


# Run all 3 tests
test_forecast("REAL SUPABASE DATA (Oct 2025 - Mar 2026)", real_supabase_data)
test_forecast("ALTERNATE DATA (8 months, Higher Savings)", alt_test_data)
test_forecast("DECLINING SAVINGS (stress test)", declining_data)

print(separator)
print("ALL TESTS COMPLETE")
print(separator)
