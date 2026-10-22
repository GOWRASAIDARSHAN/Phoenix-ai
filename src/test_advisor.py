"""
PHOENIX AI — Advisor Test Suite
Tests Ollama integration and deterministic fallback functions.
"""

from llm_advisor import (
    explain_markdown_decisions,
    generate_shopper_deals,
    explain_product_markdown,
    prioritize_inventory_risks,
)

stats = {
    "fixed_waste": 120,
    "markdown_waste": 60,
    "fixed_revenue": 24000,
    "markdown_revenue": 26000,
    "fixed_margin": 6000,
    "markdown_margin": 6500,
}

print("=== 1. MARKDOWN DECISION EXPLANATION ===")
exp = explain_markdown_decisions(stats)
print(exp)
assert exp and len(exp) > 20, "Explanation must not be empty"

items = [
    {
        "name": "Bread",
        "category": "Bakery",
        "days_remaining": 1,
        "original_price": 40,
        "discount_rate": 0.40,
        "discounted_price": 24,
    },
    {
        "name": "Milk",
        "category": "Dairy",
        "days_remaining": 1,
        "original_price": 60,
        "discount_rate": 0.40,
        "discounted_price": 36,
    },
]

print("\n=== 2. SHOPPER DEALS FLYER ===")
deals = generate_shopper_deals(items)
print(deals)
assert deals and "Bread" in deals and "Milk" in deals, "Flyer must contain items"

sample_product = {
    "name": "Sushi Platter",
    "category": "Packaged Fresh",
    "days_remaining": 1,
    "available_stock": 20,
    "original_price": 12.00,
    "recommended_price": 7.50,
    "discount_percent": 37.5,
    "unit_cost": 5.00,
    "expected_sales": 18,
    "expected_unsold": 2,
    "risk_level": "critical",
}

print("\n=== 3. PRODUCT MARKDOWN EXPLANATION ===")
prod_exp = explain_product_markdown(sample_product)
print(prod_exp)
assert prod_exp and ("Sushi Platter" in prod_exp or "37.5" in prod_exp or "12.00" in prod_exp), "Product explanation must reference product facts"

print("\n=== 4. INVENTORY RISK PRIORITIZATION ===")
prio = prioritize_inventory_risks([sample_product])
print(prio)
assert prio and len(prio) > 20, "Priority guidance must not be empty"

print("\nALL ADVISOR TESTS COMPLETED SUCCESSFULLY.")
