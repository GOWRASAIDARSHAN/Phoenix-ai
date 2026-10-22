# PHOENIX AI — Intelligent Waste Prevention and Dynamic Pricing System

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-wem9q7vs)

> **Save Food. Protect Profits. Build a Sustainable Future.**

---

## 1. Project Information

- **Project Name:** PHOENIX AI
- **Event:** NexAI Hack 2026
- **Institution:** Vellore Institute of Technology (VIT)
- **Track:** Track 4 — AI for Supply Chain & Logistics
- **Problem Statement:** PS 4.1 — Markdown Before Waste: Near-Expiry Pricing
- **Primary AI Model:** Ollama `llama3.2:1b` (Local edge LLM with deterministic fallback)

---

## 2. Project Overview

**PHOENIX AI** is an intelligent decision-support platform designed to help grocery supermarkets and retail managers identify perishable products at risk of expiring unsold and intervene with mathematically sound dynamic markdowns before waste occurs.

Food waste in retail grocery accounts for billions in lost revenue and excessive greenhouse gas emissions. Traditional fixed-price retail policies keep prices rigid until an item reaches its expiration date, resulting in severe spoilage write-offs. **PHOENIX AI** solves this by uniting:
1. **Deterministic Mathematical Pricing:** Strict algorithmic calculations guarantee price floors, demand elasticity, units sold, and non-negative gross margins.
2. **Local AI Advisor (Ollama `llama3.2:1b`):** Context-aware qualitative explanations that explain pricing trade-offs, generate shopper-friendly clearance flyers, and provide daily managerial briefings.
3. **Zero-Hallucination Fallback Architecture:** If Ollama is offline or times out, deterministic fallback logic ensures the platform remains 100% operational without missing numbers or broken states.

---

## 3. Technology Stack

- **Frontend Framework:** React 18 with TypeScript 5
- **Build Tool:** Vite 7 (with native reverse-proxy to Ollama)
- **Styling & UI:** Tailwind CSS, Lucide React icons
- **Data Visualizations:** Recharts (Area charts, Bar charts, Composed trend charts, Donut distributions)
- **AI / LLM Integration:** Local Ollama (`llama3.2:1b`) with Python advisor (`src/llm_advisor.py`) and TypeScript client (`src/lib/ollama.ts`)
- **Deterministic PRNG:** Mulberry32 pseudorandom generator for reproducible stochastic demand shocks (Seed: 42)
- **Testing:** Vitest for TypeScript unit tests; Python unittest suite for advisor verification
- **State Management:** Reactive React Context with LocalStorage persistence

---

## 4. The Seven Core Modules

PHOENIX AI organizes decision support into seven cohesive modules accessible via the responsive sidebar:

### 1. Command Center (`src/pages/CommandCenter.tsx`)
- Consolidated executive cockpit summarizing total products, available units, near-expiry count (≤ 5 days), and critical risk inventory.
- Real-time comparison of Projected Revenue, Gross Profit, and Landfill Waste Reduction vs. fixed-price baseline.
- **Interactive Quick-Action Cards:** Direct shortcuts to pending markdowns, risk monitors, and simulators.
- **Ollama Daily Briefing:** An AI-generated supervisor summary outlining top items requiring operational attention today.

### 2. Inventory Intelligence (`src/pages/InventoryIntelligence.tsx`)
- Detailed product-by-product inventory grid showing procurement cost, full retail price, live recommended price, remaining stock, expiry dates, and daily velocity.
- Multi-dimensional filters (Category, Risk Level, Shelf Life window, search query) and sortable columns.
- **Product Detail Modal:** Deep dive on expected sell-through horizon, demand overhang, and on-demand Ollama AI risk explanations.

### 3. Smart Markdown Engine (`src/pages/SmartMarkdownEngine.tsx`)
- Core pricing engine evaluating remaining shelf life, product category, inventory overhang, sales velocity, and unit cost floors.
- **Comprehensive Product Table:** Shows Original Price, Recommended Price, Discount %, Remaining Days, Available Stock, Expected Sold, Expected Unsold, Expected Revenue, and Estimated Profit.
- **Interactive Controls:** Aggressiveness slider, timing window selector, and minimum price floor ratio.
- **Custom Discount Override Modal:** Test custom discounts per product with automatic floor clamping.
- **Batch Application:** "Apply All Recommended Markdowns" button updating live store prices with one click.
- **Shopper Deals Flyer Modal:** AI-generated promotional flyer formatted for social media, store flyers, or community food rescue.

### 4. Waste Risk Monitor (`src/pages/WasteRiskMonitor.tsx`)
- Transparent rule-based classification into **Critical**, **High**, **Medium**, and **Low** risk based on sell-through velocity vs. remaining shelf life.
- **Highest Waste Risk Callout Table:** Surfaces items with the largest projected unsold units before expiry.
- **Priority Clearance Tagging:** Store managers can flag items for prioritized front-of-store merchandising.
- **Ollama Priority Briefing:** Synthesizes actionable steps for store associates.

### 5. What-If Simulator (`src/pages/WhatIfSimulator.tsx`)
- Counterfactual scenario testing engine comparing fixed baseline vs. dynamic markdown policies.
- **Strategy Presets:** Quick-select *Balanced Dynamic*, *Aggressive Clearance*, *Conservative Margin*, or *Zero Markdown*.
- **Adjustable Parameters:** Demand multiplier, price elasticity, initial inventory multiplier, markdown timing, price floor, and duration (7–60 days).
- **Delta KPI Cards:** Compares revenue before/after (% change), profit before/after (% change), and waste reduction.
- **AI Strategy Analysis:** Ollama explains trade-offs between unit margin sacrificed and spoil volume recovered.

### 6. Performance Analytics (`src/pages/PerformanceAnalytics.tsx`)
- In-depth financial audit verifying total inventory procurement value and potential retail value.
- Tracks cumulative revenue trends, cumulative expired units over time, category-level revenue, and category waste reduction.
- Explicit visual badges differentiating synthetic benchmark data from calculated estimates.

### 7. Assumptions & Methodology (`src/pages/AssumptionsMethodology.tsx`)
- Rigorous scientific documentation of synthetic dataset construction, constant-elasticity demand formulas, Knuth Poisson sampling, Mulberry32 PRNG seed reproducibility, and strict Ollama architectural boundaries.

---

## 5. Pricing & Simulation Methodology

### Markdown Pricing Formula
The smart markdown price $P_{smart}$ is calculated deterministically:
$$P_{smart} = \max\Big(\text{Cost} \times \text{FloorRatio},\; P_{orig} \times (1 - D)\Big)$$

Where discount fraction $D$ is bounded between $0$ and $0.50$ (max 50% discount) and computed as:
$$D = \min\Big(0.50,\; \text{Progress} \times \text{Aggressiveness} \times W_{category} \times W_{overhang}\Big)$$

1. **Progress:** Linearly ramps from $0.0$ at window entry to $1.0$ at expiration day:
   $$\text{Progress} = \max\Big(0,\; \min\Big(1,\; 1 - \frac{\text{DaysRemaining}}{\text{MarkdownTiming}}\Big)\Big)$$
2. **Category Weight ($W_{category}$):** Perishables with severe spoil risks receive elevated weights (Bakery: 1.20x, Meat: 1.15x, Packaged Fresh: 1.25x; Dairy: 1.0x).
3. **Inventory Overhang ($W_{overhang}$):** If stock exceeds expected baseline sales before expiry, discount scales to stimulate clearance velocity.
4. **Cost Floor:** Price is strictly constrained above $\text{UnitCost} \times \text{MinPriceFloor}$, preventing negative gross margin.

### Demand Elasticity Model
$$D(P) = \text{BaseDemand} \times \left(\frac{P}{P_{orig}}\right)^{(\epsilon \times S_{elasticity})} \times S_{demand}$$
Where $\epsilon$ is the product's price elasticity (e.g. -1.1 to -2.0).

### Financial Formulas
- **Revenue:** $\sum (\text{UnitsSold} \times P_{transacted})$
- **COGS:** $\sum (\text{UnitsSold} \times \text{UnitCost})$
- **Gross Profit:** $\text{Revenue} - \text{COGS}$
- **Gross Margin:** $(\text{Gross Profit} / \text{Revenue}) \times 100$
- **Waste Rate:** $(\text{ExpiredUnits} / \text{InitialInventory}) \times 100$
- **Waste Reduction (%):** $((\text{BaselineExpired} - \text{SmartExpired}) / \text{BaselineExpired}) \times 100$ (handles zero baseline safely as 0%).

---

## 6. Ollama AI Integration Architecture

PHOENIX AI integrates **Ollama** running the compact, high-efficiency **Llama 3.2 1B** model (`llama3.2:1b`).

```
┌────────────────────────────────────────────────────────┐
│                   PHOENIX AI Web UI                    │
│           (React 18 / TypeScript / Recharts)           │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       Calculated Facts           AI Text Prompts
                │                        │
                ▼                        ▼
┌──────────────────────────────┐  ┌──────────────────────┐
│  Deterministic Pricing &     │  │  Vite Reverse Proxy  │
│  Simulation Engines (TS/Py)  │  │   (/api/ollama)      │
└──────────────────────────────┘  └──────────┬───────────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │    Ollama Daemon     │
                                  │  (localhost:11434)   │
                                  │   [llama3.2:1b]      │
                                  └──────────┬───────────┘
                                             │
                                   Offline / Timeout / Error
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ Deterministic AI     │
                                  │ Fallback Engine      │
                                  └──────────────────────┘
```

### Strict Guardrails:
- **No LLM Hallucinated Math:** Prompts inject strictly pre-computed numbers as immutable verified facts. Prompts instruct the LLM: *"Do not recalculate any numbers. Do not swap values. Return exactly 3 concise bullet points."*
- **Offline Reliability:** If Ollama is offline or times out (15s abort controller), the UI automatically displays the deterministic fallback explanation and labels it clearly as **Fallback Engine**.
- **Python Integration:** `src/llm_advisor.py` provides standalone Python functions (`explain_markdown_decisions`, `generate_shopper_deals`, `explain_product_markdown`, `prioritize_inventory_risks`) and an optional HTTP microservice (`python src/llm_advisor.py --serve`).

---

## 7. Environment Variables

Create a `.env` file in the project root (copied from `.env.example`):

```bash
# Ollama Service Configuration
VITE_OLLAMA_BASE_URL=/api/ollama
VITE_OLLAMA_DIRECT_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.2:1b
```

---

## 8. Running the Application on Windows (PowerShell)

### Prerequisites
1. **Node.js** (v18 or newer; v24 recommended)
2. **Python** (v3.10 or newer)
3. **Ollama** (v0.4 or newer)

---

### Step 1: Install Ollama & Pull Llama 3.2 1B
In a PowerShell window:
```powershell
# 1. Verify Ollama is installed
ollama --version

# 2. Pull the Llama 3.2 1B model
ollama pull llama3.2:1b

# 3. Ensure the model is downloaded
ollama list
```
*(Ollama usually runs automatically in the Windows system tray at `http://localhost:11434`)*

---

### Step 2: Install Node Dependencies
In PowerShell, navigate to the project directory:
```powershell
cd D:\Downloads\Phoenix-ai-main\Phoenix-ai-main
npm install
```

---

### Step 3: Install Python Dependencies (for Advisor Scripts)
```powershell
python -m pip install ollama
```

---

### Step 4: Start Frontend Development Server
```powershell
npm run dev
```
Open your browser and navigate to:
```text
http://localhost:5173/
```
The Vite development server automatically proxies requests from `/api/ollama` to `http://127.0.0.1:11434`.

---

### Step 5 (Optional): Start Python Advisor Microservice
If you wish to run the standalone Python advisor server:
```powershell
python src/llm_advisor.py --serve
```
The advisor server starts on `http://localhost:5000`.

---

## 9. Running Tests

### 1. Run TypeScript Test Suite (Vitest)
Executes all 15 deterministic unit tests covering prices, discounts, floors, revenue, profit, sell-through, risk levels, simulations, and offline AI fallbacks:
```powershell
npm test
```

### 2. Run TypeScript Static Typecheck
Validates all types and interfaces with zero errors:
```powershell
npm run typecheck
```

### 3. Run Production Build
Verifies bundling and asset production:
```powershell
npm run build
```

### 4. Run Python Advisor Tests
Tests the Ollama advisor and fallback functions in Python:
```powershell
python src/test_advisor.py
```

---

## 10. Troubleshooting Steps

| Issue | Cause | Solution |
|---|---|---|
| **Ollama shows "Fallback Mode" in Sidebar** | Ollama daemon is not running or model not pulled | Run `ollama serve` in a terminal or check if Ollama is running in Windows system tray. Run `ollama pull llama3.2:1b`. |
| **CORS errors in browser** | Direct connection to 11434 blocked by browser | PHOENIX AI automatically uses Vite reverse proxy (`/api/ollama`). Ensure the dev server was started with `npm run dev`. |
| **TypeScript compile error on build** | Node modules cache or missing d.ts | Run `npm run typecheck` to verify all types pass. Run `npm install` if packages are missing. |
| **Python `ModuleNotFoundError: No module named 'ollama'`** | Python package not installed | Run `python -m pip install ollama`. |
| **Port 5173 already in use** | Another dev server is running | Stop the existing process or run `npx vite --port 5174`. |

---

## 11. Conclusion

**PHOENIX AI** provides an end-to-end, trustworthy system for near-expiry grocery pricing. By anchoring dynamic markdowns in rigorous deterministic mathematics and enhancing them with localized Ollama reasoning, retailers can protect gross margins while saving good food from the landfill.

**PHOENIX AI — Save Food. Protect Profits. Build a Sustainable Future.**
