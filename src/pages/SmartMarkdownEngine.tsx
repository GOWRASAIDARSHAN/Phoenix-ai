import { useState, useMemo } from 'react';
import { Tags, RefreshCw, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { RiskBadge } from '../components/Badges';
import { Slider } from '../components/Controls';
import { formatCurrency } from '../lib/utils';
import type { MarkdownRecommendation } from '../lib/types';

export function SmartMarkdownEngine() {
  const { recommendations, settings, setSettings, recalculate, isCalculating } = useAppStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const discountCount = recommendations.filter((r) => r.shouldDiscount).length;
  const noDiscountCount = recommendations.length - discountCount;

  const sortedRecs = useMemo(() => {
    return [...recommendations].sort((a, b) => {
      if (a.shouldDiscount !== b.shouldDiscount) return a.shouldDiscount ? -1 : 1;
      return b.discountPercent - a.discountPercent;
    });
  }, [recommendations]);

  return (
    <div>
      <PageHeader
        title="Smart Markdown Engine"
        subtitle="AI-driven markdown recommendations balancing waste risk and profitability"
        icon={<Tags className="w-5 h-5" />}
        actions={
          <button
            onClick={recalculate}
            disabled={isCalculating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">{recommendations.length}</p>
          <p className="text-sm text-slate-500">Products Evaluated</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{discountCount}</p>
          <p className="text-sm text-slate-500">Markdowns Recommended</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{noDiscountCount}</p>
          <p className="text-sm text-slate-500">No Markdown Needed</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">
            {formatCurrency(recommendations.reduce((s, r) => s + (r.shouldDiscount ? r.discountPercent * r.expectedSales * r.originalPrice / 100 : 0), 0))}
          </p>
          <p className="text-sm text-slate-500">Total Discount Value</p>
        </div>
      </div>

      {/* Config controls */}
      <Card title="Markdown Configuration" subtitle="Adjust parameters and recalculate recommendations">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Slider
            label="Markdown Aggressiveness"
            value={settings.markdownAggressiveness}
            onChange={(v) => setSettings({ markdownAggressiveness: v })}
            min={0}
            max={1}
            step={0.05}
            description="Higher = deeper discounts applied faster"
          />
          <Slider
            label="Markdown Timing (days before expiry)"
            value={settings.markdownTiming}
            onChange={(v) => setSettings({ markdownTiming: v })}
            min={1}
            max={14}
            step={1}
            suffix=" days"
            description="Start markdown when within this many days of expiry"
          />
          <Slider
            label="Minimum Price Floor"
            value={settings.minPriceFloor}
            onChange={(v) => setSettings({ minPriceFloor: v })}
            min={0.5}
            max={1.5}
            step={0.05}
            suffix="x cost"
            description="1.0 = never below unit cost. Default = cost."
          />
        </div>
      </Card>

      {/* Recommendations table */}
      <div className="mt-4">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-3 w-8"></th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Product</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Risk</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Days Left</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Stock</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Current</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Recommended</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Discount</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Exp. Sales</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Exp. Profit</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecs.map((rec) => {
                  const expanded = expandedRows.has(rec.productId);
                  return (
                    <>
                      <tr
                        key={rec.productId}
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${rec.shouldDiscount ? 'bg-amber-50/30' : ''}`}
                        onClick={() => toggleRow(rec.productId)}
                      >
                        <td className="px-3 py-3 text-slate-400">
                          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-800">{rec.productName}</p>
                          <p className="text-xs text-slate-400">{rec.category}</p>
                        </td>
                        <td className="px-3 py-3"><RiskBadge level={rec.riskLevel} /></td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600">{rec.daysToExpiry}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600">{rec.availableStock}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600">{formatCurrency(rec.currentPrice)}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={`tabular-nums font-semibold ${rec.shouldDiscount ? 'text-blue-600' : 'text-slate-600'}`}>
                            {formatCurrency(rec.recommendedPrice)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {rec.shouldDiscount ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                              -{rec.discountPercent.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600">{rec.expectedSales.toFixed(0)}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-slate-700">{formatCurrency(rec.expectedProfit)}</td>
                      </tr>
                      {expanded && (
                        <tr key={`${rec.productId}-detail`} className="bg-slate-50">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recommendation Reasons</h4>
                                <ul className="space-y-1.5">
                                  {rec.reasons.map((reason, i) => (
                                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                      <span className="text-blue-500 mt-0.5">•</span>
                                      <span>{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <DetailStat label="Expected Demand" value={`${rec.expectedDemand.toFixed(0)} units`} />
                                <DetailStat label="Expected Sales" value={`${rec.expectedSales.toFixed(0)} units`} />
                                <DetailStat label="Expected Revenue" value={formatCurrency(rec.expectedRevenue)} />
                                <DetailStat label="Expected Profit" value={formatCurrency(rec.expectedProfit)} />
                                <DetailStat label="Unit Cost" value={formatCurrency(rec.unitCost)} />
                                <DetailStat label="Price Floor" value={formatCurrency(rec.unitCost * settings.minPriceFloor)} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-100">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
