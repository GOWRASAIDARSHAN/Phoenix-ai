import { useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Trash2,
  Percent,
  ShoppingCart,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { useAppStore } from '../store/AppStore';
import { KpiCard } from '../components/KpiCard';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { LayoutDashboard } from 'lucide-react';
import { formatCurrency, formatPercent, formatDate, RISK_COLORS } from '../lib/utils';
import { aggregateByCategory } from '../lib/simulation';
import type { RiskLevel } from '../lib/types';

export function CommandCenter() {
  const { products, simulationResult } = useAppStore();

  const kpis = useMemo(() => {
    const totalProducts = products.length;
    const totalUnits = products.reduce((s, p) => s + p.initialStock, 0);
    const approachingExpiry = products.filter((p) => p.daysToExpiry <= 5 && p.daysToExpiry > 0).length;
    const highRisk = products.filter((p) => p.riskLevel === 'high' || p.riskLevel === 'critical').length;
    const expiredInventory = simulationResult.fixed.unitsExpired;
    const wasteRate = simulationResult.fixed.wasteRate;
    const smartWasteRate = simulationResult.smart.wasteRate;
    return {
      totalProducts,
      totalUnits,
      approachingExpiry,
      highRisk,
      fixedRevenue: simulationResult.fixed.revenue,
      smartRevenue: simulationResult.smart.revenue,
      fixedProfit: simulationResult.fixed.grossProfit,
      smartProfit: simulationResult.smart.grossProfit,
      expiredInventory,
      wasteRate,
      smartWasteRate,
      wasteReduction: simulationResult.wasteReduction,
    };
  }, [products, simulationResult]);

  const riskDistribution = useMemo(() => {
    const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    products.forEach((p) => counts[p.riskLevel]++);
    return (Object.keys(counts) as RiskLevel[]).map((k) => ({ name: k, value: counts[k] }));
  }, [products]);

  const dailyData = useMemo(() => {
    return simulationResult.dailyResults.map((d) => ({
      day: `Day ${d.day}`,
      date: formatDate(d.date),
      fixed: d.fixedRevenue,
      smart: d.smartRevenue,
    }));
  }, [simulationResult]);

  const strategyComparison = useMemo(() => {
    return [
      {
        name: 'Fixed Price',
        Revenue: simulationResult.fixed.revenue,
        Profit: simulationResult.fixed.grossProfit,
        Expired: simulationResult.fixed.unitsExpired,
      },
      {
        name: 'Smart Markdown',
        Revenue: simulationResult.smart.revenue,
        Profit: simulationResult.smart.grossProfit,
        Expired: simulationResult.smart.unitsExpired,
      },
    ];
  }, [simulationResult]);

  const categoryData = useMemo(() => {
    return aggregateByCategory(simulationResult.productResults, products).map((c) => ({
      name: c.category,
      Fixed: c.fixedRevenue,
      Smart: c.smartRevenue,
    }));
  }, [simulationResult, products]);

  return (
    <div>
      <PageHeader
        title="Command Center"
        subtitle="Real-time overview of inventory, revenue, and waste prevention performance"
        icon={<LayoutDashboard className="w-5 h-5" />}
      />

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <KpiCard label="Total Products" value={String(kpis.totalProducts)} icon={Package} accent="blue" />
        <KpiCard label="Inventory Units" value={String(kpis.totalUnits)} icon={ShoppingCart} accent="slate" />
        <KpiCard label="Approaching Expiry" value={String(kpis.approachingExpiry)} icon={AlertTriangle} accent="amber" subtitle="Within 5 days" />
        <KpiCard label="High-Risk Items" value={String(kpis.highRisk)} icon={AlertTriangle} accent="red" subtitle="High or critical risk" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="Est. Revenue (Smart)"
          value={formatCurrency(kpis.smartRevenue)}
          icon={DollarSign}
          accent="green"
          trend="up"
          trendValue={`${((kpis.smartRevenue / Math.max(kpis.fixedRevenue, 1) - 1) * 100).toFixed(1)}%`}
          trendLabel={`vs ${formatCurrency(kpis.fixedRevenue)} fixed`}
        />
        <KpiCard
          label="Gross Profit (Smart)"
          value={formatCurrency(kpis.smartProfit)}
          icon={TrendingUp}
          accent="teal"
          trend="up"
          trendValue={`${((kpis.smartProfit / Math.max(kpis.fixedProfit, 1) - 1) * 100).toFixed(1)}%`}
          trendLabel={`vs ${formatCurrency(kpis.fixedProfit)} fixed`}
        />
        <KpiCard
          label="Expired Inventory"
          value={String(kpis.expiredInventory)}
          icon={Trash2}
          accent="red"
          subtitle="Fixed-price policy"
        />
        <KpiCard
          label="Waste Reduction"
          value={formatPercent(kpis.wasteReduction)}
          icon={Percent}
          accent="green"
          trend="down"
          trendValue={`${formatPercent(kpis.smartWasteRate)} smart`}
          trendLabel={`vs ${formatPercent(kpis.wasteRate)} fixed`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Inventory Risk Distribution" subtitle="Products grouped by expiry risk level">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}`}
                labelLine={false}
              >
                {riskDistribution.map((entry) => (
                  <Cell key={entry.name} fill={RISK_COLORS[entry.name as RiskLevel]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Daily Revenue: Fixed vs Smart Markdown" subtitle="Revenue comparison over simulation horizon">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={Math.ceil(dailyData.length / 10)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Area type="monotone" dataKey="fixed" name="Fixed Price" stroke="#3b82f6" fill="#3b82f640" strokeWidth={2} />
              <Area type="monotone" dataKey="smart" name="Smart Markdown" stroke="#10b981" fill="#10b98140" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Pricing Strategy Comparison" subtitle="Revenue, profit, and expired units by policy">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={strategyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expired" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Revenue by Category" subtitle="Fixed vs smart markdown across product categories">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="Fixed" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Smart" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
