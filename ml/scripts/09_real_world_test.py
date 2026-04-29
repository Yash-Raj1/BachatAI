# ml/scripts/09_real_world_test.py
import pandas as pd
import joblib, json

# Load model
tfidf      = joblib.load('models/categorizer/tfidf_vectorizer.pkl')
classifier = joblib.load('models/categorizer/classifier.pkl')

# Load your real transactions
df = pd.read_csv('data/real_world_test.csv')

correct = 0
wrong   = []

print(f"{'Description':<35} {'True':<20} {'Predicted':<20} {'Conf':>6} {'✓?'}")
print("─" * 90)

for _, row in df.iterrows():
    text = f"{str(row['description']).upper()} {row['type']} {row['mode']}"
    vec  = tfidf.transform([text])
    pred = classifier.predict(vec)[0]
    conf = round(float(classifier.predict_proba(vec).max()) * 100, 1)
    ok   = pred == row['true_category']

    if ok:
        correct += 1
    else:
        wrong.append({
            'description': row['description'],
            'true':        row['true_category'],
            'predicted':   pred,
            'confidence':  conf
        })

    status = "✅" if ok else "❌"
    print(f"{str(row['description']):<35} {row['true_category']:<20} "
          f"{pred:<20} {conf:>5}%  {status}")

accuracy = correct / len(df) * 100
print(f"\n{'═'*60}")
print(f"  Real-World Accuracy : {accuracy:.1f}%  ({correct}/{len(df)} correct)")
print(f"  Synthetic Accuracy  : 97.1%")
print(f"  Gap                 : {97.1 - accuracy:.1f}% (expected — real data is harder)")

if wrong:
    print(f"\n  ❌ Missed {len(wrong)} transactions:")
    for w in wrong:
        print(f"     '{w['description']}' → predicted '{w['predicted']}' "
              f"(true: '{w['true']}', conf: {w['confidence']}%)")

# Save result
result = {
    'real_world_accuracy': round(accuracy, 2),
    'synthetic_accuracy':  97.13,
    'transactions_tested': len(df),
    'correct':             correct,
    'wrong_predictions':   wrong
}
with open('models/categorizer/real_world_evaluation.json', 'w') as f:
    json.dump(result, f, indent=2)

print(f"\n✅ Saved → models/categorizer/real_world_evaluation.json")