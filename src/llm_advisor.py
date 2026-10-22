
"""
Ollama AI Advisor
NEXAI 2026 — PS 4.1: Markdown Before Waste

Provides:
1. Explanation of measured simulation results.
2. A shopper-friendly near-expiry deals flyer.
3. Rule-based fallbacks when Ollama is unavailable.

Important: Numeric calculations are performed in Python,
not delegated to the language model.
"""

import json
import ollama


MODEL_NAME = "llama3.2:1b"


def _ask_ollama(prompt: str) -> str:
    """Generate text using the local Ollama model."""
    response = ollama.generate(
        model=MODEL_NAME,
        prompt=prompt,
        stream=False,
        options={
            "temperature": 0.1,
            "num_predict": 250,
        },
    )
    return response["response"].strip()


def _format_money(value: float) -> str:
    """Format a monetary value consistently."""
    return f"{value:,.2f}"


def explain_markdown_decisions(summary_stats: dict) -> str:
    """
    Explain fixed-price versus markdown results.

    Expected dictionary keys:
        fixed_waste
        markdown_waste
        fixed_revenue
        markdown_revenue
        fixed_margin
        markdown_margin
    """
    waste_fixed = float(summary_stats.get("fixed_waste", 0))
    waste_markdown = float(summary_stats.get("markdown_waste", 0))

    revenue_fixed = float(summary_stats.get("fixed_revenue", 0))
    revenue_markdown = float(summary_stats.get("markdown_revenue", 0))

    margin_fixed = float(summary_stats.get("fixed_margin", 0))
    margin_markdown = float(summary_stats.get("markdown_margin", 0))

    # Calculate all metrics in Python.
    waste_difference = waste_fixed - waste_markdown
    revenue_change = revenue_markdown - revenue_fixed
    margin_change = margin_markdown - margin_fixed

    if waste_fixed > 0:
        waste_reduction = waste_difference / waste_fixed * 100
        waste_description = (
            f"{waste_reduction:.1f}% reduction"
            if waste_difference >= 0
            else f"{abs(waste_reduction):.1f}% increase"
        )
    else:
        waste_reduction = None
        waste_description = (
            "Fixed-price waste was zero; percentage reduction "
            "cannot be calculated."
        )

    if revenue_change > 0:
        revenue_description = (
            f"increased by {_format_money(revenue_change)}"
        )
    elif revenue_change < 0:
        revenue_description = (
            f"decreased by {_format_money(abs(revenue_change))}"
        )
    else:
        revenue_description = "did not change"

    if margin_change > 0:
        margin_description = (
            f"increased by {_format_money(margin_change)}"
        )
    elif margin_change < 0:
        margin_description = (
            f"decreased by {_format_money(abs(margin_change))}"
        )
    else:
        margin_description = "did not change"

    # Deterministic fallback: the numbers and directions are generated
    # by Python, so the explanation remains correct without Ollama.
    fallback = (
        "### Markdown Decision Analysis\n\n"
        f"- **Waste:** Fixed pricing wasted {waste_fixed:,.0f} units, "
        f"while dynamic markdown wasted {waste_markdown:,.0f} units. "
        f"{waste_description} compared with fixed pricing.\n"
        f"- **Revenue:** Fixed pricing generated "
        f"{_format_money(revenue_fixed)}, while dynamic markdown "
        f"generated {_format_money(revenue_markdown)}. Revenue "
        f"{revenue_description} under markdown pricing.\n"
        f"- **Net margin:** Fixed pricing generated "
        f"{_format_money(margin_fixed)}, while markdown pricing "
        f"generated {_format_money(margin_markdown)}. Net margin "
        f"{margin_description}. Consider both the waste reduction "
        f"and the change in margin when choosing a policy."
    )

    # Pass verified calculations to the language model.
    prompt = f"""
You are a grocery retail economics advisor.

Explain the following VERIFIED simulation facts in exactly
3 concise Markdown bullet points.

Do not recalculate any numbers.
Do not swap fixed-price and markdown values.
Do not change the direction of any increase or decrease.
Do not invent causes or additional statistics.

Verified facts:
1. Waste:
   Fixed-price waste = {waste_fixed:,.0f} units.
   Markdown waste = {waste_markdown:,.0f} units.
   Comparison = {waste_description}.

2. Revenue:
   Fixed-price revenue = {_format_money(revenue_fixed)}.
   Markdown revenue = {_format_money(revenue_markdown)}.
   Revenue change = {revenue_change:+,.2f}.
   Revenue direction = {revenue_description}.

3. Net margin:
   Fixed-price net margin = {_format_money(margin_fixed)}.
   Markdown net margin = {_format_money(margin_markdown)}.
   Net margin change = {margin_change:+,.2f}.
   Margin direction = {margin_description}.

Explain the trade-off between waste and margin in simple
language. Treat the numbers and comparison directions above
as authoritative. Return exactly 3 bullet points.
"""

    try:
        result = _ask_ollama(prompt)

        # Use deterministic output if the model returns empty text.
        if not result:
            return fallback

        return result

    except Exception:
        # Ollama may be stopped or unavailable.
        return fallback


def generate_shopper_deals(discounted_items_list: list) -> str:
    """
    Generate a shopper-friendly flyer from discounted products.

    Expected fields for each product:
        name
        category
        days_remaining
        original_price
        discount_rate
        discounted_price

    discount_rate must be expressed as a decimal:
        0.40 means 40% off.
    """
    if discounted_items_list is None:
        return (
            "### Today's Near-Expiry Deals\n\n"
            "No product data is available for this simulation."
        )

    # Support both lists of dictionaries and Pandas DataFrames.
    if hasattr(discounted_items_list, "to_dict"):
        items = discounted_items_list.to_dict(orient="records")
    else:
        items = list(discounted_items_list)

    if not items:
        return (
            "### Today's Near-Expiry Deals\n\n"
            "There are currently no discounted items in the "
            "selected simulation snapshot."
        )

    safe_items = []

    for item in items[:20]:
        original_price = float(item.get("original_price", 0))
        discounted_price = float(item.get("discounted_price", 0))
        discount_rate = float(item.get("discount_rate", 0))
        days_remaining = int(item.get("days_remaining", 0))

        # Validate the product data before using it in a flyer.
        if original_price < 0 or discounted_price < 0:
            continue

        if not 0 <= discount_rate <= 1:
            continue

        if days_remaining < 0:
            continue

        safe_items.append({
            "name": str(item.get("name", "Product")),
            "category": str(item.get("category", "Grocery")),
            "days_remaining": days_remaining,
            "original_price": original_price,
            "discount_rate": discount_rate,
            "discounted_price": discounted_price,
        })

    if not safe_items:
        return (
            "### Today's Near-Expiry Deals\n\n"
            "No valid discounted product records were supplied."
        )

    # Build a factual flyer in Python. This is also the fallback.
    fallback_lines = [
        "# Today's Near-Expiry Deals",
        "",
        "Save on selected items and help reduce food waste!",
        "",
    ]

    for item in safe_items:
        discount_pct = item["discount_rate"] * 100

        fallback_lines.extend([
            f"### {item['name']}",
            f"- Category: {item['category']}",
            f"- Original price: {_format_money(item['original_price'])}",
            f"- Discounted price: {_format_money(item['discounted_price'])}",
            f"- Discount: {discount_pct:.0f}% off",
            f"- Days remaining: {item['days_remaining']}",
            "",
        ])

    fallback_lines.append(
        "Choose what you need and help good food go to good use."
    )

    fallback = "\n".join(fallback_lines)

    prompt = f"""
You are a grocery store marketing assistant.

Create an appealing, concise Markdown flyer titled:
"Today's Near-Expiry Deals".

Use ONLY the product information in the JSON below.

Rules:
- Preserve every product name and category exactly.
- Copy all prices, discounts, and days remaining exactly.
- Do not calculate, modify, or invent any numerical values.
- Do not invent products, availability, offers, or health claims.
- Clearly show original price, discounted price, discount percentage,
  and days remaining for each product.
- Use friendly, simple language.
- End with one short message encouraging food-waste reduction.
- Do not say products are safe or fresh unless independently verified.

Product data:
{json.dumps(safe_items, ensure_ascii=False, indent=2)}
"""

    try:
        result = _ask_ollama(prompt)

        if not result:
            return fallback

        return result

    except Exception:
        return fallback
