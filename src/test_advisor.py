
from llm_advisor import (
    explain_markdown_decisions,
    generate_shopper_deals,
)

stats = {
    "fixed_waste": 120,
    "markdown_waste": 60,
    "fixed_revenue": 24000,
    "markdown_revenue": 26000,
    "fixed_margin": 6000,
    "markdown_margin": 6500,
}

print("=== MARKDOWN EXPLANATION ===")
print(explain_markdown_decisions(stats))

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

print("\n=== SHOPPER DEALS ===")
print(generate_shopper_deals(items))
