import { useMemo } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Percent,
  ShoppingCart,
  Trash2,
  Target,
  Layers,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import { useAppStore } from '../store/AppStore';
import { KpiCard } from '../components/KpiCard';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { formatCurrency, formatPercent, formatDate } from '../lib/utils';
import { aggregateByCategory } from '../lib/simulation';

export function PerformanceAnalytics() {
  const { products, simulationResult } = useAppStore();

  const inventorySummary = useMemo(() => {
    const totalUnits = products.reduce((sum, p) => sum + p.availableStock, 0);
    const totalCostValue = products.reduce((sum, p) => sum + (p.availableStock * p.unitCost), 0);
    const totalRetailValue = products.reduce((sum, p) => sum + (p.availableStock * p.originalPrice), 0);
    const atRiskCount = products.filter((p) => p.riskLevel === 'critical' || p.riskLevel === 'high').length;
    return { totalUnits, totalCostValue, totalRetailValue, atRiskCount };
  }, [products]);

  const kpis = useMemo(() => {
    const f = simulationResult.fixed;
    const s = simulationResult.smart;
    return {
      fixedRevenue: f.revenue,
      smartRevenue: s.revenue,
      fixedCogs: f.cogs,
      smartCogs: s.cogs,
      fixedProfit: f.grossProfit,
      smartProfit: s.grossProfit,
      fixedMargin: f.grossMargin,
      smartMargin: s.grossMargin,
      fixedUnits: f.unitsSold,
      smartUnits: s.unitsSold,
      fixedExpired: f.unitsExpired,
      smartExpired: s.unitsExpired,
      fixedWasteRate: f.wasteRate,
      smartWasteRate: s.wasteRate,
      wasteReduction: simulationResult.wasteReduction,
      discountImpact: simulationResult.discountImpact,
      wasteAvoidedUnits: f.unitsExpired - s.unitsExpired,
    };
  }, [simulationResult]);

  const cumulativeData = useMemo(() => {
    let fixedRev = 0, smartRev = 0, fixedExp = 0, smartExp = 0, fixedSold = 0, smartSold = 0;
    return simulationResult.dailyResults.map((d) => {
      fixedRev += d.fixedRevenue;
      smartRev += d.smartRevenue;
      fixedExp += d.fixedExpired;
      smartExp += d.smartExpired;
      fixedSold += d.fixedUnitsSold;
      smartSold += d.smartUnitsSold;
      return {
        day: `Day ${d.day}`,
        date: formatDate(d.date),
        fixedRevenue: fixedRev,
        smartRevenue: smartRev,
        fixedExpired: fixedExp,
        smartExpired: smartExp,
        fixedUnitsSold: fixedSold,
        smartUnitsSold: smartSold,
      };
    });
  }, [simulationResult]);

  const categoryData = useMemo(() => {
    return aggregateByCategory(simulationResult.productResults, products);
  }, [simulationResult, products]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Performance Analytics"
        subtitle="Mathematical verification of economic recovery: comparing inventory liquidation, margins, and landfill diversion"
        icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
      />

      {/* Synthetic Data Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 text-xs text-amber-800">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Synthetic Simulation Benchmark:</span> The metrics below are deterministic calculations generated from a synthetic retail dataset of 24 perishable grocery lines for Hackathon evaluation. Calculations reflect direct pricing elasticity without confounding macroeconomic factors.
        </div>
      </div>

      {/* Inventory & Risk Overview Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Total Inventory Cost</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(inventorySummary.totalCostValue)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Procurement value ({inventorySummary.totalUnits} units)</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Potential Retail Value</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(inventorySummary.totalRetailValue)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">At original full price</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs bg-amber-50/20">
          <p className="text-xs uppercase tracking-wider font-bold text-amber-700">Products at High Risk</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{inventorySummary.atRiskCount}</p>
          <p className="text-[11px] text-amber-700/80 mt-0.5">Critical or High expiry risk</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs bg-emerald-50/20">
          <p className="text-xs uppercase tracking-wider font-bold text-emerald-700">Waste Avoided</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{kpis.wasteAvoidedUnits} units</p>
          <p className="text-[11px] text-emerald-700/80 mt-0.5">{formatPercent(kpis.wasteReduction)} reduction vs baseline</p>
        </div>
      </div>

      {/* Primary Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Simulated Revenue"
          value={formatCurrency(kpis.smartRevenue)}
          icon={DollarSign}
          accent="green"
          trend="up"
          trendValue={`${((kpis.smartRevenue / Math.max(kpis.fixedRevenue, 1) - 1) * 100).toFixed(1)}%`}
          trendLabel={`Fixed: ${formatCurrency(kpis.fixedRevenue)}`}
        />
        <KpiCard
          label="Gross Profit"
          value={formatCurrency(kpis.smartProfit)}
          icon={TrendingUp}
          accent="teal"
          trend="up"
          trendValue={`${((kpis.smartProfit / Math.max(kpis.fixedProfit, 1) - 1) * 100).toFixed(1)}%`}
          trendLabel={`Fixed: ${formatCurrency(kpis.fixedProfit)}`}
        />
        <KpiCard
          label="Gross Margin"
          value={formatPercent(kpis.smartMargin)}
          icon={Percent}
          accent="blue"
          trend={kpis.smartMargin >= kpis.fixedMargin ? 'up' : 'down'}
          trendValue={`${(kpis.smartMargin - kpis.fixedMargin).toFixed(1)}pp`}
          trendLabel={`Fixed: ${formatPercent(kpis.fixedMargin)}`}
        />
        <KpiCard
          label="COGS Incurred"
          value={formatCurrency(kpis.smartCogs)}
          icon={Layers}
          accent="slate"
          trendLabel={`Fixed: ${formatCurrency(kpis.fixedCogs)}`}
        />
        <KpiCard
          label="Units Sold"
          value={String(kpis.smartUnits)}
          icon={ShoppingCart}
          accent="blue"
          trend="up"
          trendValue={`+${kpis.smartUnits - kpis.fixedUnits}`}
          trendLabel={`Fixed: ${kpis.fixedUnits}`}
        />
        <KpiCard
          label="Expired Inventory"
          value={String(kpis.smartExpired)}
          icon={Trash2}
          accent="red"
          trend="down"
          trendValue={`-${kpis.wasteAvoidedUnits} units`}
          trendLabel={`Fixed: ${kpis.fixedExpired}`}
        />
        <KpiCard
          label="Waste Rate"
          value={formatPercent(kpis.smartWasteRate)}
          icon={Percent}
          accent="amber"
          trend="down"
          trendValue={`${(kpis.smartWasteRate - kpis.fixedWasteRate).toFixed(1)}pp`}
          trendLabel={`Fixed: ${formatPercent(kpis.fixedWasteRate)}`}
        />
        <KpiCard
          label="Waste Reduction"
          value={formatPercent(kpis.wasteReduction)}
          icon={Target}
          accent="green"
          subtitle="Landfill diversion rate"
        />
      </div>

      {/* Discount impact note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed shadow-xs">
        <p className="font-bold mb-1">Markdown Investment & Unit Economics:</p>
        <p>
          Dynamic markdown sacrificed <span className="font-bold">{formatCurrency(kpis.discountImpact)}</span> in nominal per-unit price reductions. However, by accelerating sell-through before expiry, the system liquidated <span className="font-bold">{kpis.wasteAvoidedUnits} units</span> that would otherwise have expired unsold.
          Net effect on retailer gross profit: <span className="font-bold text-emerald-700">+{formatCurrency(kpis.smartProfit - kpis.fixedProfit)}</span>.
        </p>
      </div>

      {/* Charts Row 1: Cumulative Revenue and Waste */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Cumulative Revenue Realization" subtitle="Total sales revenue accumulated across simulation horizon">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={Math.ceil(cumulativeData.length / 10)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} />
              <Legend />
              <Line type="monotone" dataKey="fixedRevenue" name="Fixed Price Policy" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="smartRevenue" name="Smart Markdown Policy" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Cumulative Waste Accumulation" subtitle="Spoiled inventory units written off upon reaching expiry">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={Math.ceil(cumulativeData.length / 10)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="fixedExpired" name="Fixed Price Waste" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="smartExpired" name="Smart Markdown Waste" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2: Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Category Revenue Performance" subtitle="Revenue generated across perishable categories ($)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData.map((c) => ({ name: c.category, Fixed: c.fixedRevenue, Smart: c.smartRevenue }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={45} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} />
              <Legend />
              <Bar dataKey="Fixed" name="Fixed Price" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Smart" name="Smart Markdown" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Category Spoilage Reduction" subtitle="Expired units by category (lower is better)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData.map((c) => ({ name: c.category, Fixed: c.fixedExpired, Smart: c.smartExpired }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={45} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Fixed" name="Fixed Spoilage" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Smart" name="Smart Spoilage" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Product-Level Table */}
      <Card title="Product-Level Financial & Waste Audit" subtitle="Granular accounting of unit sales, spoilage, and gross profits">
        <DataTable
          data={simulationResult.productResults}
          rowKey={(r) => r.productId}
          columns={[
            {
              key: 'productId',
              label: 'ID',
              render: (r) => <span className="font-mono text-xs text-slate-500">{r.productId}</span>,
            },
            {
              key: 'productName',
              label: 'Product',
              sortable: true,
              sortValue: (r) => r.productName,
              render: (r) => <span className="font-semibold text-slate-800">{r.productName}</span>,
            },
            {
              key: 'category',
              label: 'Category',
              render: (r) => <span className="text-xs text-slate-500">{r.category}</span>,
            },
            {
              key: 'fixedUnitsSold',
              label: 'Fixed Sold',
              sortable: true,
              sortValue: (r) => r.fixedUnitsSold,
              render: (r) => <span className="tabular-nums text-slate-600">{r.fixedUnitsSold}</span>,
            },
            {
              key: 'smartUnitsSold',
              label: 'Smart Sold',
              sortable: true,
              sortValue: (r) => r.smartUnitsSold,
              render: (r) => <span className="tabular-nums font-semibold text-emerald-600">{r.smartUnitsSold}</span>,
            },
            {
              key: 'fixedExpired',
              label: 'Fixed Spoil',
              sortable: true,
              sortValue: (r) => r.fixedExpired,
              render: (r) => <span className="tabular-nums font-bold text-red-600">{r.fixedExpired}</span>,
            },
            {
              key: 'smartExpired',
              label: 'Smart Spoil',
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
              key: 'fixedProfit',
              label: 'Fixed Profit',
              sortable: true,
              sortValue: (r) => r.fixedProfit,
              render: (r) => <span className="tabular-nums text-slate-600">{formatCurrency(r.fixedProfit)}</span>,
            },
            {
              key: 'smartProfit',
              label: 'Smart Profit',
              sortable: true,
              sortValue: (r) => r.smartProfit,
              render: (r) => <span className="tabular-nums font-bold text-emerald-600">{formatCurrency(r.smartProfit)}</span>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
