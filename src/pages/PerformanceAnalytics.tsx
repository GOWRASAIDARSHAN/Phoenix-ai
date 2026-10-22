import { useMemo } from 'react';
import {
  BarChart3, DollarSign, TrendingUp, Percent, ShoppingCart, Trash2, Target, Layers,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart,
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
    };
  }, [simulationResult]);

  const dailyData = useMemo(() => {
    return simulationResult.dailyResults.map((d) => ({
      day: `Day ${d.day}`,
      fixedRevenue: d.fixedRevenue,
      smartRevenue: d.smartRevenue,
      fixedProfit: d.fixedRevenue - d.fixedUnitsSold * 0,
      smartProfit: d.smartRevenue,
      fixedCumulativeExpired: 0,
      smartCumulativeExpired: 0,
    }));
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
    <div>
      <PageHeader
        title="Performance Analytics"
        subtitle="Financial performance comparison: fixed-price vs smart-markdown policy"
        icon={<BarChart3 className="w-5 h-5" />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <KpiCard label="Revenue (Smart)" value={formatCurrency(kpis.smartRevenue)} icon={DollarSign} accent="green"
          trend="up" trendValue={`${((kpis.smartRevenue / Math.max(kpis.fixedRevenue, 1) - 1) * 100).toFixed(1)}%`}
          trendLabel={`Fixed: ${formatCurrency(kpis.fixedRevenue)}`} />
        <KpiCard label="Gross Profit (Smart)" value={formatCurrency(kpis.smartProfit)} icon={TrendingUp} accent="teal"
          trend="up" trendValue={`${((kpis.smartProfit / Math.max(kpis.fixedProfit, 1) - 1) * 100).toFixed(1)}%`}
          trendLabel={`Fixed: ${formatCurrency(kpis.fixedProfit)}`} />
        <KpiCard label="Gross Margin (Smart)" value={formatPercent(kpis.smartMargin)} icon={Percent} accent="blue"
          trend={kpis.smartMargin >= kpis.fixedMargin ? 'up' : 'down'}
          trendValue={`${(kpis.smartMargin - kpis.fixedMargin).toFixed(1)}pp`}
          trendLabel={`Fixed: ${formatPercent(kpis.fixedMargin)}`} />
        <KpiCard label="COGS (Smart)" value={formatCurrency(kpis.smartCogs)} icon={Layers} accent="slate"
          trendLabel={`Fixed: ${formatCurrency(kpis.fixedCogs)}`} />
        <KpiCard label="Units Sold (Smart)" value={String(kpis.smartUnits)} icon={ShoppingCart} accent="blue"
          trend="up" trendValue={`${kpis.smartUnits - kpis.fixedUnits}`}
          trendLabel={`Fixed: ${kpis.fixedUnits}`} />
        <KpiCard label="Units Expired (Smart)" value={String(kpis.smartExpired)} icon={Trash2} accent="red"
          trend="down" trendValue={`${((kpis.smartExpired / Math.max(kpis.fixedExpired, 1) - 1) * 100).toFixed(1)}%`}
          trendLabel={`Fixed: ${kpis.fixedExpired}`} />
        <KpiCard label="Waste Rate (Smart)" value={formatPercent(kpis.smartWasteRate)} icon={Percent} accent="amber"
          trend="down" trendValue={`${(kpis.smartWasteRate - kpis.fixedWasteRate).toFixed(1)}pp`}
          trendLabel={`Fixed: ${formatPercent(kpis.fixedWasteRate)}`} />
        <KpiCard label="Waste Reduction" value={formatPercent(kpis.wasteReduction)} icon={Target} accent="green"
          subtitle="Smart vs fixed baseline" />
      </div>

      {/* Discount impact note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-700">
        <span className="font-semibold">Discount Impact:</span> Smart markdown sacrificed {formatCurrency(kpis.discountImpact)} in per-unit revenue through discounts,
        but reduced expired waste by {kpis.fixedExpired - kpis.smartExpired} units. Net effect on gross profit: {formatCurrency(kpis.smartProfit - kpis.fixedProfit)}.
        <span className="block mt-1 text-blue-500">Note: Revenue is calculated using actual selling prices (post-discount). Discounts are not subtracted again from profit.</span>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Cumulative Revenue Trend" subtitle="Total revenue accumulated over simulation horizon">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={Math.ceil(cumulativeData.length / 10)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="fixedRevenue" name="Fixed Price" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="smartRevenue" name="Smart Markdown" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Cumulative Expired Units" subtitle="Waste accumulation over simulation horizon">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={Math.ceil(cumulativeData.length / 10)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="fixedExpired" name="Fixed Price" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="smartExpired" name="Smart Markdown" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Category Performance" subtitle="Revenue by category: fixed vs smart markdown">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData.map((c) => ({ name: c.category, Fixed: c.fixedRevenue, Smart: c.smartRevenue }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="Fixed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Smart" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Category Waste Reduction" subtitle="Expired units by category: fixed vs smart markdown">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData.map((c) => ({ name: c.category, Fixed: c.fixedExpired, Smart: c.smartExpired }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Fixed" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Smart" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Daily performance chart */}
      <Card title="Daily Performance Trends" subtitle="Daily revenue and units sold under both policies" className="mb-4">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={simulationResult.dailyResults.map((d) => ({
            day: `Day ${d.day}`,
            fixedRev: d.fixedRevenue,
            smartRev: d.smartRevenue,
            fixedSold: d.fixedUnitsSold,
            smartSold: d.smartUnitsSold,
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={Math.ceil(simulationResult.dailyResults.length / 10)} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="fixedRev" name="Fixed Revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="smartRev" name="Smart Revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="fixedSold" name="Fixed Units" stroke="#1e40af" strokeWidth={1.5} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="smartSold" name="Smart Units" stroke="#047857" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Product-level results */}
      <Card title="Product-Level Results" subtitle="Performance comparison for each product">
        <DataTable
          data={simulationResult.productResults}
          rowKey={(r) => r.productId}
          columns={[
            { key: 'productId', label: 'ID', render: (r) => <span className="font-mono text-xs text-slate-500">{r.productId}</span> },
            { key: 'productName', label: 'Product', sortable: true, sortValue: (r) => r.productName, render: (r) => <span className="font-medium text-slate-700">{r.productName}</span> },
            { key: 'category', label: 'Category', render: (r) => <span className="text-slate-500">{r.category}</span> },
            { key: 'fixedUnitsSold', label: 'Fixed Sold', sortable: true, sortValue: (r) => r.fixedUnitsSold, render: (r) => <span className="tabular-nums">{r.fixedUnitsSold}</span> },
            { key: 'smartUnitsSold', label: 'Smart Sold', sortable: true, sortValue: (r) => r.smartUnitsSold, render: (r) => <span className="tabular-nums font-medium text-emerald-600">{r.smartUnitsSold}</span> },
            { key: 'fixedExpired', label: 'Fixed Expired', sortable: true, sortValue: (r) => r.fixedExpired, render: (r) => <span className="tabular-nums text-red-600">{r.fixedExpired}</span> },
            { key: 'smartExpired', label: 'Smart Expired', sortable: true, sortValue: (r) => r.smartExpired, render: (r) => <span className="tabular-nums text-emerald-600">{r.smartExpired}</span> },
            { key: 'fixedProfit', label: 'Fixed Profit', sortable: true, sortValue: (r) => r.fixedProfit, render: (r) => <span className="tabular-nums">{formatCurrency(r.fixedProfit)}</span> },
            { key: 'smartProfit', label: 'Smart Profit', sortable: true, sortValue: (r) => r.smartProfit, render: (r) => <span className="tabular-nums font-medium text-emerald-600">{formatCurrency(r.smartProfit)}</span> },
          ]}
        />
      </Card>
    </div>
  );
}
