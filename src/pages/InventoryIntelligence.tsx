import { useState, useMemo } from 'react';
import { PackageSearch, Search, X } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { RiskBadge, CategoryBadge } from '../components/Badges';
import { Modal } from '../components/Modal';
import { Select, TextInput } from '../components/Controls';
import { formatCurrency, formatDate } from '../lib/utils';
import { CATEGORIES } from '../lib/data';
import type { Product } from '../lib/types';

export function InventoryIntelligence() {
  const { products } = useAppStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (riskFilter && p.riskLevel !== riskFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter, riskFilter]);

  return (
    <div>
      <PageHeader
        title="Inventory Intelligence"
        subtitle="Interactive product inventory with search, filters, and detail views — synthetic data"
        icon={<PackageSearch className="w-5 h-5" />}
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
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
          />
          <span className="text-sm text-slate-400 ml-auto">
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
              label: 'Product',
              sortable: true,
              sortValue: (p) => p.name,
              render: (p) => <span className="font-medium text-slate-800">{p.name}</span>,
            },
            {
              key: 'category',
              label: 'Category',
              sortable: true,
              sortValue: (p) => p.category,
              render: (p) => <CategoryBadge category={p.category} />,
            },
            {
              key: 'initialStock',
              label: 'Init. Stock',
              sortable: true,
              sortValue: (p) => p.initialStock,
              render: (p) => <span className="tabular-nums">{p.initialStock}</span>,
            },
            {
              key: 'availableStock',
              label: 'Avail. Stock',
              sortable: true,
              sortValue: (p) => p.availableStock,
              render: (p) => <span className="tabular-nums">{p.availableStock}</span>,
            },
            {
              key: 'unitCost',
              label: 'Unit Cost',
              sortable: true,
              sortValue: (p) => p.unitCost,
              render: (p) => <span className="tabular-nums">{formatCurrency(p.unitCost)}</span>,
            },
            {
              key: 'originalPrice',
              label: 'Orig. Price',
              sortable: true,
              sortValue: (p) => p.originalPrice,
              render: (p) => <span className="tabular-nums">{formatCurrency(p.originalPrice)}</span>,
            },
            {
              key: 'currentPrice',
              label: 'Current Price',
              sortable: true,
              sortValue: (p) => p.currentPrice,
              render: (p) => <span className="tabular-nums font-medium">{formatCurrency(p.currentPrice)}</span>,
            },
            {
              key: 'expiryDate',
              label: 'Expiry',
              sortable: true,
              sortValue: (p) => p.expiryDate,
              render: (p) => <span className="text-xs">{formatDate(p.expiryDate)}</span>,
            },
            {
              key: 'daysToExpiry',
              label: 'Days Left',
              sortable: true,
              sortValue: (p) => p.daysToExpiry,
              render: (p) => (
                <span className={`tabular-nums font-medium ${p.daysToExpiry <= 2 ? 'text-red-600' : p.daysToExpiry <= 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                  {p.daysToExpiry}
                </span>
              ),
            },
            {
              key: 'riskLevel',
              label: 'Risk',
              sortable: true,
              sortValue: (p) => p.riskLevel,
              render: (p) => <RiskBadge level={p.riskLevel} />,
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
        {selectedProduct && <ProductDetail product={selectedProduct} />}
      </Modal>
    </div>
  );
}

function ProductDetail({ product }: { product: Product }) {
  const expectedSellThroughDays = product.availableStock / Math.max(product.dailyBaseDemand, 0.1);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <RiskBadge level={product.riskLevel} />
        <CategoryBadge category={product.category} />
        <span className="font-mono text-xs text-slate-400">{product.id}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <DetailItem label="Initial Stock" value={String(product.initialStock)} />
        <DetailItem label="Available Stock" value={String(product.availableStock)} />
        <DetailItem label="Unit Cost" value={formatCurrency(product.unitCost)} />
        <DetailItem label="Original Price" value={formatCurrency(product.originalPrice)} />
        <DetailItem label="Current Price" value={formatCurrency(product.currentPrice)} />
        <DetailItem label="Expiry Date" value={formatDate(product.expiryDate)} />
        <DetailItem label="Days to Expiry" value={String(product.daysToExpiry)} />
        <DetailItem label="Daily Base Demand" value={product.dailyBaseDemand.toFixed(1)} />
        <DetailItem label="Price Elasticity" value={product.priceElasticity.toFixed(1)} />
      </div>

      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Analysis</h4>
        <div className="space-y-1.5 text-sm text-slate-600">
          <p>Expected sell-through time: <span className="font-medium">{expectedSellThroughDays.toFixed(1)} days</span></p>
          <p>Days remaining: <span className="font-medium">{product.daysToExpiry} days</span></p>
          {expectedSellThroughDays > product.daysToExpiry ? (
            <p className="text-amber-600 font-medium">At current demand, stock will not sell through before expiry — markdown recommended.</p>
          ) : (
            <p className="text-emerald-600 font-medium">At current demand, stock should sell through before expiry.</p>
          )}
          <p className="text-xs text-slate-400 mt-2">This is synthetic data generated for demonstration purposes.</p>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
