import { useState, useMemo } from 'react';
import {
  PackageSearch,
  Search,
  X,
  Sparkles,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { RiskBadge, CategoryBadge } from '../components/Badges';
import { Modal } from '../components/Modal';
import { Select, TextInput } from '../components/Controls';
import { formatCurrency, formatDate, riskSortValue } from '../lib/utils';
import { CATEGORIES } from '../lib/data';
import type { Product, MarkdownRecommendation } from '../lib/types';
import { explainProductRecommendation, type AIExplanationResult } from '../lib/ollama';

export function InventoryIntelligence() {
  const { products, recommendations, navigateToPage, settings } = useAppStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [shelfLifeFilter, setShelfLifeFilter] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Recommendations lookup map
  const recMap = useMemo(() => {
    const map = new Map<string, MarkdownRecommendation>();
    recommendations.forEach((r) => map.set(r.productId, r));
    return map;
  }, [recommendations]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (riskFilter && p.riskLevel !== riskFilter) return false;
      if (shelfLifeFilter === 'critical' && p.daysToExpiry > 2) return false;
      if (shelfLifeFilter === 'imminent' && (p.daysToExpiry <= 2 || p.daysToExpiry > 5)) return false;
      if (shelfLifeFilter === 'moderate' && (p.daysToExpiry <= 5 || p.daysToExpiry > 10)) return false;
      if (shelfLifeFilter === 'safe' && p.daysToExpiry <= 10) return false;
      return true;
    });
  }, [products, search, categoryFilter, riskFilter, shelfLifeFilter]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory Intelligence"
        subtitle="Track stock levels, shelf-life velocity, demand forecasts, and real-time markdown status across all perishable items"
        icon={<PackageSearch className="w-5 h-5 text-blue-600" />}
      />

      <Card>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name or ID..."
              className="w-full pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
          <Select
            value={shelfLifeFilter}
            onChange={setShelfLifeFilter}
            placeholder="All Shelf Life"
            options={[
              { value: 'critical', label: '<= 2 days (Critical)' },
              { value: 'imminent', label: '3 - 5 days (Imminent)' },
              { value: 'moderate', label: '6 - 10 days' },
              { value: 'safe', label: '> 10 days (Safe)' },
            ]}
          />
          <span className="text-xs text-slate-400 ml-auto font-medium">
            {filtered.length} of {products.length} products
          </span>
        </div>

        <DataTable
          data={filtered}
          rowKey={(p) => p.id}
          onRowClick={setSelectedProduct}
          emptyMessage="No products match your filters"
          columns={[
            {
              key: 'id',
              label: 'ID',
              sortable: true,
              sortValue: (p) => p.id,
              render: (p) => <span className="font-mono text-xs text-slate-500">{p.id}</span>,
            },
            {
              key: 'name',
              label: 'Product Name',
              sortable: true,
              sortValue: (p) => p.name,
              render: (p) => (
                <div>
                  <p className="font-semibold text-slate-800 leading-tight">{p.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.category}</p>
                </div>
              ),
            },
            {
              key: 'category',
              label: 'Category',
              sortable: true,
              sortValue: (p) => p.category,
              render: (p) => <CategoryBadge category={p.category} />,
            },
            {
              key: 'availableStock',
              label: 'Avail. Stock',
              sortable: true,
              sortValue: (p) => p.availableStock,
              render: (p) => (
                <div className="text-right">
                  <span className="tabular-nums font-semibold text-slate-800">{p.availableStock}</span>
                  <span className="text-[10px] text-slate-400 block">init: {p.initialStock}</span>
                </div>
              ),
            },
            {
              key: 'originalPrice',
              label: 'Orig. Price',
              sortable: true,
              sortValue: (p) => p.originalPrice,
              render: (p) => <span className="tabular-nums text-slate-500">{formatCurrency(p.originalPrice)}</span>,
            },
            {
              key: 'recommendedPrice',
              label: 'Rec. Price',
              sortable: true,
              sortValue: (p) => recMap.get(p.id)?.recommendedPrice ?? p.originalPrice,
              render: (p) => {
                const rec = recMap.get(p.id);
                const hasDiscount = rec && rec.shouldDiscount;
                return (
                  <div className="text-right">
                    <span className={`tabular-nums font-bold ${hasDiscount ? 'text-blue-600' : 'text-slate-700'}`}>
                      {formatCurrency(rec?.recommendedPrice ?? p.originalPrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-[10px] font-bold text-amber-600 block">
                        -{rec.discountPercent.toFixed(0)}%
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'daysToExpiry',
              label: 'Days Left',
              sortable: true,
              sortValue: (p) => p.daysToExpiry,
              render: (p) => (
                <div className="text-right">
                  <span
                    className={`tabular-nums font-bold text-sm ${
                      p.daysToExpiry <= 2 ? 'text-red-600' : p.daysToExpiry <= 5 ? 'text-amber-600' : 'text-slate-600'
                    }`}
                  >
                    {p.daysToExpiry}d
                  </span>
                  <span className="text-[10px] text-slate-400 block">{formatDate(p.expiryDate)}</span>
                </div>
              ),
            },
            {
              key: 'dailyBaseDemand',
              label: 'Est. Demand',
              sortable: true,
              sortValue: (p) => p.dailyBaseDemand,
              render: (p) => {
                const totalProjDemand = p.dailyBaseDemand * Math.max(p.daysToExpiry, 1) * settings.demandMultiplier;
                return (
                  <div className="text-right">
                    <span className="tabular-nums font-medium text-slate-700">{p.dailyBaseDemand.toFixed(1)}/day</span>
                    <span className="text-[10px] text-slate-400 block">~{totalProjDemand.toFixed(0)} total</span>
                  </div>
                );
              },
            },
            {
              key: 'riskLevel',
              label: 'Waste Risk',
              sortable: true,
              sortValue: (p) => riskSortValue(p.riskLevel),
              render: (p) => <RiskBadge level={p.riskLevel} />,
            },
            {
              key: 'action',
              label: 'Recommended Action',
              render: (p) => {
                const rec = recMap.get(p.id);
                if (p.daysToExpiry <= 0) {
                  return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
                      Dispose / Write-Off
                    </span>
                  );
                }
                if (rec?.shouldDiscount) {
                  return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      Markdown ({rec.discountPercent.toFixed(0)}% Off)
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Retain Price
                  </span>
                );
              },
            },
          ]}
        />
      </Card>

      {/* Product Detail Modal */}
      <Modal
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name ?? ''}
        size="lg"
      >
        {selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            rec={recMap.get(selectedProduct.id)}
            onNavigateMarkdown={() => {
              const pid = selectedProduct.id;
              setSelectedProduct(null);
              navigateToPage('markdown', pid);
            }}
            onNavigateSimulator={() => {
              const pid = selectedProduct.id;
              setSelectedProduct(null);
              navigateToPage('simulator', pid);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function ProductDetail({
  product,
  rec,
  onNavigateMarkdown,
  onNavigateSimulator,
}: {
  product: Product;
  rec?: MarkdownRecommendation;
  onNavigateMarkdown: () => void;
  onNavigateSimulator: () => void;
}) {
  const { settings } = useAppStore();
  const [aiExplanation, setAiExplanation] = useState<AIExplanationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const expectedSellThroughDays = product.availableStock / Math.max(product.dailyBaseDemand, 0.1);
  const totalDemandAtOriginal = product.dailyBaseDemand * Math.max(product.daysToExpiry, 1) * settings.demandMultiplier;
  const overhang = Math.max(0, product.availableStock - Math.round(totalDemandAtOriginal));

  const handleAskOllama = async () => {
    if (!rec) return;
    setAiLoading(true);
    try {
      const result = await explainProductRecommendation(rec, product);
      setAiExplanation(result);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <RiskBadge level={product.riskLevel} />
          <CategoryBadge category={product.category} />
          <span className="font-mono text-xs text-slate-400 font-semibold">{product.id}</span>
        </div>
        <span className="text-xs text-slate-500">Expires: {formatDate(product.expiryDate)}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DetailItem label="Available Stock" value={`${product.availableStock} units`} />
        <DetailItem label="Procurement Cost" value={formatCurrency(product.unitCost)} />
        <DetailItem label="Original Price" value={formatCurrency(product.originalPrice)} />
        <DetailItem
          label="Recommended Price"
          value={formatCurrency(rec?.recommendedPrice ?? product.originalPrice)}
          highlight={rec?.shouldDiscount}
        />
        <DetailItem label="Remaining Shelf Life" value={`${product.daysToExpiry} days`} />
        <DetailItem label="Daily Base Demand" value={`${product.dailyBaseDemand.toFixed(1)} units/day`} />
        <DetailItem label="Sell-Through Time" value={`${expectedSellThroughDays.toFixed(1)} days`} />
        <DetailItem
          label="Estimated Overhang"
          value={`${overhang} units`}
          color={overhang > 0 ? 'text-amber-600' : 'text-emerald-600'}
        />
      </div>

      {/* Sell-through & Risk Analysis */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Sell-Through Diagnosis</h4>
        <div className="space-y-1.5 text-xs text-slate-700">
          <p>
            • At regular pricing velocity ({product.dailyBaseDemand.toFixed(1)} units/day), stock requires{' '}
            <span className="font-bold">{expectedSellThroughDays.toFixed(1)} days</span> to clear.
          </p>
          <p>
            • Actual remaining shelf life is <span className="font-bold">{product.daysToExpiry} days</span>.
          </p>
          {overhang > 0 ? (
            <p className="text-amber-700 font-medium">
              ⚠️ Demand deficit: ~{overhang} units will likely expire unsold without price intervention. Markdown of{' '}
              {rec?.discountPercent.toFixed(0)}% is recommended to increase daily sales velocity.
            </p>
          ) : (
            <p className="text-emerald-700 font-medium">
              ✓ Organic demand is sufficient to clear inventory prior to expiration date.
            </p>
          )}
        </div>
      </div>

      {/* Ollama AI Assistant Panel */}
      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Ollama AI Inventory Advisor</span>
          </div>
          {aiExplanation && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">
              {aiExplanation.source === 'ollama' ? 'Llama 3.2 1B' : 'Fallback Engine'}
            </span>
          )}
        </div>

        {aiLoading ? (
          <div className="py-4 flex items-center justify-center gap-2 text-xs text-purple-700">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Generating operational risk explanation...</span>
          </div>
        ) : aiExplanation ? (
          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-white p-3 rounded-lg border border-purple-100">
            {aiExplanation.text}
          </div>
        ) : (
          <p className="text-xs text-purple-700">
            Click below to generate an AI risk explanation outlining specific actions for this product.
          </p>
        )}

        {rec && (
          <button
            onClick={handleAskOllama}
            disabled={aiLoading}
            className="w-full py-2 px-3 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiExplanation ? 'Regenerate Explanation' : 'Explain Expiry Risk with Ollama'}</span>
          </button>
        )}
      </div>

      {/* Quick Navigation Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={onNavigateSimulator}
          className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span>Test in Simulator</span>
        </button>
        <button
          onClick={onNavigateMarkdown}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
        >
          <span>Open in Markdown Engine</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  color = 'text-slate-800',
  highlight = false,
}: {
  label: string;
  value: string;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-2.5 rounded-lg border ${highlight ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50 border-slate-200/80'}`}>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-xs font-bold ${highlight ? 'text-blue-700' : color}`}>{value}</p>
    </div>
  );
}
