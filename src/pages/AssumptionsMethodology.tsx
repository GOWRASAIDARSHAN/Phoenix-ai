import { BookOpen, Database, TrendingDown, DollarSign, Clock, Package, Beaker, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { SIM_START_DATE, DEFAULT_SEED, DEFAULT_HORIZON } from '../lib/data';
import { OLLAMA_MODEL } from '../lib/ollama';

export function AssumptionsMethodology() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Assumptions & Methodology"
        subtitle="Complete scientific documentation of synthetic datasets, demand modeling, pricing formulas, and Ollama AI integration"
        icon={<BookOpen className="w-5 h-5 text-blue-600" />}
      />

      <div className="space-y-4">
        {/* Ollama Role Separation */}
        <Card title="Ollama AI Integration & System Boundary" icon={<Sparkles className="w-4 h-4 text-purple-600" />}>
          <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <p>
              PHOENIX AI enforces strict architectural separation between <strong>deterministic calculations</strong> and <strong>generative AI explanations</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Deterministic Financial Core:</strong> Every selling price, markdown discount, expected unit sale, remaining stock, revenue, gross profit, and waste rate is computed by deterministic TypeScript/Python mathematical engines. The language model is <em>never</em> permitted to invent, alter, or recalculate numerical outcomes.
              </li>
              <li>
                <strong>Ollama AI Advisor ({OLLAMA_MODEL}):</strong> The local LLM receives verified factual parameters and translates them into actionable managerial narratives: explaining why an item is at risk, contextualizing trade-offs between unit margin and spoilage avoidance, prioritizing daily store actions, and generating customer-facing clearance deals flyers.
              </li>
              <li>
                <strong>Deterministic Fallback Engine:</strong> If Ollama is offline, times out, or encounters an error, the system automatically falls back to rule-based deterministic text generators. The application remains fully functional without an active LLM connection.
              </li>
            </ul>
          </div>
        </Card>

        <Card title="Synthetic Data Generation" icon={<Database className="w-4 h-4 text-blue-600" />}>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              The application uses 24 synthetic perishable products across 6 retail grocery categories: <strong>Dairy, Bakery, Fruits, Vegetables, Meat, and Packaged Fresh</strong>.
              All product attributes — including stock quantities, unit costs, selling prices, expiry dates, daily base demand, and price elasticities — are
              parameterized to reflect realistic supermarket shelf-life dynamics.
            </p>
            <p>
              The simulation start date is fixed at <strong>{SIM_START_DATE.toISOString().split('T')[0]}</strong>. All expiry dates are calculated
              relative to this date. This ensures full reproducibility across reloads and runs.
            </p>
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 font-medium">
              ⚠️ Academic Demonstration Notice: All inventory records are synthetic. Waste reduction percentages and profit figures represent simulated policy outcomes and are not claimed as verified empirical data from live commercial deployments.
            </div>
          </div>
        </Card>

        <Card title="Demand Estimation & Elasticity Model" icon={<TrendingDown className="w-4 h-4 text-teal-600" />}>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              Each product possesses a <strong>daily base demand</strong> representing expected sales volume at original full retail price.
              Consumer price sensitivity is modeled using a constant-elasticity demand curve:
            </p>
            <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs text-slate-800 border border-slate-200">
              Expected Demand D(P) = BaseDemand × (P / OriginalPrice)<sup>(ProductElasticity × ElasticityMultiplier)</sup> × DemandMultiplier
            </div>
            <p>
              Price elasticity coefficients range from -1.1 (staple cheeses with lower sensitivity) to -2.0 (prepared sushi platters with high price responsiveness).
              Daily stochastic shocks are sampled using a Knuth Poisson approximation seeded via Mulberry32 PRNG (Seed: {DEFAULT_SEED}).
              Both the baseline fixed-price policy and the smart-markdown policy receive identical stochastic streams for fair comparison.
            </p>
          </div>
        </Card>

        <Card title="Smart Markdown Pricing Rules" icon={<DollarSign className="w-4 h-4 text-emerald-600" />}>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>The dynamic pricing engine computes markdowns using five deterministic factors:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong>Timing Window:</strong> Markdown evaluation is triggered only when remaining shelf life ≤ configured markdown timing (default: 5 days).</li>
              <li><strong>Shelf-Life Progression:</strong> Discount ramps progressively from 0% at window entry to maximum depth at expiry date.</li>
              <li><strong>Category Perishability Multiplier:</strong> High-risk categories with rapid bacterial spoilage (Meat: 1.15x, Bakery: 1.20x, Packaged Fresh: 1.25x) receive steeper discounts than durable goods.</li>
              <li><strong>Inventory Overhang Factor:</strong> Evaluates the ratio of available inventory to projected baseline demand. Products with substantial excess overhang receive higher incentives to accelerate clearance velocity.</li>
              <li><strong>Unit Cost Floor Constraint:</strong> Selling price is strictly bounded below by <code>UnitCost × MinPriceFloor</code> (default: 1.0x cost), preventing negative contribution margin on sold goods.</li>
            </ol>
          </div>
        </Card>

        <Card title="Waste Risk Classification Rules" icon={<AlertCircle className="w-4 h-4 text-amber-600" />}>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>Risk classification is calculated via transparent application logic based on the sell-through horizon:</p>
            <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs text-slate-800 border border-slate-200">
              Expected Sell-Through Days = AvailableStock / max(DailyBaseDemand, 0.1)
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Critical Risk:</strong> Days to expiry ≤ 0 (expired) OR days to expiry ≤ 2 OR expected sell-through days &gt; 1.5 × days to expiry.</li>
              <li><strong>High Risk:</strong> Days to expiry ≤ 5 OR expected sell-through days &gt; days to expiry.</li>
              <li><strong>Medium Risk:</strong> Days to expiry ≤ 10 days.</li>
              <li><strong>Low Risk:</strong> Days to expiry &gt; 10 days with healthy sell-through rate.</li>
            </ul>
          </div>
        </Card>

        <Card title="Inventory Movement & Expiry Accounting" icon={<Clock className="w-4 h-4 text-slate-600" />}>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <ul className="list-disc pl-5 space-y-1">
              <li>Both fixed and smart policies initialize with identical inventory quantities.</li>
              <li>Daily sales are capped at available stock: inventory quantities never become negative.</li>
              <li>When a product reaches 0 days remaining, all remaining unsold inventory is recorded as expired exactly once and removed from available stock.</li>
              <li>Unsold inventory is never counted as expired before its actual expiration date.</li>
            </ul>
          </div>
        </Card>

        <Card title="Financial Formulas" icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}>
          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
            <Formula label="Revenue" formula="Revenue = Σ (UnitsSold × ActualSellingPrice)" note="Uses post-discount transaction price." />
            <Formula label="COGS" formula="COGS = Σ (UnitsSold × UnitProcurementCost)" note="Cost of goods sold applies only to units actually transacted." />
            <Formula label="Gross Profit" formula="Gross Profit = Revenue − COGS" note="Excludes non-inventory operating expenses." />
            <Formula label="Gross Margin" formula="Gross Margin (%) = (Gross Profit / Revenue) × 100" note="Reported when revenue > 0." />
            <Formula label="Waste Rate" formula="Waste Rate (%) = (ExpiredUnits / TotalStartingInventory) × 100" note="Identical denominator used for both fixed and smart policies." />
            <Formula label="Waste Reduction" formula="Waste Reduction (%) = ((FixedExpired − SmartExpired) / FixedExpired) × 100" note="Evaluates to 0% if baseline waste is zero (prevents division by zero error)." />
            <Formula label="Markdown Investment" formula="Discount Impact = Σ (SmartUnitsSold × OriginalPrice) − SmartRevenue" note="Measures per-unit revenue conceded to stimulate liquidation velocity." />
          </div>
        </Card>

        <Card title="System Limitations">
          <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
            <ul className="list-disc pl-5 space-y-1">
              <li>Synthetic product demand is independent; cross-elasticity and product cannibalization are not modeled.</li>
              <li>Customer foot traffic does not include day-of-week seasonality or weather shocks.</li>
              <li>Financial outcomes model gross merchandise profit; store operational labor and disposal hauling fees are excluded.</li>
              <li>Dynamic pricing relies on accurate inventory counts and shelf-life tracking.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Formula({ label, formula, note }: { label: string; formula: string; note?: string }) {
  return (
    <div className="border-l-2 border-blue-400 pl-3 py-0.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="font-mono text-xs text-slate-800 mt-0.5 font-semibold">{formula}</p>
      {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
    </div>
  );
}
