import { describe, it, expect } from 'vitest';
import {
  computeSmartPrice,
  expectedDemand,
  generateRecommendations,
  runSimulation,
} from './simulation';
import { computeRiskLevel, createSeedProducts, DEFAULT_SIM_SETTINGS } from './data';
import { explainSimulationResults, explainProductRecommendation, generateShopperDealsFlyer } from './ollama';
import type { Product, SimSettings } from './types';

describe('Smart Markdown Engine & Financial Calculations', () => {
  const mockProduct: Product = {
    id: 'TEST01',
    name: 'Artisan Bread',
    category: 'Bakery',
    initialStock: 50,
    availableStock: 50,
    unitCost: 1.50,
    originalPrice: 4.00,
    currentPrice: 4.00,
    expiryDate: '2026-10-24',
    daysToExpiry: 2,
    dailyBaseDemand: 10,
    priceElasticity: -1.5,
    riskLevel: 'critical',
  };

  it('1. Recommended selling price obeys markdown window timing', () => {
    // If daysRemaining > markdownTiming, price must remain originalPrice
    const farExpiryPrice = computeSmartPrice(mockProduct, 10, {
      ...DEFAULT_SIM_SETTINGS,
      markdownTiming: 5,
    });
    expect(farExpiryPrice).toBe(mockProduct.originalPrice);

    // If daysRemaining <= markdownTiming, price should be discounted
    const nearExpiryPrice = computeSmartPrice(mockProduct, 2, {
      ...DEFAULT_SIM_SETTINGS,
      markdownTiming: 5,
      markdownAggressiveness: 0.5,
    });
    expect(nearExpiryPrice).toBeLessThan(mockProduct.originalPrice);
  });

  it('2. Recommended price never falls below minimum price floor (UnitCost * floorRatio)', () => {
    const cost = mockProduct.unitCost; // 1.50
    const floorSettings: SimSettings = {
      ...DEFAULT_SIM_SETTINGS,
      markdownTiming: 10,
      markdownAggressiveness: 1.0, // max aggressiveness
      minPriceFloor: 1.0, // 1.50 floor
    };

    // Even at 0 days to expiry with maximum aggressiveness
    const floorPrice = computeSmartPrice(mockProduct, 0, floorSettings);
    expect(floorPrice).toBeGreaterThanOrEqual(cost * floorSettings.minPriceFloor);
    expect(floorPrice).toBe(1.50);
  });

  it('3. Discount percentages are mathematically consistent and bounded in [0, 100]', () => {
    const recs = generateRecommendations([mockProduct], DEFAULT_SIM_SETTINGS);
    const rec = recs[0];

    if (rec.shouldDiscount) {
      const expectedDiscountPct = ((rec.originalPrice - rec.recommendedPrice) / rec.originalPrice) * 100;
      expect(rec.discountPercent).toBeCloseTo(expectedDiscountPct, 1);
      expect(rec.discountPercent).toBeGreaterThan(0);
      expect(rec.discountPercent).toBeLessThanOrEqual(100);
    } else {
      expect(rec.discountPercent).toBe(0);
      expect(rec.recommendedPrice).toBe(rec.originalPrice);
    }
  });

  it('4. Expected units sold cannot exceed available inventory and is never negative', () => {
    const products = createSeedProducts();
    const recs = generateRecommendations(products, DEFAULT_SIM_SETTINGS);

    for (const r of recs) {
      expect(r.expectedSales).toBeGreaterThanOrEqual(0);
      expect(r.expectedSales).toBeLessThanOrEqual(r.availableStock);
    }
  });

  it('5. Unsold inventory is mathematically consistent: stock - expectedSales and non-negative', () => {
    const products = createSeedProducts();
    const recs = generateRecommendations(products, DEFAULT_SIM_SETTINGS);

    for (const r of recs) {
      expect(r.expectedUnsold).toBe(Math.max(0, r.availableStock - r.expectedSales));
      expect(r.expectedUnsold).toBeGreaterThanOrEqual(0);
    }
  });

  it('6. Revenue and profit are mathematically consistent without double-counting discounts', () => {
    const recs = generateRecommendations([mockProduct], DEFAULT_SIM_SETTINGS);
    const r = recs[0];

    const expectedRevenue = Math.round(r.expectedSales * r.recommendedPrice * 100) / 100;
    const expectedCost = r.expectedSales * r.unitCost;
    const expectedProfit = Math.round((expectedRevenue - expectedCost) * 100) / 100;

    expect(r.expectedRevenue).toBe(expectedRevenue);
    expect(r.expectedProfit).toBe(expectedProfit);
    expect(r.expectedProfit).toBeLessThanOrEqual(r.expectedRevenue);
  });
});

describe('Waste Risk Classification Rules', () => {
  it('correctly classifies Critical risk when days <= 2 or sell-through horizon exceeds expiry by 1.5x', () => {
    // 1 day left -> Critical
    expect(computeRiskLevel(1, 20, 10)).toBe('critical');
    // 0 or negative days -> Critical
    expect(computeRiskLevel(0, 10, 5)).toBe('critical');
    expect(computeRiskLevel(-1, 5, 5)).toBe('critical');
    // 4 days left, but stock is 80 and demand is 5 -> sell-through is 16 days (> 1.5 * 4 = 6) -> Critical
    expect(computeRiskLevel(4, 80, 5)).toBe('critical');
  });

  it('correctly classifies High risk when days <= 5 or sell-through exceeds days remaining', () => {
    // 4 days left, stock 30, demand 6 -> sell-through is 5 days (> 4) -> High
    expect(computeRiskLevel(4, 30, 6)).toBe('high');
    // 5 days left -> High
    expect(computeRiskLevel(5, 20, 10)).toBe('high');
  });

  it('correctly classifies Medium risk when days <= 10 with adequate sell-through', () => {
    // 8 days left, stock 20, demand 10 -> sell-through is 2 days (< 8) -> Medium
    expect(computeRiskLevel(8, 20, 10)).toBe('medium');
  });

  it('correctly classifies Low risk for long shelf life and healthy demand', () => {
    // 20 days left, stock 30, demand 5 -> sell-through is 6 days (< 20) -> Low
    expect(computeRiskLevel(20, 30, 5)).toBe('low');
  });
});

describe('What-If Simulation Engine Policy Comparison', () => {
  it('runs baseline fixed-price and smart-markdown from identical starting stock', () => {
    const products = createSeedProducts();
    const result = runSimulation({
      products,
      settings: DEFAULT_SIM_SETTINGS,
      seed: 42,
    });

    expect(result.dailyResults.length).toBe(DEFAULT_SIM_SETTINGS.horizon);
    expect(result.fixed.revenue).toBeGreaterThan(0);
    expect(result.smart.revenue).toBeGreaterThan(0);

    // Initial total stock must be identical for both policies
    const totalInitial = products.reduce((s, p) => s + p.initialStock, 0);
    const fixedProcessed = result.fixed.unitsSold + result.fixed.unitsExpired;
    const smartProcessed = result.smart.unitsSold + result.smart.unitsExpired;

    // Both policies must not lose track of inventory
    expect(fixedProcessed).toBeLessThanOrEqual(totalInitial);
    expect(smartProcessed).toBeLessThanOrEqual(totalInitial);

    // Smart markdown should reduce expired waste units compared to fixed
    expect(result.smart.unitsExpired).toBeLessThanOrEqual(result.fixed.unitsExpired);
    expect(result.wasteReduction).toBeGreaterThanOrEqual(0);
  });

  it('handles division by zero gracefully when fixed waste is zero', () => {
    // Create zero-stock or durable products where fixed expired = 0
    const durableProduct: Product = {
      id: 'DUR01',
      name: 'Honey 500g',
      category: 'Packaged Fresh',
      initialStock: 10,
      availableStock: 10,
      unitCost: 3.00,
      originalPrice: 6.00,
      currentPrice: 6.00,
      expiryDate: '2026-12-01',
      daysToExpiry: 40,
      dailyBaseDemand: 5,
      priceElasticity: -1.2,
      riskLevel: 'low',
    };

    const result = runSimulation({
      products: [durableProduct],
      settings: { ...DEFAULT_SIM_SETTINGS, horizon: 10 },
      seed: 42,
    });

    expect(result.fixed.unitsExpired).toBe(0);
    expect(result.wasteReduction).toBe(0); // Not NaN or Infinity
    expect(Number.isFinite(result.wasteReduction)).toBe(true);
  });
});

describe('Ollama AI Fallback Behavior & Graceful Degradation', () => {
  it('generates deterministic fallback text for simulation results when Ollama is offline', async () => {
    // Mock fetch to simulate Ollama being offline/unreachable
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error('Connection refused'));

    try {
      const products = createSeedProducts();
      const simResult = runSimulation({
        products,
        settings: DEFAULT_SIM_SETTINGS,
      });

      const explanation = await explainSimulationResults(simResult);
      expect(explanation).toBeDefined();
      expect(explanation.source).toBe('fallback');
      expect(explanation.text).toContain('Markdown Decision Analysis');
      expect(explanation.text).toContain(String(simResult.fixed.unitsExpired));
      expect(explanation.text.length).toBeGreaterThan(50);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('generates deterministic fallback for product markdown recommendation when Ollama is offline', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error('Connection refused'));

    try {
      const products = createSeedProducts();
      const recs = generateRecommendations(products, DEFAULT_SIM_SETTINGS);
      const explanation = await explainProductRecommendation(recs[0], products[0]);

      expect(explanation).toBeDefined();
      expect(explanation.source).toBe('fallback');
      expect(explanation.text).toContain(recs[0].productName);
      expect(explanation.text.length).toBeGreaterThan(50);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('generates shopper deals flyer fallback without inventing numerical data when Ollama is offline', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error('Connection refused'));

    try {
      const products = createSeedProducts();
      const recs = generateRecommendations(products, DEFAULT_SIM_SETTINGS);
      const flyer = await generateShopperDealsFlyer(recs);

      expect(flyer).toBeDefined();
      expect(flyer.source).toBe('fallback');
      expect(flyer.text).toContain("Today's Near-Expiry Deals");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
