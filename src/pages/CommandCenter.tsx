import { useState, useMemo, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Trash2,
  Percent,
  ShoppingCart,
  BarChart3,
  Sparkles,
  ArrowRight,
  Tags,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAppStore } from '../store/AppStore';
import { KpiCard } from '../components/KpiCard';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { LayoutDashboard } from 'lucide-react';
import { formatCurrency, formatPercent, formatDate, RISK_COLORS } from '../lib/utils';
import { aggregateByCategory } from '../lib/simulation';
import type { RiskLevel } from '../lib/types';
import { explainInventoryPriorities, type AIExplanationResult } from '../lib/ollama';

export function CommandCenter() {
  const { products, simulationResult, recommendations, navigateToPage, ollamaStatus } = useAppStore();

  const [aiBriefing, setAiBriefing] = useState<AIExplanationResult | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  const kpis = useMemo(() => {
    const totalProducts = products.length;
    const totalUnits = products.reduce((s, p) => s + p.availableStock, 0);
    const approachingExpiry = products.filter((p) => p.daysToExpiry <= 5 && p.daysToExpiry > 0).length;
    const highRisk = products.filter((p) => p.riskLevel === 'high' || p.riskLevel === 'critical').length;
    const pendingMarkdowns = recommendations.filter((r) => r.shouldDiscount).length;
    const expiredInventory = simulationResult.fixed.unitsExpired;
    const wasteRate = simulationResult.fixed.wasteRate;
    const smartWasteRate = simulationResult.smart.wasteRate;

    return {
      totalProducts,
      totalUnits,
      approachingExpiry,
      highRisk,
      pendingMarkdowns,
      fixedRevenue: simulationResult.fixed.revenue,
      smartRevenue: simulationResult.smart.revenue,
      fixedProfit: simulationResult.fixed.grossProfit,
      smartProfit: simulationResult.smart.grossProfit,
      expiredInventory,
      wasteRate,
      smartWasteRate,
      wasteReduction: simulationResult.wasteReduction,
      wasteAvoidedUnits: simulationResult.fixed.unitsExpired - simulationResult.smart.unitsExpired,
    };
  }, [products, simulationResult, recommendations]);

  const riskDistribution = useMemo(() => {
    const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    products.forEach((p) => counts[p.riskLevel]++);
    return (Object.keys(counts) as RiskLevel[]).map((k) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      key: k,
      value: counts[k],
    }));
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
        Revenue: Math.round(simulationResult.fixed.revenue),
        Profit: Math.round(simulationResult.fixed.grossProfit),
        Expired: simulationResult.fixed.unitsExpired,
      },
      {
        name: 'Smart Markdown',
        Revenue: Math.round(simulationResult.smart.revenue),
        Profit: Math.round(simulationResult.smart.grossProfit),
        Expired: simulationResult.smart.unitsExpired,
      },
    ];
  }, [simulationResult]);

  const categoryData = useMemo(() => {
    return aggregateByCategory(simulationResult.productResults, products).map((c) => ({
      name: c.category,
      Fixed: Math.round(c.fixedRevenue),
      Smart: Math.round(c.smartRevenue),
    }));
  }, [simulationResult, products]);

  const handleGenerateBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const res = await explainInventoryPriorities(products);
      setAiBriefing(res);
    } finally {
      setLoadingBriefing(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Command Center"
        subtitle="Operational command and dynamic pricing oversight for perishable inventory and food waste mitigation"
        icon={<LayoutDashboard className="w-5 h-5 text-blue-600" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateBriefing}
              disabled={loadingBriefing}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>Ollama Daily Briefing</span>
            </button>
          </div>
        }
      />

      {/* KPI Row 1: Inventory Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Monitored Products" value={String(kpis.totalProducts)} icon={Package} accent="blue" />
        <KpiCard label="Inventory Stock" value={`${kpis.totalUnits} units`} icon={ShoppingCart} accent="slate" />
        <KpiCard
          label="Approaching Expiry"
          value={String(kpis.approachingExpiry)}
          icon={Clock}
          accent="amber"
          subtitle="Expiry within 5 days"
        />
        <KpiCard
          label="High / Critical Risk"
          value={String(kpis.highRisk)}
          icon={ShieldAlert}
          accent="red"
          subtitle="At risk of spoilage"
        />
      </div>

      {/* KPI Row 2: Financial & Environmental Recovery */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Projected Revenue"
          value={formatCurrency(kpis.smartRevenue)}
          icon={DollarSign}
          accent="green"
          trend="up"
          trendValue={`${((kpis.smartRevenue / Math.max(kpis.fixedRevenue, 1) - 1) * 100).toFixed(1)}%`}
          trendLabel={`vs ${formatCurrency(kpis.fixedRevenue)} fixed`}
        />
        <KpiCard
          label="Gross Profit"
          value={formatCurrency(kpis.smartProfit)}
          icon={TrendingUp}
          accent="teal"
          trend="up"
          trendValue={`${((kpis.smartProfit / Math.max(kpis.fixedProfit, 1) - 1) * 100).toFixed(1)}%`}
          trendLabel={`vs ${formatCurrency(kpis.fixedProfit)} fixed`}
        />
        <KpiCard
          label="Fixed Waste Spoilage"
          value={`${kpis.expiredInventory} units`}
          icon={Trash2}
          accent="red"
          subtitle="Units lost under static pricing"
        />
        <KpiCard
          label="Waste Reduction"
          value={formatPercent(kpis.wasteReduction)}
          icon={Percent}
          accent="green"
          trend="down"
          trendValue={`${kpis.wasteAvoidedUnits} units saved`}
          trendLabel={`Smart: ${formatPercent(kpis.smartWasteRate)}`}
        />
      </div>

      {/* Quick Actions & Navigation Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigateToPage('markdown')}
          className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-200/80 p-4 rounded-xl hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg text-amber-700">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Review Markdowns ({kpis.pendingMarkdowns})</h4>
              <p className="text-xs text-slate-500">View pricing recommendations</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
        </div>

        <div
          onClick={() => navigateToPage('waste')}
          className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-200/80 p-4 rounded-xl hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-lg text-red-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Waste Risk Monitor ({kpis.highRisk})</h4>
              <p className="text-xs text-slate-500">Inspect near-expiry products</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
        </div>

        <div
          onClick={() => navigateToPage('simulator')}
          className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-200/80 p-4 rounded-xl hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg text-blue-700">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">What-If Simulator</h4>
              <p className="text-xs text-slate-500">Test pricing policies & elasticity</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      {/* AI Daily Briefing Panel */}
      {aiBriefing && (
        <Card
          title="Ollama Operational Daily Briefing"
          subtitle={`AI synthesis powered by local ${aiBriefing.model || 'llama3.2:1b'} • Verified inventory facts`}
          className="border-purple-200 bg-purple-50/20"
        >
          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-purple-100 shadow-xs">
            {aiBriefing.text}
          </div>
        </Card>
      )}

      {loadingBriefing && (
        <Card className="border-purple-200">
          <div className="py-6 flex flex-col items-center justify-center text-purple-700 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-xs font-semibold">Consulting Ollama for executive inventory briefing...</span>
          </div>
        </Card>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Inventory Risk Distribution" subtitle="Products categorized by expiration urgency">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                outerRadius={85}
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}`}
                labelLine={false}
              >
                {riskDistribution.map((entry) => (
                  <Cell key={entry.name} fill={RISK_COLORS[entry.key as RiskLevel]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Daily Revenue Comparison" subtitle="Daily revenue progression over simulation horizon ($)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={Math.ceil(dailyData.length / 10)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} />
              <Legend />
              <Area type="monotone" dataKey="fixed" name="Fixed Price Policy" stroke="#3b82f6" fill="#3b82f630" strokeWidth={2} />
              <Area type="monotone" dataKey="smart" name="Smart Markdown Policy" stroke="#10b981" fill="#10b98130" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Pricing Policy Financial & Spoilage Comparison" subtitle="Summary revenue, profit, and waste by strategy">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={strategyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: any) => typeof v === 'number' && v > 100 ? formatCurrency(v) : String(v ?? '')} />
              <Legend />
              <Bar dataKey="Revenue" fill="#3b82f6" name="Revenue ($)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit" fill="#10b981" name="Gross Profit ($)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expired" fill="#ef4444" name="Expired Waste (Units)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Revenue Performance by Category" subtitle="Fixed vs Smart Markdown across 6 perishable categories">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={95} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} />
              <Legend />
              <Bar dataKey="Fixed" fill="#3b82f6" name="Fixed Price" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Smart" fill="#10b981" name="Smart Markdown" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
