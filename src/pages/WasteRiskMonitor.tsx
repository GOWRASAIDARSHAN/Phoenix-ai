import { useState, useMemo } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { RiskBadge } from '../components/Badges';
import { Select, TextInput } from '../components/Controls';
import { formatCurrency, formatDate, RISK_COLORS } from '../lib/utils';
import { CATEGORIES } from '../lib/data';
import type { Product, RiskLevel } from '../lib/types';

export function WasteRiskMonitor() {
  const { products, settings, simulationResult } = useAppStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

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

  const productSimMap = useMemo(() => {
    const map = new Map<string, { fixed: number; smart: number }>();
    simulationResult.productResults.forEach((pr) => {
      map.set(pr.productId, { fixed: pr.fixedExpired, smart: pr.smartExpired });
    });
    return map;
  }, [simulationResult]);

  const riskOrder: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
  const riskMeta: Record<RiskLevel, { title: string; desc: string }> = {
    critical: { title: 'Critical Risk', desc: 'Expiry imminent or already expired — immediate action required' },
    high: { title: 'High Risk', desc: 'Significant risk of unsold inventory before expiry' },
    medium: { title: 'Medium Risk', desc: 'Monitor closely — may need markdown if demand slows' },
    low: { title: 'Low Risk', desc: 'Healthy shelf life and demand — no action needed' },
  };

  return (
    <div>
      <PageHeader
        title="Waste Risk Monitor"
        subtitle="Products grouped by expiry risk with expected demand, unsold quantity, and recommended actions"
        icon={<AlertTriangle className="w-5 h-5" />}
      />

      {/* Summary banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {riskOrder.map((level) => (
          <div
            key={level}
            className="rounded-xl border p-4"
            style={{
              borderColor: `${RISK_COLORS[level]}30`,
              backgroundColor: `${RISK_COLORS[level]}08`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
              <span className="text-sm font-semibold text-slate-700">{riskMeta[level].title}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{grouped[level].length}</p>
            <p className="text-xs text-slate-400">products</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
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
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' },
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
                <h3 className="font-semibold text-slate-800">{riskMeta[level].title}</h3>
                <span className="text-xs text-slate-400">— {riskMeta[level].desc}</span>
                <span className="ml-auto text-sm text-slate-500 font-medium">{items.length} products</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wider">Product</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wider">Stock</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wider">Days to Expiry</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wider">Exp. Demand</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wider">Est. Unsold</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wider">Sim Expired</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => {
                      const expectedDemandBeforeExpiry = p.dailyBaseDemand * Math.max(p.daysToExpiry, 0) * settings.demandMultiplier;
                      const estUnsold = Math.max(0, p.availableStock - expectedDemandBeforeExpiry);
                      const simExpired = productSimMap.get(p.id);
                      const action = getRecommendedAction(p, estUnsold);
                      return (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-slate-700">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.category} • Expires {formatDate(p.expiryDate)}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{p.availableStock}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            <span className={p.daysToExpiry <= 2 ? 'text-red-600 font-semibold' : p.daysToExpiry <= 5 ? 'text-amber-600 font-semibold' : 'text-slate-600'}>
                              {p.daysToExpiry}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{expectedDemandBeforeExpiry.toFixed(0)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            <span className={estUnsold > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
                              {estUnsold.toFixed(0)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {simExpired ? (
                              <span className="text-red-600 font-medium">
                                {simExpired.fixed} <span className="text-slate-300">/</span> <span className="text-emerald-600">{simExpired.smart}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs font-medium ${action.color}`}>{action.label}</span>
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

      <div className="mt-4 text-xs text-slate-400">
        <p>Sim Expired column shows <span className="text-red-600 font-medium">Fixed</span> / <span className="text-emerald-600 font-medium">Smart</span> expired units from the simulation. Inventory is counted as expired only when its expiry date is reached and it remains unsold — not before.</p>
      </div>
    </div>
  );
}

function getRecommendedAction(product: Product, estUnsold: number): { label: string; color: string } {
  if (product.daysToExpiry <= 0) return { label: 'Remove from shelf', color: 'text-red-600' };
  if (product.daysToExpiry <= 2 && estUnsold > 0) return { label: 'Immediate markdown (max discount)', color: 'text-red-600' };
  if (product.daysToExpiry <= 5 && estUnsold > 0) return { label: 'Apply markdown', color: 'text-amber-600' };
  if (estUnsold > product.availableStock * 0.3) return { label: 'Consider markdown', color: 'text-amber-600' };
  return { label: 'Monitor', color: 'text-emerald-600' };
}
