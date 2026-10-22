import { useMemo } from 'react';
import { SlidersHorizontal, Play } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts';
import { useAppStore } from '../store/AppStore';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Slider } from '../components/Controls';
import { DataTable } from '../components/DataTable';
import { formatCurrency, formatPercent, formatDate } from '../lib/utils';

export function WhatIfSimulator() {
  const { settings, setSettings, products, simulationResult } = useAppStore();

  const comparisonData = useMemo(() => {
    const f = simulationResult.fixed;
    const s = simulationResult.smart;
    return [
      { metric: 'Revenue', Fixed: f.revenue, Smart: s.revenue },
      { metric: 'COGS', Fixed: f.cogs, Smart: s.cogs },
      { metric: 'Gross Profit', Fixed: f.grossProfit, Smart: s.grossProfit },
      { metric: 'Units Sold', Fixed: f.unitsSold, Smart: s.unitsSold },
      { metric: 'Units Expired', Fixed: f.unitsExpired, Smart: s.unitsExpired },
    ];
  }, [simulationResult]);

  const cumulativeData = useMemo(() => {
    let fixedRev = 0, smartRev = 0, fixedExp = 0, smartExp = 0;
    return simulationResult.dailyResults.map((d) => {
      fixedRev += d.fixedRevenue;
      smartRev += d.smartRevenue;
      fixedExp += d.fixedExpired;
      smartExp += d.smartExpired;
      return {
        day: `Day ${d.day}`,
        date: formatDate(d.date),
        fixedRevenue: fixedRev,
        smartRevenue: smartRev,
        fixedExpired: fixedExp,
        smartExpired: smartExp,
      };
    });
  }, [simulationResult]);

  const initialInventory = Math.round(
    products.reduce((s, p) => s + p.initialStock * settings.initialInventoryMultiplier, 0),
  );

  return (
    <div>
      <PageHeader
        title="What-If Simulator"
        subtitle="Adjust parameters and run simulations to compare fixed-price vs smart-markdown policies"
        icon={<SlidersHorizontal className="w-5 h-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls panel */}
        <Card title="Simulation Parameters" className="lg:col-span-1">
          <div className="space-y-5">
            <Slider
              label="Initial Inventory Multiplier"
              value={settings.initialInventoryMultiplier}
              onChange={(v) => setSettings({ initialInventoryMultiplier: v })}
              min={0.5}
              max={2}
              step={0.1}
              suffix="x"
              description={`Total starting units: ${initialInventory}`}
            />
            <Slider
              label="Demand Multiplier"
              value={settings.demandMultiplier}
              onChange={(v) => setSettings({ demandMultiplier: v })}
              min={0.3}
              max={2}
              step={0.05}
              suffix="x"
              description="Scales base daily demand for all products"
            />
            <Slider
              label="Price Elasticity"
              value={settings.priceElasticity}
              onChange={(v) => setSettings({ priceElasticity: v })}
              min={0.5}
              max={2}
              step={0.1}
              suffix="x"
              description="Scales demand sensitivity to price changes"
            />
            <Slider
              label="Markdown Aggressiveness"
              value={settings.markdownAggressiveness}
              onChange={(v) => setSettings({ markdownAggressiveness: v })}
              min={0}
              max={1}
              step={0.05}
              description="0 = no markdown, 1 = maximum discount"
            />
            <Slider
              label="Markdown Timing"
              value={settings.markdownTiming}
              onChange={(v) => setSettings({ markdownTiming: v })}
              min={1}
              max={14}
              step={1}
              suffix=" days"
              description="Days before expiry to start markdown"
            />
            <Slider
              label="Minimum Selling Price"
              value={settings.minPriceFloor}
              onChange={(v) => setSettings({ minPriceFloor: v })}
              min={0.5}
              max={1.5}
              step={0.05}
              suffix="x cost"
              description="Floor as multiple of unit cost"
            />
            <Slider
              label="Simulation Duration"
              value={settings.horizon}
              onChange={(v) => setSettings({ horizon: Math.round(v) })}
              min={7}
              max={60}
              step={1}
              suffix=" days"
              description="Number of days to simulate"
            />
          </div>

          <div className="mt-5 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1">
            <p><span className="font-semibold text-slate-600">Seed:</span> 42 (reproducible)</p>
            <p><span className="font-semibold text-slate-600">Start date:</span> {formatDate('2026-10-22')}</p>
            <p><span className="font-semibold text-slate-600">Products:</span> {products.length}</p>
            <p className="text-slate-400">Changes update results automatically.</p>
          </div>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary comparison */}
          <Card title="Policy Comparison Summary">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <SimStat label="Revenue (Fixed)" value={formatCurrency(simulationResult.fixed.revenue)} color="text-blue-600" />
              <SimStat label="Revenue (Smart)" value={formatCurrency(simulationResult.smart.revenue)} color="text-emerald-600" />
              <SimStat label="Profit (Fixed)" value={formatCurrency(simulationResult.fixed.grossProfit)} color="text-blue-600" />
              <SimStat label="Profit (Smart)" value={formatCurrency(simulationResult.smart.grossProfit)} color="text-emerald-600" />
              <SimStat label="Expired (Fixed)" value={String(simulationResult.fixed.unitsExpired)} color="text-red-600" />
              <SimStat label="Expired (Smart)" value={String(simulationResult.smart.unitsExpired)} color="text-emerald-600" />
              <SimStat label="Waste Rate (Fixed)" value={formatPercent(simulationResult.fixed.wasteRate)} color="text-red-600" />
              <SimStat label="Waste Rate (Smart)" value={formatPercent(simulationResult.smart.wasteRate)} color="text-emerald-600" />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
              <p className="text-emerald-700">
                <span className="font-semibold">Waste Reduction:</span> {formatPercent(simulationResult.wasteReduction)} |
                <span className="font-semibold ml-2">Discount Impact:</span> {formatCurrency(simulationResult.discountImpact)} |
                <span className="font-semibold ml-2">Net Profit Change:</span> {formatCurrency(simulationResult.smart.grossProfit - simulationResult.fixed.grossProfit)}
              </p>
            </div>
          </Card>

          {/* Comparison bar chart */}
          <Card title="Revenue, Profit, and Waste Comparison">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => typeof v === 'number' && v > 100 ? `$${v}` : v} />
                <Tooltip formatter={(v: number) => v > 100 ? formatCurrency(v) : String(v)} />
                <Legend />
                <Bar dataKey="Fixed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Smart" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Cumulative chart */}
          <Card title="Cumulative Revenue & Waste Over Time">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={Math.ceil(cumulativeData.length / 10)} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="fixedRevenue" name="Fixed Revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="smartRevenue" name="Smart Revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="fixedExpired" name="Fixed Expired" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                <Line yAxisId="right" type="monotone" dataKey="smartExpired" name="Smart Expired" stroke="#059669" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Product comparison table */}
          <Card title="Product-Level Comparison">
            <DataTable
              data={simulationResult.productResults}
              rowKey={(r) => r.productId}
              columns={[
                { key: 'productName', label: 'Product', sortable: true, sortValue: (r) => r.productName, render: (r) => <span className="font-medium text-slate-700">{r.productName}</span> },
                { key: 'fixedRevenue', label: 'Fixed Rev', sortable: true, sortValue: (r) => r.fixedRevenue, render: (r) => <span className="tabular-nums">{formatCurrency(r.fixedRevenue)}</span> },
                { key: 'smartRevenue', label: 'Smart Rev', sortable: true, sortValue: (r) => r.smartRevenue, render: (r) => <span className="tabular-nums text-emerald-600">{formatCurrency(r.smartRevenue)}</span> },
                { key: 'fixedExpired', label: 'Fixed Exp', sortable: true, sortValue: (r) => r.fixedExpired, render: (r) => <span className="tabular-nums text-red-600">{r.fixedExpired}</span> },
                { key: 'smartExpired', label: 'Smart Exp', sortable: true, sortValue: (r) => r.smartExpired, render: (r) => <span className="tabular-nums text-emerald-600">{r.smartExpired}</span> },
                { key: 'fixedProfit', label: 'Fixed Profit', sortable: true, sortValue: (r) => r.fixedProfit, render: (r) => <span className="tabular-nums">{formatCurrency(r.fixedProfit)}</span> },
                { key: 'smartProfit', label: 'Smart Profit', sortable: true, sortValue: (r) => r.smartProfit, render: (r) => <span className="tabular-nums font-medium text-emerald-600">{formatCurrency(r.smartProfit)}</span> },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function SimStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
