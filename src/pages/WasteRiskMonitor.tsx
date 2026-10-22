import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  Sparkles,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Sliders,
  CheckCircle,
  Flag,
} from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { RiskBadge, CategoryBadge } from '../components/Badges';
import { Select, TextInput } from '../components/Controls';
import { Modal } from '../components/Modal';
import { formatCurrency, formatDate, RISK_COLORS } from '../lib/utils';
import { CATEGORIES } from '../lib/data';
import type { Product, RiskLevel, MarkdownRecommendation } from '../lib/types';
import { explainInventoryPriorities, type AIExplanationResult } from '../lib/ollama';

export function WasteRiskMonitor() {
  const { products, settings, simulationResult, recommendations, navigateToPage } = useAppStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [prioritizedIds, setPrioritizedIds] = useState<Set<string>>(new Set());

  // Ollama priority advisor modal
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [aiPriorityResult, setAiPriorityResult] = useState<AIExplanationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const recMap = useMemo(() => {
    const map = new Map<string, MarkdownRecommendation>();
    recommendations.forEach((r) => map.set(r.productId, r));
    return map;
  }, [recommendations]);

  const productSimMap = useMemo(() => {
    const map = new Map<string, { fixed: number; smart: number }>();
    simulationResult.productResults.forEach((pr) => {
      map.set(pr.productId, { fixed: pr.fixedExpired, smart: pr.smartExpired });
    });
    return map;
  }, [simulationResult]);

  const grouped = useMemo(() => {
    const groups: Record<RiskLevel, Product[]> = { low: [], medium: [], high: [], critical: [] };
    products.forEach((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return;
      }
      if (categoryFilter && p.category !== categoryFilter) return;
      if (riskFilter && p.riskLevel !== riskFilter) return;
      groups[p.riskLevel].push(p);
    });
    return groups;
  }, [products, search, categoryFilter, riskFilter]);

  // Top products most likely to expire before they can be sold
  const topAtRiskProducts = useMemo(() => {
    return [...products]
      .map((p) => {
        const expectedDemand = p.dailyBaseDemand * Math.max(p.daysToExpiry, 0) * settings.demandMultiplier;
        const estUnsold = Math.max(0, p.availableStock - Math.round(expectedDemand));
        const rec = recMap.get(p.id);
        return {
          product: p,
          rec,
          expectedDemand,
          estUnsold,
          simExpired: productSimMap.get(p.id),
        };
      })
      .filter((item) => item.estUnsold > 0 || item.product.daysToExpiry <= 3)
      .sort((a, b) => b.estUnsold - a.estUnsold || a.product.daysToExpiry - b.product.daysToExpiry)
      .slice(0, 5);
  }, [products, settings, recMap, productSimMap]);

  const togglePrioritized = (id: string) => {
    setPrioritizedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenAiPriorities = async () => {
    setPriorityModalOpen(true);
    setAiLoading(true);
    try {
      const result = await explainInventoryPriorities(products);
      setAiPriorityResult(result);
    } finally {
      setAiLoading(false);
    }
  };

  const riskOrder: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
  const riskMeta: Record<RiskLevel, { title: string; desc: string }> = {
    critical: { title: 'Critical Risk', desc: 'Expiry <= 2 days or severe demand overhang — urgent action required' },
    high: { title: 'High Risk', desc: 'Expiry 3-5 days; stock significantly exceeds projected demand' },
    medium: { title: 'Medium Risk', desc: 'Expiry 6-10 days; moderate demand buffer, monitor closely' },
    low: { title: 'Low Risk', desc: 'Healthy shelf life and sales velocity — no immediate markdown needed' },
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Waste Risk Monitor"
        subtitle="Transparent expiry classification identifying products most likely to expire unsold before price intervention"
        icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
        actions={
          <button
            onClick={handleOpenAiPriorities}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>Ollama Priority Briefing</span>
          </button>
        }
      />

      {/* Summary banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {riskOrder.map((level) => (
          <div
            key={level}
            className="rounded-xl border p-4 shadow-xs"
            style={{
              borderColor: `${RISK_COLORS[level]}40`,
              backgroundColor: `${RISK_COLORS[level]}08`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{riskMeta[level].title}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{grouped[level].length}</p>
            <p className="text-xs text-slate-500 mt-0.5">{riskMeta[level].desc}</p>
          </div>
        ))}
      </div>

      {/* Top At-Risk Callout Card */}
      <Card
        title="Highest Waste Risk Items (Demand Overhang)"
        subtitle="Products with the highest projected unsold units at full price — prioritized for immediate markdown"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75">
                <th className="text-left px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase">Product</th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase">Risk</th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase">Stock</th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase">Days Left</th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase">Exp. Demand</th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase">Est. Unsold</th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase">Rec. Markdown</th>
                <th className="text-center px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase">Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {topAtRiskProducts.map(({ product: p, rec, expectedDemand, estUnsold }) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-[11px] text-slate-400">{p.category} • Expires {formatDate(p.expiryDate)}</p>
                  </td>
                  <td className="px-3 py-2.5"><RiskBadge level={p.riskLevel} /></td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-700">{p.availableStock}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <span className={`font-bold ${p.daysToExpiry <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                      {p.daysToExpiry}d
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{expectedDemand.toFixed(0)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600">
                    {estUnsold} units
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {rec?.shouldDiscount ? (
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(rec.recommendedPrice)}{' '}
                        <span className="text-[11px] text-amber-600">(-{rec.discountPercent.toFixed(0)}%)</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Full Price</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => navigateToPage('markdown', p.id)}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs inline-flex items-center gap-1"
                    >
                      <span>Review Markdown</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <TextInput value={search} onChange={setSearch} placeholder="Search products..." className="w-full pl-9" />
        </div>
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="All Categories"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <Select
          value={riskFilter}
          onChange={setRiskFilter}
          placeholder="All Risk Levels"
          options={[
            { value: 'critical', label: 'Critical Risk' },
            { value: 'high', label: 'High Risk' },
            { value: 'medium', label: 'Medium Risk' },
            { value: 'low', label: 'Low Risk' },
          ]}
        />
      </div>

      {/* Risk groups */}
      <div className="space-y-4">
        {riskOrder.map((level) => {
          const items = grouped[level];
          if (items.length === 0) return null;
          return (
            <Card key={level}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
                <h3 className="font-bold text-slate-800 text-sm">{riskMeta[level].title}</h3>
                <span className="text-xs text-slate-500">— {riskMeta[level].desc}</span>
                <span className="ml-auto text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                  {items.length} products
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 text-xs uppercase">Product</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase">Stock</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase">Days Left</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase">Exp. Demand</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase">Est. Unsold</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase">Sim Expired (Fix/Smart)</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase">Rec. Markdown</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 text-xs uppercase">Action</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-500 text-xs uppercase">Operate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => {
                      const expectedDemandBeforeExpiry = p.dailyBaseDemand * Math.max(p.daysToExpiry, 0) * settings.demandMultiplier;
                      const estUnsold = Math.max(0, p.availableStock - Math.round(expectedDemandBeforeExpiry));
                      const simExpired = productSimMap.get(p.id);
                      const rec = recMap.get(p.id);
                      const action = getRecommendedAction(p, estUnsold, rec);
                      const isPrioritized = prioritizedIds.has(p.id);

                      return (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-slate-700">{p.name}</p>
                            <p className="text-[11px] text-slate-400">{p.category} • Expires {formatDate(p.expiryDate)}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 font-medium">{p.availableStock}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            <span className={p.daysToExpiry <= 2 ? 'text-red-600 font-bold' : p.daysToExpiry <= 5 ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                              {p.daysToExpiry}d
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{expectedDemandBeforeExpiry.toFixed(0)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            <span className={estUnsold > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>
                              {estUnsold}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                            {simExpired ? (
                              <span>
                                <span className="text-red-600 font-semibold">{simExpired.fixed}</span>
                                <span className="text-slate-300 mx-1">/</span>
                                <span className="text-emerald-600 font-semibold">{simExpired.smart}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {rec?.shouldDiscount ? (
                              <span className="font-semibold text-blue-600 text-xs">
                                {formatCurrency(rec.recommendedPrice)} (-{rec.discountPercent.toFixed(0)}%)
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Full Price</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs font-semibold ${action.color}`}>{action.label}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => togglePrioritized(p.id)}
                                className={`p-1.5 rounded transition-colors ${
                                  isPrioritized ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-600'
                                }`}
                                title={isPrioritized ? 'Tagged for priority clearance' : 'Tag for priority clearance'}
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => navigateToPage('markdown', p.id)}
                                className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs transition-colors"
                                title="Open price recommendation in Smart Markdown Engine"
                              >
                                Price
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Priority Briefing Modal */}
      <Modal
        open={priorityModalOpen}
        onClose={() => setPriorityModalOpen(false)}
        title="Ollama Operational Risk Briefing"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs text-slate-500">
            <span>Synthesized by Ollama ({settings.demandMultiplier}x demand model)</span>
            <span className={`px-2 py-0.5 rounded font-medium ${aiPriorityResult?.source === 'ollama' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {aiPriorityResult?.source === 'ollama' ? 'Llama 3.2 1B Active' : 'Deterministic Fallback Engine'}
            </span>
          </div>

          {aiLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-purple-700 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <p className="text-sm font-medium">Generating store supervisor priority briefing...</p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs whitespace-pre-line text-slate-800 leading-relaxed font-sans max-h-96 overflow-y-auto">
              {aiPriorityResult?.text}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setPriorityModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function getRecommendedAction(
  product: Product,
  estUnsold: number,
  rec?: MarkdownRecommendation
): { label: string; color: string } {
  if (product.daysToExpiry <= 0) return { label: 'Remove from shelf immediately', color: 'text-red-700' };
  if (product.daysToExpiry <= 2 && estUnsold > 0) return { label: 'Critical Markdown (Max)', color: 'text-red-600' };
  if (rec?.shouldDiscount) return { label: `Apply ${rec.discountPercent.toFixed(0)}% Markdown`, color: 'text-amber-600' };
  if (estUnsold > product.availableStock * 0.25) return { label: 'Consider Markdown', color: 'text-amber-600' };
  return { label: 'Monitor Normal Velocity', color: 'text-emerald-600' };
}
