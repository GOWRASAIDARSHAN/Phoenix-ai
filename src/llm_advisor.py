
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


def explain_product_markdown(product: dict) -> str:
    """
    Explain why a specific product has been assigned its recommended markdown price.
    Calculates deterministic facts first, then formats or passes to Ollama.
    """
    name = str(product.get("name", "Product"))
    category = str(product.get("category", "General"))
    days = int(product.get("days_remaining", product.get("daysToExpiry", 0)))
    stock = int(product.get("available_stock", product.get("availableStock", 0)))
    original_price = float(product.get("original_price", product.get("originalPrice", 0)))
    recommended_price = float(product.get("recommended_price", product.get("recommendedPrice", original_price)))
    discount_pct = float(product.get("discount_percent", product.get("discountPercent", 0)))
    cost = float(product.get("unit_cost", product.get("unitCost", 0)))
    expected_sales = float(product.get("expected_sales", product.get("expectedSales", 0)))
    expected_unsold = float(product.get("expected_unsold", product.get("expectedUnsold", max(0, stock - expected_sales))))
    risk_level = str(product.get("risk_level", product.get("riskLevel", "medium"))).upper()

    profit_est = (expected_sales * recommended_price) - (expected_sales * cost)
    floor_margin = recommended_price - cost

    fallback = (
        f"### Pricing Rationale: {name} ({risk_level} Risk)\n\n"
        f"- **Shelf Life & Urgency:** {name} has **{days} day(s)** remaining before expiration with **{stock} units** in inventory.\n"
        f"- **Markdown Recommendation:** Recommending a **{discount_pct:.1f}% discount** (from {_format_money(original_price)} down to {_format_money(recommended_price)}), "
        f"which preserves a margin of {_format_money(floor_margin)} above unit cost ({_format_money(cost)}).\n"
        f"- **Waste Prevention Outcome:** Expected to stimulate sell-through of approximately **{expected_sales:.0f} units**, leaving ~**{expected_unsold:.0f} unsold units** "
        f"and recovering estimated profit of **{_format_money(profit_est)}** before obsolescence."
    )

    prompt = f"""
You are an expert grocery inventory pricing advisor.
Explain this product markdown recommendation in exactly 3 bullet points.

Verified facts:
- Product: {name} ({category})
- Days until expiry: {days}
- Available stock: {stock} units
- Original price: {_format_money(original_price)}
- Recommended price: {_format_money(recommended_price)} ({discount_pct:.1f}% discount)
- Unit cost floor: {_format_money(cost)} (unit margin: {_format_money(floor_margin)})
- Expected sales after markdown: {expected_sales:.0f} units
- Projected unsold units: {expected_unsold:.0f} units
- Risk level: {risk_level}

Rules:
1. Do not invent or recalculate any numbers.
2. State why the discount is necessary given days left and stock.
3. Confirm that the price protects profitability by remaining above cost.
4. Conclude with the waste reduction benefit.
5. Exactly 3 concise bullet points.
"""

    try:
        result = _ask_ollama(prompt)
        if not result:
            return fallback
        return result
    except Exception:
        return fallback


def prioritize_inventory_risks(products_list: list) -> str:
    """
    Generate prioritized action guidance for high and critical risk items.
    """
    if not products_list:
        return "No products currently evaluated for inventory risk."

    critical_items = [p for p in products_list if str(p.get("riskLevel", p.get("risk_level", "")).lower()) in ["critical", "high"]]
    if not critical_items:
        critical_items = products_list[:3]

    # Sort by urgency (lowest daysToExpiry, then highest stock)
    sorted_items = sorted(
        critical_items,
        key=lambda x: (
            int(x.get("daysToExpiry", x.get("days_remaining", 99))),
            -int(x.get("availableStock", x.get("available_stock", 0)))
        )
    )[:4]

    summary_bullets = []
    for item in sorted_items:
        p_name = item.get("name", "Product")
        p_days = int(item.get("daysToExpiry", item.get("days_remaining", 0)))
        p_stock = int(item.get("availableStock", item.get("available_stock", 0)))
        p_risk = str(item.get("riskLevel", item.get("risk_level", "high"))).upper()
        summary_bullets.append(f"- **{p_name}** ({p_risk}): {p_days} day(s) left, {p_stock} units in stock.")

    fallback = (
        "### High Priority Action List\n\n"
        + "\n".join(summary_bullets)
        + "\n\n**Managerial Recommendations:**\n"
        + "1. Immediately activate dynamic markdowns on critical items expiring in <= 2 days.\n"
        + "2. Re-merchandise near-expiry items to front-of-store high-visibility discount displays.\n"
        + "3. Export discounted item flyer to local community or food-rescue partners if inventory cannot clear by close of business."
    )

    prompt = f"""
You are an inventory operations supervisor for a grocery supermarket.
Provide an operational priority briefing based on these urgent near-expiry items:
{json.dumps(sorted_items, default=str, indent=2)}

Rules:
- List the top items needing immediate markdown execution.
- Recommend 3 practical actions store staff must take today.
- Keep concise and strictly grounded in the provided data.
"""

    try:
        result = _ask_ollama(prompt)
        if not result:
            return fallback
        return result
    except Exception:
        return fallback


def run_standalone_server(port: int = 5000):
    """
    Lightweight HTTP server exposing advisor endpoints without external dependencies.
    """
    from http.server import HTTPServer, BaseHTTPRequestHandler
    from urllib.parse import urlparse

    class AdvisorHandler(BaseHTTPRequestHandler):
        def _set_headers(self, status=200):
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def do_OPTIONS(self):
            self._set_headers(204)

        def do_GET(self):
            parsed = urlparse(self.path)
            if parsed.path in ["/api/health", "/health"]:
                self._set_headers(200)
                payload = {
                    "status": "healthy",
                    "model": MODEL_NAME,
                    "service": "PHOENIX AI Advisor"
                }
                self.wfile.write(json.dumps(payload).encode("utf-8"))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Not Found"}).encode("utf-8"))

        def do_POST(self):
            parsed = urlparse(self.path)
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
            try:
                data = json.loads(body)
            except Exception:
                data = {}

            if parsed.path == "/api/explain-simulation":
                res = explain_markdown_decisions(data)
                self._set_headers(200)
                self.wfile.write(json.dumps({"explanation": res}).encode("utf-8"))
            elif parsed.path == "/api/explain-product":
                res = explain_product_markdown(data)
                self._set_headers(200)
                self.wfile.write(json.dumps({"explanation": res}).encode("utf-8"))
            elif parsed.path == "/api/shopper-deals":
                items = data if isinstance(data, list) else data.get("items", [])
                res = generate_shopper_deals(items)
                self._set_headers(200)
                self.wfile.write(json.dumps({"flyer": res}).encode("utf-8"))
            elif parsed.path == "/api/prioritize-risks":
                items = data if isinstance(data, list) else data.get("products", [])
                res = prioritize_inventory_risks(items)
                self._set_headers(200)
                self.wfile.write(json.dumps({"priorities": res}).encode("utf-8"))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

        def log_message(self, format, *args):
            # Quiet log for clean console
            pass

    server_address = ("", port)
    httpd = HTTPServer(server_address, AdvisorHandler)
    print(f"PHOENIX AI Advisor Server running on http://localhost:{port} with model '{MODEL_NAME}'")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down advisor server.")
        httpd.server_close()


if __name__ == "__main__":
    import sys
    if "--serve" in sys.argv:
        port = 5000
        for arg in sys.argv:
            if arg.startswith("--port="):
                port = int(arg.split("=")[1])
        run_standalone_server(port)
    else:
        print(f"PHOENIX AI Advisor Module ({MODEL_NAME})")
        print("Run with '--serve' to start the HTTP microservice.")
        print("Running internal health check...")
        test_stats = {
            "fixed_waste": 100,
            "markdown_waste": 40,
            "fixed_revenue": 10000,
            "markdown_revenue": 11500,
            "fixed_margin": 3000,
            "markdown_margin": 3400,
        }
        print("\nExplain Markdown Decisions Output:")
        print(explain_markdown_decisions(test_stats))

