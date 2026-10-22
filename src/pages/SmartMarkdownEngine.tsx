import { useState, useMemo, useEffect } from 'react';
import {
  Tags,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Search,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  Percent,
  Sliders,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { RiskBadge, CategoryBadge } from '../components/Badges';
import { Slider, Select, TextInput } from '../components/Controls';
import { Modal } from '../components/Modal';
import { formatCurrency, formatPercent } from '../lib/utils';
import { CATEGORIES } from '../lib/data';
import type { MarkdownRecommendation } from '../lib/types';
import {
  explainProductRecommendation,
  generateShopperDealsFlyer,
  type AIExplanationResult,
  OLLAMA_MODEL,
} from '../lib/ollama';

export function SmartMarkdownEngine() {
  const {
    products,
    recommendations,
    settings,
    setSettings,
    recalculate,
    isCalculating,
    applyPriceUpdate,
    applyAllRecommendedMarkdowns,
    selectedProductId,
    setSelectedProductId,
    navigateToPage,
    ollamaStatus,
  } = useAppStore();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);

  // AI Explanation State
  const [aiExplanations, setAiExplanations] = useState<Record<string, AIExplanationResult>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // Custom discount modal/state
  const [customDiscountProduct, setCustomDiscountProduct] = useState<MarkdownRecommendation | null>(null);
  const [customDiscountInput, setCustomDiscountInput] = useState<number>(0);

  // Deals Flyer Modal
  const [flyerModalOpen, setFlyerModalOpen] = useState(false);
  const [flyerContent, setFlyerContent] = useState<AIExplanationResult | null>(null);
  const [flyerLoading, setFlyerLoading] = useState(false);
  const [copiedFlyer, setCopiedFlyer] = useState(false);

  // Auto-expand row if navigated to from another module
  useEffect(() => {
    if (selectedProductId) {
      setExpandedRows((prev) => new Set(prev).add(selectedProductId));
    }
  }, [selectedProductId]);

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

  const filteredRecs = useMemo(() => {
    return recommendations
      .filter((r) => {
        if (search) {
          const q = search.toLowerCase();
          if (!r.productName.toLowerCase().includes(q) && !r.productId.toLowerCase().includes(q)) {
            return false;
          }
        }
        if (categoryFilter && r.category !== categoryFilter) return false;
        if (riskFilter && r.riskLevel !== riskFilter) return false;
        if (onlyDiscounted && !r.shouldDiscount) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.shouldDiscount !== b.shouldDiscount) return a.shouldDiscount ? -1 : 1;
        return b.discountPercent - a.discountPercent;
      });
  }, [recommendations, search, categoryFilter, riskFilter, onlyDiscounted]);

  const handleRequestAiExplanation = async (rec: MarkdownRecommendation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const product = products.find((p) => p.id === rec.productId);
    if (!product) return;

    setAiLoading((prev) => ({ ...prev, [rec.productId]: true }));
    try {
      const result = await explainProductRecommendation(rec, product);
      setAiExplanations((prev) => ({ ...prev, [rec.productId]: result }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [rec.productId]: false }));
    }
  };

  const handleGenerateFlyer = async () => {
    setFlyerModalOpen(true);
    setFlyerLoading(true);
    setCopiedFlyer(false);
    try {
      const result = await generateShopperDealsFlyer(recommendations);
      setFlyerContent(result);
    } finally {
      setFlyerLoading(false);
    }
  };

  const handleCopyFlyer = () => {
    if (flyerContent?.text) {
      navigator.clipboard.writeText(flyerContent.text);
      setCopiedFlyer(true);
      setTimeout(() => setCopiedFlyer(false), 2000);
    }
  };

  const openCustomDiscount = (rec: MarkdownRecommendation, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomDiscountProduct(rec);
    setCustomDiscountInput(Math.round(rec.discountPercent));
  };

  const applyCustomDiscount = () => {
    if (!customDiscountProduct) return;
    const original = customDiscountProduct.originalPrice;
    const floor = customDiscountProduct.floorPrice;
    const newPrice = Math.max(floor, Math.round(original * (1 - customDiscountInput / 100) * 100) / 100);
    applyPriceUpdate(customDiscountProduct.productId, newPrice);
    setCustomDiscountProduct(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Smart Markdown Engine"
        subtitle="Transparent, AI-assisted markdown recommendations balancing shelf-life urgency with retailer profitability"
        icon={<Tags className="w-5 h-5 text-blue-600" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateFlyer}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors shadow-sm"
              title="Generate customer-facing promotional flyer using Ollama"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Shopper Deals Flyer</span>
            </button>
            <button
              onClick={applyAllRecommendedMarkdowns}
              disabled={discountCount === 0}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply All ({discountCount})</span>
            </button>
            <button
              onClick={recalculate}
              disabled={isCalculating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
              <span>Recalculate</span>
            </button>
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">{recommendations.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Products Evaluated</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <p className="text-2xl font-bold text-amber-600">{discountCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Markdowns Recommended</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <p className="text-2xl font-bold text-emerald-600">{noDiscountCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Retain Full Price</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">
            {formatCurrency(
              recommendations.reduce(
                (sum, r) => sum + (r.shouldDiscount ? ((r.originalPrice - r.recommendedPrice) * r.expectedSales) : 0),
                0
              )
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Total Markdown Investment</p>
        </div>
      </div>

      {/* Config controls */}
      <Card
        title="Markdown Configuration"
        subtitle="Configure dynamic parameters: shelf-life thresholds, aggressive ramp rate, and cost floor protection"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Slider
            label="Markdown Aggressiveness"
            value={settings.markdownAggressiveness}
            onChange={(v) => setSettings({ markdownAggressiveness: v })}
            min={0}
            max={1}
            step={0.05}
            description="Controls depth of discount progression (0 = none, 1 = maximum)"
          />
          <Slider
            label="Markdown Timing Window"
            value={settings.markdownTiming}
            onChange={(v) => setSettings({ markdownTiming: v })}
            min={1}
            max={14}
            step={1}
            suffix=" days"
            description="Days before expiry date to initiate price evaluation"
          />
          <Slider
            label="Minimum Selling Price Floor"
            value={settings.minPriceFloor}
            onChange={(v) => setSettings({ minPriceFloor: v })}
            min={0.5}
            max={1.5}
            step={0.05}
            suffix="x unit cost"
            description="1.0x guarantees selling price never falls below unit procurement cost"
          />
        </div>
      </Card>

      {/* Filters and search */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder="Search by product name or ID..."
              className="w-full pl-9"
            />
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
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none px-2 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={onlyDiscounted}
              onChange={(e) => setOnlyDiscounted(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-xs">Markdowns only ({discountCount})</span>
          </label>
          <span className="text-xs text-slate-400 ml-auto font-medium">
            Showing {filteredRecs.length} of {recommendations.length} products
          </span>
        </div>

        {/* Recommendations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75">
                <th className="px-3 py-3 w-8"></th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Product</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Risk Level</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Days Left</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Stock</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Original</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Recommended</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Discount</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Exp. Sold</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Exp. Unsold</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Exp. Revenue</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Est. Profit</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecs.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-slate-400">
                    No products match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRecs.map((rec) => {
                  const expanded = expandedRows.has(rec.productId);
                  const isHighlighted = selectedProductId === rec.productId;
                  const explanation = aiExplanations[rec.productId];
                  const isLoadingAi = aiLoading[rec.productId];

                  return (
                    <tbody key={rec.productId} className={isHighlighted ? 'ring-2 ring-blue-500 rounded' : ''}>
                      <tr
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                          rec.shouldDiscount ? 'bg-amber-50/20' : ''
                        }`}
                        onClick={() => toggleRow(rec.productId)}
                      >
                        <td className="px-3 py-3 text-slate-400">
                          {expanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-800 leading-tight">{rec.productName}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{rec.productId} • {rec.category}</p>
                        </td>
                        <td className="px-3 py-3"><RiskBadge level={rec.riskLevel} /></td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span className={`font-semibold ${rec.daysToExpiry <= 2 ? 'text-red-600' : rec.daysToExpiry <= 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {rec.daysToExpiry}d
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700 font-medium">{rec.availableStock}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-500 line-through text-xs">
                          {formatCurrency(rec.originalPrice)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className={`tabular-nums font-bold ${rec.shouldDiscount ? 'text-blue-600' : 'text-slate-700'}`}>
                            {formatCurrency(rec.recommendedPrice)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {rec.shouldDiscount ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              -{rec.discountPercent.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700">{rec.expectedSales}</td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span className={rec.expectedUnsold > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
                            {rec.expectedUnsold}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700 font-medium">
                          {formatCurrency(rec.expectedRevenue)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-emerald-600">
                          {formatCurrency(rec.expectedProfit)}
                        </td>
                        <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => handleRequestAiExplanation(rec, e)}
                              disabled={isLoadingAi}
                              className="p-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
                              title="Ask Ollama for pricing rationale"
                            >
                              <Sparkles className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={(e) => openCustomDiscount(rec, e)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Set custom discount override"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            {rec.shouldDiscount && (
                              <button
                                onClick={() => applyPriceUpdate(rec.productId, rec.recommendedPrice)}
                                className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs border border-blue-200 transition-colors"
                                title="Apply this recommended price"
                              >
                                Apply
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Details Row */}
                      {expanded && (
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={13} className="px-6 py-5">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Left column: Mathematical Reasoning */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>Deterministic Pricing Rules</span>
                                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">Verified</span>
                                </h4>
                                <ul className="space-y-1.5 text-xs text-slate-600">
                                  {rec.reasons.map((reason, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-blue-500 font-bold">•</span>
                                      <span>{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                                <div className="pt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => navigateToPage('simulator', rec.productId)}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    <span>Simulate in What-If Simulator</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Middle column: Metrics Grid */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <DetailStat label="Sales Velocity" value={`${rec.salesVelocity.toFixed(1)} units/day`} />
                                <DetailStat label="Procurement Cost" value={formatCurrency(rec.unitCost)} />
                                <DetailStat label="Floor Price (Cost × Floor)" value={formatCurrency(rec.floorPrice)} />
                                <DetailStat label="Unit Margin at Markdown" value={formatCurrency(rec.recommendedPrice - rec.unitCost)} />
                                <DetailStat label="Expected Sell-Through" value={`${((rec.expectedSales / Math.max(rec.availableStock, 1)) * 100).toFixed(0)}%`} />
                                <DetailStat label="Waste Prevented" value={`${rec.expectedSales} units`} />
                              </div>

                              {/* Right column: Ollama AI Advisor Panel */}
                              <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="w-4 h-4 text-purple-600" />
                                      <span className="text-xs font-bold text-purple-900">Ollama AI Explanation</span>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                      explanation?.source === 'ollama' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {explanation?.source === 'ollama' ? `Ollama (${explanation.model})` : 'Deterministic Fallback'}
                                    </span>
                                  </div>

                                  {isLoadingAi ? (
                                    <div className="py-6 flex flex-col items-center justify-center text-xs text-purple-600 gap-2">
                                      <RefreshCw className="w-5 h-5 animate-spin" />
                                      <span>Consulting Llama 3.2 1B...</span>
                                    </div>
                                  ) : explanation ? (
                                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto pr-1">
                                      {explanation.text}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 py-3">
                                      Click "Generate AI Rationale" to have Ollama synthesize the trade-offs between markdown depth, margin retention, and spoil prevention.
                                    </p>
                                  )}
                                </div>

                                <button
                                  onClick={(e) => handleRequestAiExplanation(rec, e)}
                                  disabled={isLoadingAi}
                                  className="mt-3 w-full py-1.5 px-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>{explanation ? 'Regenerate AI Rationale' : 'Generate AI Rationale'}</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Custom Discount Modal */}
      <Modal
        open={!!customDiscountProduct}
        onClose={() => setCustomDiscountProduct(null)}
        title={`Custom Discount: ${customDiscountProduct?.productName}`}
        size="md"
      >
        {customDiscountProduct && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Test an override discount percentage for this product. Prices are automatically bounded above the unit cost floor of {formatCurrency(customDiscountProduct.floorPrice)}.
            </p>

            <Slider
              label="Discount Override"
              value={customDiscountInput}
              onChange={setCustomDiscountInput}
              min={0}
              max={60}
              step={1}
              suffix="%"
            />

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
              <div>
                <span className="text-slate-400">Original Price:</span>
                <p className="font-semibold text-slate-700">{formatCurrency(customDiscountProduct.originalPrice)}</p>
              </div>
              <div>
                <span className="text-slate-400">Effective New Price:</span>
                <p className="font-bold text-blue-600">
                  {formatCurrency(
                    Math.max(
                      customDiscountProduct.floorPrice,
                      customDiscountProduct.originalPrice * (1 - customDiscountInput / 100)
                    )
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCustomDiscountProduct(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={applyCustomDiscount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Save Price Override
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Shopper Deals Flyer Modal */}
      <Modal
        open={flyerModalOpen}
        onClose={() => setFlyerModalOpen(false)}
        title="Today's Near-Expiry Deals Flyer"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">
              Generated by Ollama ({OLLAMA_MODEL}) using verified markdown prices.
            </span>
            <button
              onClick={handleCopyFlyer}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
            >
              {copiedFlyer ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFlyer ? 'Copied!' : 'Copy Markdown'}</span>
            </button>
          </div>

          {flyerLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-sm">Synthesizing customer deals flyer with Ollama...</p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-96 overflow-y-auto font-sans text-sm whitespace-pre-line text-slate-800 leading-relaxed">
              {flyerContent?.text}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setFlyerModalOpen(false)}
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

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 shadow-xs">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}
