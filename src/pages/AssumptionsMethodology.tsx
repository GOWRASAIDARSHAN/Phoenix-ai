import { BookOpen, Database, TrendingDown, DollarSign, Clock, Package, Beaker, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { SIM_START_DATE, DEFAULT_SEED, DEFAULT_HORIZON } from '../lib/data';

export function AssumptionsMethodology() {
  return (
    <div>
      <PageHeader
        title="Assumptions & Methodology"
        subtitle="Documentation of synthetic data, simulation logic, and financial formulas"
        icon={<BookOpen className="w-5 h-5" />}
      />

      <div className="space-y-4">
        <Card title="Synthetic Data Generation" icon={<Database className="w-4 h-4" />}>
          <div className="prose prose-sm prose-slate max-w-none text-sm text-slate-600 space-y-2">
            <p>
              The application uses 24 synthetic perishable products across 6 categories: Dairy, Bakery, Fruits, Vegetables, Meat, and Packaged Fresh.
              All product attributes — including stock quantities, unit costs, selling prices, expiry dates, daily base demand, and price elasticities — are
              manually defined to be realistic and internally consistent.
            </p>
            <p>
              The simulation start date is fixed at <strong>{SIM_START_DATE.toISOString().split('T')[0]}</strong>. All expiry dates are calculated
              relative to this date. This ensures reproducibility across page reloads and simulation runs.
            </p>
            <p className="text-amber-600 font-medium">
              All data is synthetic and for demonstration purposes only. No real inventory, sales, or supplier data is used.
            </p>
          </div>
        </Card>

        <Card title="Demand Estimation Assumptions">
          <div className="text-sm text-slate-600 space-y-2">
            <p>
              Each product has a <strong>daily base demand</strong> representing expected units sold per day at the original selling price.
              Demand is not claimed to be derived from a trained machine-learning model. It uses transparent, rule-based assumptions.
            </p>
            <p>Demand is modeled using a constant-elasticity function:</p>
            <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm text-slate-700">
              D(price) = baseDemand × (price / originalPrice)<sup>elasticity</sup> × demandMultiplier
            </div>
            <p>
              Actual daily demand is sampled from a Poisson distribution centered on the expected demand, using a deterministic random seed for reproducibility.
              Both pricing policies receive identical demand shocks because they share the same seed.
            </p>
          </div>
        </Card>

        <Card title="Price Elasticity">
          <div className="text-sm text-slate-600 space-y-2">
            <p>
              Each product has its own price elasticity coefficient (all negative, ranging from -1.1 to -2.0). A more negative elasticity means demand
              is more responsive to price changes. The simulator's global "Price Elasticity" multiplier scales each product's base elasticity.
            </p>
            <p>
              Example: A product with elasticity -1.5 at 80% of original price sees demand increase by a factor of (0.8)<sup>-1.5</sup> ≈ 1.40 (40% more demand).
            </p>
          </div>
        </Card>

        <Card title="Markdown Rules">
          <div className="text-sm text-slate-600 space-y-2">
            <p>The smart markdown policy applies discounts based on:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Markdown Timing:</strong> Discounts begin only when a product is within the configured number of days before expiry (default: 5 days).</li>
              <li><strong>Markdown Aggressiveness:</strong> Controls how steeply discounts ramp up as expiry approaches. Range: 0 (no discount) to 1 (maximum 40% off).</li>
              <li><strong>Discount Progression:</strong> Discount ramps linearly from 0% at the start of the markdown window to the maximum at expiry.</li>
              <li><strong>Price Floor:</strong> The recommended price never falls below unit cost × minimum price floor (default: 1.0× cost).</li>
              <li><strong>No automatic discounting:</strong> Products with sufficient shelf life and healthy demand receive no markdown.</li>
            </ul>
          </div>
        </Card>

        <Card title="Expiry Logic">
          <div className="text-sm text-slate-600 space-y-2">
            <p>
              Each product has a fixed expiry date relative to the simulation start. On the day the product reaches expiry, any remaining unsold stock
              is recorded as expired units <strong>exactly once</strong>. The product is then marked as expired and cannot be sold on subsequent days.
            </p>
            <p className="font-medium text-slate-700">
              Inventory is only counted as expired when its expiry date has been reached and it remains unsold — not before.
              The same expired inventory is never counted twice.
            </p>
          </div>
        </Card>

        <Card title="Inventory Movement">
          <div className="text-sm text-slate-600 space-y-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>Both pricing policies start with identical initial stock (adjusted by the inventory multiplier).</li>
              <li>Daily demand is sampled and capped at available stock — stock never goes negative.</li>
              <li>Sales are recorded only for products that have not yet expired and have stock remaining.</li>
              <li>Each day, the simulation checks for expiry first, then processes sales for non-expired products.</li>
              <li>Daily prices, units sold, remaining stock, revenue, and expired units are tracked for both policies.</li>
            </ul>
          </div>
        </Card>

        <Card title="Financial Formulas">
          <div className="text-sm text-slate-600 space-y-3">
            <Formula label="Revenue" formula="Revenue = Σ (units sold × actual selling price)" />
            <Formula label="COGS" formula="COGS = Σ (units sold × unit cost)" />
            <Formula label="Gross Profit" formula="Gross Profit = Revenue − COGS" />
            <Formula label="Gross Margin" formula="Gross Margin = (Gross Profit / Revenue) × 100, when Revenue > 0" />
            <Formula label="Waste Rate" formula="Waste Rate = (Expired units / Total initial inventory) × 100" note="Denominator = sum of initial stock across all products. Same denominator used for both policies." />
            <Formula label="Waste Reduction" formula="Waste Reduction = ((Baseline expired − Smart expired) / Baseline expired) × 100" note="When baseline is zero, waste reduction is reported as 0% (no division error)." />
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-xs">
              <strong>Important:</strong> Revenue is calculated using actual selling prices (post-discount). Discounts reduce revenue at the point of sale
              and are NOT subtracted again when computing gross profit. Gross profit is NOT net profit — it excludes operating expenses, taxes, and other costs.
            </div>
          </div>
        </Card>

        <Card title="Simulation Duration">
          <div className="text-sm text-slate-600 space-y-2">
            <p>
              Default simulation horizon: <strong>{DEFAULT_HORIZON} days</strong>. Configurable from 7 to 60 days via the What-If Simulator.
              Product expiry dates are handled relative to the fixed simulation start date ({SIM_START_DATE.toISOString().split('T')[0]}).
            </p>
          </div>
        </Card>

        <Card title="Random Seed & Reproducibility">
          <div className="text-sm text-slate-600 space-y-2">
            <p>
              The simulation uses a Mulberry32 pseudorandom number generator seeded with <strong>{DEFAULT_SEED}</strong>.
              Both the fixed-price and smart-markdown policies use independent RNG instances initialized with the same seed,
              ensuring they receive identical demand shocks. This makes results fully reproducible: the same parameters always produce the same output.
            </p>
          </div>
        </Card>

        <Card title="Limitations">
          <div className="text-sm text-slate-600 space-y-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>Demand is modeled with simple constant-elasticity assumptions, not a trained ML model.</li>
              <li>No seasonality, day-of-week effects, or promotional cross-effects are modeled.</li>
              <li>Customer behavior is simplified — no stockout substitution or brand loyalty effects.</li>
              <li>All products are independent — no cannibalization or complementarity between products.</li>
              <li>Markdown recommendations are heuristic — they do not guarantee optimal outcomes or zero waste.</li>
              <li>Financial figures exclude operating costs, taxes, shrinkage, and logistics — gross profit only.</li>
              <li>Synthetic data may not reflect real-world product variability or market conditions.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Formula({ label, formula, note }: { label: string; formula: string; note?: string }) {
  return (
    <div className="border-l-2 border-blue-300 pl-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="font-mono text-sm text-slate-800 mt-0.5">{formula}</p>
      {note && <p className="text-xs text-slate-400 mt-0.5">{note}</p>}
    </div>
  );
}
