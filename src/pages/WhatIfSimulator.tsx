import { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  Trash2,
  ShoppingCart,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useAppStore } from '../store/AppStore';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Slider } from '../components/Controls';
import { DataTable } from '../components/DataTable';
import { CategoryBadge } from '../components/Badges';
import { formatCurrency, formatPercent, formatDate } from '../lib/utils';
import { explainSimulationResults, type AIExplanationResult } from '../lib/ollama';

export function WhatIfSimulator() {
  const { settings, setSettings, products, simulationResult } = useAppStore();

  const [aiAnalysis, setAiAnalysis] = useState<AIExplanationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const f = simulationResult.fixed;
  const s = simulationResult.smart;

  const revDiff = s.revenue - f.revenue;
  const revPctChange = f.revenue > 0 ? (revDiff / f.revenue) * 100 : 0;

  const profitDiff = s.grossProfit - f.grossProfit;
  const profitPctChange = f.grossProfit > 0 ? (profitDiff / f.grossProfit) * 100 : 0;

  const unitsSoldDiff = s.unitsSold - f.unitsSold;
  const expiredUnitsDiff = f.unitsExpired - s.unitsExpired;

  const comparisonData = useMemo(() => {
    return [
      { metric: 'Revenue ($)', Fixed: Math.round(f.revenue), Smart: Math.round(s.revenue) },
      { metric: 'Gross Profit ($)', Fixed: Math.round(f.grossProfit), Smart: Math.round(s.grossProfit) },
      { metric: 'Units Sold', Fixed: f.unitsSold, Smart: s.unitsSold },
      { metric: 'Expired (Waste)', Fixed: f.unitsExpired, Smart: s.unitsExpired },
    ];
  }, [f, s]);

  const cumulativeData = useMemo(() => {
    let fixedRev = 0, smartRev = 0, fixedExp = 0, smartExp = 0;
    return simulationResult.dailyResults.map((d) => {
      fixedRev += d.fixedRevenue;
      smartRev += d.smartRevenue;
      fixedExp += d.fixedExpired;
      smartExp += d.smartExpired;
      return {
        day: `Day ${d.day}`,
        date: formatDate(d.date),
        fixedRevenue: fixedRev,
        smartRevenue: smartRev,
        fixedExpired: fixedExp,
        smartExpired: smartExp,
      };
    });
  }, [simulationResult]);

  const initialInventory = Math.round(
    products.reduce((sum, p) => sum + p.initialStock * settings.initialInventoryMultiplier, 0),
  );

  const handleApplyPreset = (preset: 'balanced' | 'aggressive' | 'conservative' | 'baseline') => {
    if (preset === 'balanced') {
      setSettings({
        markdownAggressiveness: 0.5,
        markdownTiming: 5,
        minPriceFloor: 1.0,
      });
    } else if (preset === 'aggressive') {
      setSettings({
        markdownAggressiveness: 0.85,
        markdownTiming: 7,
        minPriceFloor: 0.85,
      });
    } else if (preset === 'conservative') {
      setSettings({
        markdownAggressiveness: 0.25,
        markdownTiming: 3,
        minPriceFloor: 1.1,
      });
    } else if (preset === 'baseline') {
      setSettings({
        markdownAggressiveness: 0.0,
        markdownTiming: 1,
        minPriceFloor: 1.0,
      });
    }
  };

  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const res = await explainSimulationResults(simulationResult);
      setAiAnalysis(res);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="What-If Simulator"
        subtitle="Test counterfactual retail pricing scenarios: compare baseline fixed-price policies against dynamic markdown strategies"
        icon={<SlidersHorizontal className="w-5 h-5 text-blue-600" />}
        actions={
          <button
            onClick={handleRunAiAnalysis}
            disabled={aiLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>Generate AI Strategy Analysis</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls panel */}
        <Card title="Simulation Parameters" subtitle="Adjust inputs to recalculate outcomes in real-time" className="lg:col-span-1">
          {/* Strategy Presets */}
          <div className="mb-5 pb-4 border-b border-slate-100">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Pricing Strategy Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('balanced')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                  settings.markdownAggressiveness === 0.5 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Balanced Dynamic
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('aggressive')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                  settings.markdownAggressiveness === 0.85 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Aggressive Clearance
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('conservative')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                  settings.markdownAggressiveness === 0.25 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Conservative Margin
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('baseline')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                  settings.markdownAggressiveness === 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Zero Markdown
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <Slider
              label="Markdown Aggressiveness"
              value={settings.markdownAggressiveness}
              onChange={(v) => setSettings({ markdownAggressiveness: v })}
              min={0}
              max={1}
              step={0.05}
              description="0 = fixed price, 1 = maximum 50% discount ramp"
            />
            <Slider
              label="Markdown Timing"
              value={settings.markdownTiming}
              onChange={(v) => setSettings({ markdownTiming: v })}
              min={1}
              max={14}
              step={1}
              suffix=" days"
              description="Days before expiry to initiate price cuts"
            />
            <Slider
              label="Minimum Selling Price Floor"
              value={settings.minPriceFloor}
              onChange={(v) => setSettings({ minPriceFloor: v })}
              min={0.5}
              max={1.5}
              step={0.05}
              suffix="x cost"
              description="Price floor bounded as multiple of unit procurement cost"
            />
            <Slider
              label="Demand Multiplier"
              value={settings.demandMultiplier}
              onChange={(v) => setSettings({ demandMultiplier: v })}
              min={0.3}
              max={2.0}
              step={0.05}
              suffix="x"
              description="Scales consumer baseline purchasing velocity"
            />
            <Slider
              label="Price Elasticity Scaling"
              value={settings.priceElasticity}
              onChange={(v) => setSettings({ priceElasticity: v })}
              min={0.5}
              max={2.0}
              step={0.1}
              suffix="x"
              description="Sensitivity of consumer purchase volume to price changes"
            />
            <Slider
              label="Initial Inventory Multiplier"
              value={settings.initialInventoryMultiplier}
              onChange={(v) => setSettings({ initialInventoryMultiplier: v })}
              min={0.5}
              max={2.0}
              step={0.1}
              suffix="x"
              description={`Starting units: ${initialInventory} across ${products.length} products`}
            />
            <Slider
              label="Simulation Duration"
              value={settings.horizon}
              onChange={(v) => setSettings({ horizon: Math.round(v) })}
              min={7}
              max={60}
              step={1}
              suffix=" days"
              description="Evaluation window for policy comparison"
            />
          </div>

          <div className="mt-5 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1">
            <p><span className="font-semibold text-slate-700">RNG Seed:</span> 42 (Mulberry32 deterministic)</p>
            <p><span className="font-semibold text-slate-700">Baseline Guarantee:</span> Both policies receive identical demand shocks</p>
            <p className="text-slate-400">All metrics recalculate dynamically on slider change.</p>
          </div>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Policy Delta Comparison Summary */}
          <Card title="Scenario Policy Comparison: Baseline vs Simulated Markdown">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <SimDeltaCard
                label="Simulated Revenue"
                value={formatCurrency(s.revenue)}
                baseline={formatCurrency(f.revenue)}
                delta={`${revPctChange >= 0 ? '+' : ''}${revPctChange.toFixed(1)}%`}
                positive={revDiff >= 0}
              />
              <SimDeltaCard
                label="Simulated Gross Profit"
                value={formatCurrency(s.grossProfit)}
                baseline={formatCurrency(f.grossProfit)}
                delta={`${profitPctChange >= 0 ? '+' : ''}${profitPctChange.toFixed(1)}%`}
                positive={profitDiff >= 0}
              />
              <SimDeltaCard
                label="Units Sold"
                value={String(s.unitsSold)}
                baseline={String(f.unitsSold)}
                delta={`${unitsSoldDiff >= 0 ? '+' : ''}${unitsSoldDiff} units`}
                positive={unitsSoldDiff >= 0}
              />
              <SimDeltaCard
                label="Expired Inventory"
                value={`${s.unitsExpired} units`}
                baseline={`${f.unitsExpired} units`}
                delta={`-${expiredUnitsDiff} units saved`}
                positive={expiredUnitsDiff >= 0}
              />
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-800">
              <div>
                <span className="font-bold">Waste Reduction:</span> {formatPercent(simulationResult.wasteReduction)} |
                <span className="font-bold ml-2">Waste Avoided:</span> {expiredUnitsDiff} units |
                <span className="font-bold ml-2">Gross Margin:</span> {formatPercent(s.grossMargin)} (vs {formatPercent(f.grossMargin)} fixed)
              </div>
              <span className="font-medium text-[11px] text-emerald-700">
                Discount Impact: {formatCurrency(simulationResult.discountImpact)}
              </span>
            </div>
          </Card>

          {/* AI Strategy Analysis Box */}
          {aiAnalysis && (
            <Card
              title="Ollama AI Strategy Analysis"
              subtitle={`Model: ${aiAnalysis.model || 'llama3.2:1b'} • Verified calculations only`}
              className="border-purple-200 bg-purple-50/30"
            >
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-purple-100">
                {aiAnalysis.text}
              </div>
            </Card>
          )}

          {aiLoading && (
            <Card className="border-purple-200">
              <div className="py-8 flex flex-col items-center justify-center text-purple-700 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-xs font-semibold">Generating economic strategy analysis with Ollama...</span>
              </div>
            </Card>
          )}

          {/* Comparison Bar Chart */}
          <Card title="Fixed-Price vs Smart Markdown Metrics">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => typeof v === 'number' && v > 100 ? formatCurrency(v) : String(v ?? '')} />
                <Legend />
                <Bar dataKey="Fixed" fill="#3b82f6" name="Fixed Baseline" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Smart" fill="#10b981" name="Smart Markdown" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Cumulative Line Chart */}
          <Card title="Cumulative Revenue & Waste Accumulation Over Time">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={Math.ceil(cumulativeData.length / 10)} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="fixedRevenue" name="Fixed Rev ($)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="smartRevenue" name="Smart Rev ($)" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="fixedExpired" name="Fixed Waste (Units)" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                <Line yAxisId="right" type="monotone" dataKey="smartExpired" name="Smart Waste (Units)" stroke="#059669" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Product Comparison Table */}
          <Card title="Product-Level Scenario Breakdown">
            <DataTable
              data={simulationResult.productResults}
              rowKey={(r) => r.productId}
              columns={[
                {
                  key: 'productName',
                  label: 'Product',
                  sortable: true,
                  sortValue: (r) => r.productName,
                  render: (r) => (
                    <div>
                      <p className="font-semibold text-slate-800">{r.productName}</p>
                      <p className="text-[10px] text-slate-400">{r.category}</p>
                    </div>
                  ),
                },
                {
                  key: 'fixedRevenue',
                  label: 'Fixed Rev',
                  sortable: true,
                  sortValue: (r) => r.fixedRevenue,
                  render: (r) => <span className="tabular-nums text-slate-600">{formatCurrency(r.fixedRevenue)}</span>,
                },
                {
                  key: 'smartRevenue',
                  label: 'Smart Rev',
                  sortable: true,
                  sortValue: (r) => r.smartRevenue,
                  render: (r) => <span className="tabular-nums font-semibold text-emerald-600">{formatCurrency(r.smartRevenue)}</span>,
                },
                {
                  key: 'fixedExpired',
                  label: 'Fixed Waste',
                  sortable: true,
                  sortValue: (r) => r.fixedExpired,
                  render: (r) => <span className="tabular-nums font-bold text-red-600">{r.fixedExpired}</span>,
                },
                {
                  key: 'smartExpired',
                  label: 'Smart Waste',
                  sortable: true,
                  sortValue: (r) => r.smartExpired,
                  render: (r) => (
                    <span className="tabular-nums font-bold text-emerald-600">
                      {r.smartExpired}{' '}
                      {r.fixedExpired > r.smartExpired && (
                        <span className="text-[10px] text-emerald-700">(-{r.fixedExpired - r.smartExpired})</span>
                      )}
                    </span>
                  ),
                },
                {
                  key: 'smartProfit',
                  label: 'Smart Profit',
                  sortable: true,
                  sortValue: (r) => r.smartProfit,
                  render: (r) => <span className="tabular-nums font-bold text-slate-800">{formatCurrency(r.smartProfit)}</span>,
                },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function SimDeltaCard({
  label,
  value,
  baseline,
  delta,
  positive,
}: {
  label: string;
  value: string;
  baseline: string;
  delta: string;
  positive: boolean;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-slate-200/60">
        <span className="text-slate-400 text-[10px]">Base: {baseline}</span>
        <span className={`font-semibold text-[11px] ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {delta}
        </span>
      </div>
    </div>
  );
}
