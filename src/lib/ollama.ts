/**
 * PHOENIX AI — Ollama Integration Client
 * Connects to Ollama (default model: llama3.2:1b) with transparent
 * deterministic fallbacks and timeout protection.
 *
 * Calculations are strictly deterministic in TypeScript; the LLM provides
 * qualitative explanations without altering numerical facts.
 */

import type { Product, MarkdownRecommendation, SimulationResult, RiskLevel } from './types';
import { formatCurrency, formatPercent } from './utils';

export const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:1b';
const BASE_PROXY_URL = import.meta.env.VITE_OLLAMA_BASE_URL || '/api/ollama';
const DIRECT_URL = import.meta.env.VITE_OLLAMA_DIRECT_URL || 'http://localhost:11434';
const STANDALONE_SERVER_URL = 'http://localhost:5000';

export interface OllamaStatus {
  available: boolean;
  model: string;
  endpoint: string;
  error?: string;
  latencyMs?: number;
}

export interface AIExplanationResult {
  text: string;
  source: 'ollama' | 'fallback';
  model?: string;
  error?: string;
}

/**
 * Check if Ollama service is reachable and has the required model.
 */
export async function checkOllamaStatus(): Promise<OllamaStatus> {
  const startTime = Date.now();

  // Try Vite proxy first, then direct endpoint
  const candidateUrls = [
    `${BASE_PROXY_URL}/api/tags`,
    `${DIRECT_URL}/api/tags`,
    `${STANDALONE_SERVER_URL}/api/health`,
  ];

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const latencyMs = Date.now() - startTime;

        // Check if models list returned
        if (data.models && Array.isArray(data.models)) {
          const hasModel = data.models.some((m: { name: string }) =>
            m.name.toLowerCase().includes('llama3.2:1b') || m.name.toLowerCase().includes(OLLAMA_MODEL.toLowerCase())
          );
          return {
            available: true,
            model: hasModel ? OLLAMA_MODEL : data.models[0]?.name || OLLAMA_MODEL,
            endpoint: url.replace('/api/tags', ''),
            latencyMs,
          };
        }

        if (data.status === 'healthy') {
          return {
            available: true,
            model: data.model || OLLAMA_MODEL,
            endpoint: url.replace('/api/health', ''),
            latencyMs,
          };
        }

        return {
          available: true,
          model: OLLAMA_MODEL,
          endpoint: url.replace(/\/api\/(tags|health)/, ''),
          latencyMs,
        };
      }
    } catch {
      // Try next candidate
    }
  }

  return {
    available: false,
    model: OLLAMA_MODEL,
    endpoint: DIRECT_URL,
    error: 'Ollama is offline or unreachable on localhost:11434. Running in deterministic fallback mode.',
  };
}

/**
 * Send a prompt to Ollama with strict temperature and timeout.
 */
async function callOllama(prompt: string, timeoutMs = 15000): Promise<string | null> {
  const endpoints = [
    `${BASE_PROXY_URL}/api/generate`,
    `${DIRECT_URL}/api/generate`,
  ];

  for (const ep of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 250,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        const responseText = json.response?.trim();
        if (responseText) {
          return responseText;
        }
      }
    } catch {
      // Try next candidate endpoint
    }
  }

  return null;
}

// -------------------------------------------------------------
// 1. Markdown Strategy & Simulation Explanations
// -------------------------------------------------------------

export async function explainSimulationResults(sim: SimulationResult): Promise<AIExplanationResult> {
  const f = sim.fixed;
  const s = sim.smart;

  const wasteDiff = f.unitsExpired - s.unitsExpired;
  const revChange = s.revenue - f.revenue;
  const profitChange = s.grossProfit - f.grossProfit;
  const wasteRedPct = f.unitsExpired > 0 ? (wasteDiff / f.unitsExpired) * 100 : 0;

  const fallback = `### Markdown Decision Analysis (Deterministic Fallback)

- **Waste Prevention:** Fixed pricing wasted **${f.unitsExpired.toLocaleString()} units**, while dynamic markdown wasted **${s.unitsExpired.toLocaleString()} units** (${wasteRedPct.toFixed(1)}% waste reduction).
- **Revenue Realization:** Dynamic markdown earned **${formatCurrency(s.revenue)}** vs **${formatCurrency(f.revenue)}** under fixed pricing (${revChange >= 0 ? '+' : ''}${formatCurrency(revChange)} change).
- **Net Profitability:** Smart pricing generated **${formatCurrency(s.grossProfit)}** vs **${formatCurrency(f.grossProfit)}** fixed profit (${profitChange >= 0 ? '+' : ''}${formatCurrency(profitChange)} change), demonstrating that modest markdowns preserve margin while liquidating at-risk stock.`;

  const prompt = `You are a grocery retail economics advisor.
Explain the following VERIFIED simulation facts in exactly 3 concise Markdown bullet points.

Do not recalculate any numbers.
Do not swap fixed-price and markdown values.
Do not change the direction of any increase or decrease.

Verified facts:
1. Waste:
   Fixed-price waste = ${f.unitsExpired} units.
   Markdown waste = ${s.unitsExpired} units.
   Waste reduction = ${wasteRedPct.toFixed(1)}% (${wasteDiff} units saved from landfill).

2. Revenue:
   Fixed-price revenue = ${formatCurrency(f.revenue)}.
   Markdown revenue = ${formatCurrency(s.revenue)}.
   Revenue difference = ${formatCurrency(revChange)}.

3. Gross Profit:
   Fixed-price gross profit = ${formatCurrency(f.grossProfit)}.
   Markdown gross profit = ${formatCurrency(s.grossProfit)}.
   Profit difference = ${formatCurrency(profitChange)}.

Explain the trade-off between waste and margin in simple language. Treat the numbers above as authoritative. Return exactly 3 bullet points.`;

  try {
    const text = await callOllama(prompt);
    if (text) {
      return { text, source: 'ollama', model: OLLAMA_MODEL };
    }
  } catch (err: any) {
    return { text: fallback, source: 'fallback', error: err?.message };
  }

  return { text: fallback, source: 'fallback' };
}

// -------------------------------------------------------------
// 2. Individual Product Markdown Recommendation Explanation
// -------------------------------------------------------------

export async function explainProductRecommendation(
  rec: MarkdownRecommendation,
  product: Product
): Promise<AIExplanationResult> {
  const floor = rec.unitCost * 1.0;
  const unitMargin = rec.recommendedPrice - rec.unitCost;
  const expectedUnsold = Math.max(0, rec.availableStock - rec.expectedSales);

  const fallback = `### Pricing Rationale: ${rec.productName} (${rec.riskLevel.toUpperCase()} Risk)

- **Urgency & Inventory Overhang:** Has **${rec.daysToExpiry} day(s)** before expiration with **${rec.availableStock} units** in stock against normal daily demand of ${product.dailyBaseDemand.toFixed(1)} units/day.
- **Recommended Markdown:** A **${rec.discountPercent.toFixed(1)}% markdown** (from ${formatCurrency(rec.originalPrice)} to ${formatCurrency(rec.recommendedPrice)}) protects profitability by staying above the unit cost floor of ${formatCurrency(rec.unitCost)}, locking in ${formatCurrency(unitMargin)} margin per unit.
- **Projected Impact:** Expected to sell **~${rec.expectedSales.toFixed(0)} units** generating **${formatCurrency(rec.expectedRevenue)}** in revenue and **${formatCurrency(rec.expectedProfit)}** in profit, leaving only ~${expectedUnsold.toFixed(0)} unsold units.`;

  const prompt = `You are an expert grocery inventory pricing advisor.
Explain this product markdown recommendation in exactly 3 bullet points.

Verified facts:
- Product: ${rec.productName} (${rec.category})
- Days until expiry: ${rec.daysToExpiry}
- Available stock: ${rec.availableStock} units
- Original price: ${formatCurrency(rec.originalPrice)}
- Recommended price: ${formatCurrency(rec.recommendedPrice)} (${rec.discountPercent.toFixed(1)}% discount)
- Unit cost floor: ${formatCurrency(rec.unitCost)} (Unit margin: ${formatCurrency(unitMargin)})
- Expected sales after markdown: ${rec.expectedSales.toFixed(0)} units
- Projected unsold units: ${expectedUnsold.toFixed(0)} units
- Expiry risk level: ${rec.riskLevel.toUpperCase()}

Rules:
1. Do not invent or recalculate any numbers.
2. State why the discount is necessary given days left and stock.
3. Confirm that the price protects profitability by remaining above cost.
4. Conclude with the waste reduction benefit.
5. Exactly 3 concise bullet points.`;

  try {
    const text = await callOllama(prompt);
    if (text) {
      return { text, source: 'ollama', model: OLLAMA_MODEL };
    }
  } catch (err: any) {
    return { text: fallback, source: 'fallback', error: err?.message };
  }

  return { text: fallback, source: 'fallback' };
}

// -------------------------------------------------------------
// 3. Operational Risk Prioritization
// -------------------------------------------------------------

export async function explainInventoryPriorities(products: Product[]): Promise<AIExplanationResult> {
  const criticalItems = products
    .filter((p) => p.riskLevel === 'critical' || p.riskLevel === 'high')
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry || b.availableStock - a.availableStock)
    .slice(0, 4);

  const fallbackItems = criticalItems.map(
    (p) => `- **${p.name}** (${p.riskLevel.toUpperCase()}): ${p.daysToExpiry} day(s) to expiry, ${p.availableStock} units in stock.`
  );

  const fallback = `### Operational Priorities (Deterministic Fallback)

${fallbackItems.join('\n')}

**Key Action Steps:**
1. **Apply Dynamic Markdown Now:** Immediately mark down items with <= 2 days to trigger price elasticity and avoid total write-off.
2. **Promotional Merchandising:** Move near-expiry items to front-of-aisle "Quick-Sale / Save Food" bins.
3. **Food Rescue Contingency:** If clearance velocity is insufficient 24 hours prior to expiry, initiate donation dispatch.`;

  const prompt = `You are an inventory operations supervisor for a grocery supermarket.
Provide an operational priority briefing based on these urgent near-expiry items:
${JSON.stringify(criticalItems.map((p) => ({
    name: p.name,
    category: p.category,
    stock: p.availableStock,
    daysRemaining: p.daysToExpiry,
    risk: p.riskLevel,
  })), null, 2)}

Rules:
- List the top items needing immediate markdown execution.
- Recommend 3 practical actions store staff must take today.
- Keep concise and strictly grounded in the provided data.`;

  try {
    const text = await callOllama(prompt);
    if (text) {
      return { text, source: 'ollama', model: OLLAMA_MODEL };
    }
  } catch (err: any) {
    return { text: fallback, source: 'fallback', error: err?.message };
  }

  return { text: fallback, source: 'fallback' };
}

// -------------------------------------------------------------
// 4. Shopper-Friendly Deals Flyer
// -------------------------------------------------------------

export async function generateShopperDealsFlyer(
  recs: MarkdownRecommendation[]
): Promise<AIExplanationResult> {
  const discounted = recs.filter((r) => r.shouldDiscount).slice(0, 8);

  const fallbackLines = [
    "### Today's Near-Expiry Deals Flyer",
    "",
    "Save money on fresh quality groceries while helping prevent food waste!",
    "",
  ];

  discounted.forEach((r) => {
    fallbackLines.push(
      `- **${r.productName}** (${r.category}) — **${formatCurrency(r.recommendedPrice)}** (was ${formatCurrency(r.originalPrice)}, ${r.discountPercent.toFixed(0)}% OFF) • Best within ${r.daysToExpiry} day(s)`
    );
  });

  fallbackLines.push("", "Good food belongs on tables, not in bins. Pick up your deals today!");
  const fallback = fallbackLines.join('\n');

  if (discounted.length === 0) {
    return {
      text: "### Today's Near-Expiry Deals\n\nNo items currently require clearance discounting. All products have healthy shelf-life buffers.",
      source: 'fallback',
    };
  }

  const prompt = `You are a grocery store marketing assistant.
Create an appealing, concise Markdown flyer titled: "Today's Near-Expiry Deals".

Use ONLY the product information below:
${JSON.stringify(discounted.map((d) => ({
    name: d.productName,
    category: d.category,
    originalPrice: formatCurrency(d.originalPrice),
    discountedPrice: formatCurrency(d.recommendedPrice),
    discount: `${d.discountPercent.toFixed(0)}% off`,
    daysRemaining: d.daysToExpiry,
  })), null, 2)}

Rules:
- Preserve every product name, price, discount and days remaining exactly.
- Do not invent products or discounts.
- Friendly, positive tone encouraging food waste prevention.`;

  try {
    const text = await callOllama(prompt);
    if (text) {
      return { text, source: 'ollama', model: OLLAMA_MODEL };
    }
  } catch (err: any) {
    return { text: fallback, source: 'fallback', error: err?.message };
  }

  return { text: fallback, source: 'fallback' };
}

