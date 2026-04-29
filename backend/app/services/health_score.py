def calculate_health_score(user_data):
    savings = user_data.get('savings', 0)
    income = max(user_data.get('income', 1), 1)         # prevent /0
    spending = user_data.get('spending', 0)
    overspend_pct = user_data.get('overspend_pct', 0)
    goals_on_track = user_data.get('goals_on_track', 0)
    total_goals = max(user_data.get('total_goals', 1), 1)  # prevent /0
    expense_std_deviation_pct = user_data.get('expense_std_deviation_pct', 0)
    emergency_fund = user_data.get('emergency_fund', 0)
    monthly_expenses = spending if spending > 0 else 1

    savings_rate_score     = min((savings/income) * 200, 100)
    
    budget_score = 100 if spending <= income * 0.6 else max(0, 100 - overspend_pct * 2)
    goal_score = (goals_on_track / total_goals) * 100
    stability_score = max(0, 100 - expense_std_deviation_pct)
    emergency_fund_score = min((emergency_fund / (monthly_expenses * 3)) * 100, 100)
    
    final_score = (
        savings_rate_score   * 0.40 +
        budget_score         * 0.20 +
        goal_score           * 0.15 +
        stability_score      * 0.15 +
        emergency_fund_score * 0.10
    )
    return round(final_score)
