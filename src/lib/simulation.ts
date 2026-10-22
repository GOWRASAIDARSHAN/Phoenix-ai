import type {
  Product,
  SimulationResult,
  DailySimulationResult,
  ProductSimulationResult,
  SimSettings,
  MarkdownRecommendation,
  CategoryResult,
} from './types';
import { createRng } from './utils';
import { SIM_START_DATE, DEFAULT_SEED } from './data';

/**
 * Calculate smart markdown price for a product on a given day.
 * Markdown only starts when within `markdownTiming` days of expiry.
 * Price never goes below unitCost * minPriceFloor.
 */
export function computeSmartPrice(
  product: Product,
  daysRemaining: number,
  settings: SimSettings,
): number {
  const { markdownTiming, markdownAggressiveness, minPriceFloor } = settings;
  const cost = product.unitCost;
  const originalPrice = product.originalPrice;
  const floor = cost * minPriceFloor;

  if (daysRemaining > markdownTiming) return originalPrice;
  if (daysRemaining <= 0) return floor;

  // Progress from 1.0 (just entered markdown window) down to 0 (expiry day)
  const progress = Math.max(0, Math.min(1, 1 - daysRemaining / markdownTiming));
  // Discount ramps from 0 up to (aggressiveness * maxDiscountFraction)
  const maxDiscountFraction = 0.40; // max 40% off
  const discountFraction = progress * markdownAggressiveness * maxDiscountFraction;
  const price = originalPrice * (1 - discountFraction);
  return Math.max(floor, price);
}

/**
 * Expected demand for a product given a price and settings.
 * Uses constant-elasticity demand model: D = baseDemand * (price/originalPrice)^elasticity
 */
export function expectedDemand(
  product: Product,
  price: number,
  settings: SimSettings,
): number {
  const elasticity = product.priceElasticity * settings.priceElasticity;
  const ratio = price / product.originalPrice;
  const demand = product.dailyBaseDemand * Math.pow(ratio, elasticity) * settings.demandMultiplier;
  return Math.max(0, demand);
}

/**
 * Sample actual demand from expected demand using Poisson-like rounding.
 * Uses the provided RNG for reproducibility.
 */
function sampleDemand(rng: () => number, expected: number): number {
  if (expected <= 0) return 0;
  // Simple Poisson approximation via Knuth's algorithm
  const L = Math.exp(-expected);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L && k < 10000);
  return k - 1;
}

export interface SimRunConfig {
  products: Product[];
  settings: SimSettings;
  seed?: number;
  startDate?: Date;
}

interface ProductSimState {
  product: Product;
  stock: number;
  expired: number;
  unitsSold: number;
  revenue: number;
  cogs: number;
  alreadyExpired: boolean;
}

/**
 * Run the full simulation comparing fixed-price vs smart-markdown policies.
 * Both policies use identical initial stock and the same RNG stream for demand.
 */
export function runSimulation(config: SimRunConfig): SimulationResult {
  const { products, settings, seed = DEFAULT_SEED, startDate = SIM_START_DATE } = config;
  const horizon = settings.horizon;

  const fixedStates: ProductSimState[] = products.map((p) => ({
    product: { ...p },
    stock: Math.round(p.initialStock * settings.initialInventoryMultiplier),
    expired: 0,
    unitsSold: 0,
    revenue: 0,
    cogs: 0,
    alreadyExpired: false,
  }));

  const smartStates: ProductSimState[] = products.map((p) => ({
    product: { ...p },
    stock: Math.round(p.initialStock * settings.initialInventoryMultiplier),
    expired: 0,
    unitsSold: 0,
    revenue: 0,
    cogs: 0,
    alreadyExpired: false,
  }));

  const dailyResults: DailySimulationResult[] = [];

  // Two independent RNGs with the same seed — ensures identical demand shocks
  const fixedRng = createRng(seed);
  const smartRng = createRng(seed);

  for (let day = 0; day < horizon; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    let fixedDayRevenue = 0;
    let fixedDayUnitsSold = 0;
    let fixedDayExpired = 0;
    let fixedDayStock = 0;
    let fixedDayPrice = 0;

    let smartDayRevenue = 0;
    let smartDayUnitsSold = 0;
    let smartDayExpired = 0;
    let smartDayStock = 0;
    let smartDayPrice = 0;

    for (let pi = 0; pi < products.length; pi++) {
      const product = products[pi];
      const expiryDay = product.daysToExpiry;
      const daysRemaining = expiryDay - day;

      // ---- FIXED PRICE POLICY ----
      const fs = fixedStates[pi];
      let fixedPrice = product.originalPrice;

      // Check expiry: if today is the expiry day and stock remains, it expires
      if (!fs.alreadyExpired && daysRemaining <= 0 && fs.stock > 0) {
        fixedDayExpired += fs.stock;
        fs.expired += fs.stock;
        fs.stock = 0;
        fs.alreadyExpired = true;
      }

      if (fs.stock > 0 && daysRemaining > 0) {
        const expDemand = expectedDemand(product, fixedPrice, settings);
        const actualDemand = Math.min(sampleDemand(fixedRng, expDemand), fs.stock);
        const sold = Math.min(actualDemand, fs.stock);
        if (sold > 0) {
          fs.stock -= sold;
          fs.unitsSold += sold;
          const dayRevenue = sold * fixedPrice;
          fs.revenue += dayRevenue;
          fs.cogs += sold * product.unitCost;
          fixedDayRevenue += dayRevenue;
          fixedDayUnitsSold += sold;
        }
      }
      fixedDayStock += fs.stock;
      fixedDayPrice += fixedPrice;

      // ---- SMART MARKDOWN POLICY ----
      const ss = smartStates[pi];
      let smartPrice = computeSmartPrice(product, daysRemaining, settings);

      if (!ss.alreadyExpired && daysRemaining <= 0 && ss.stock > 0) {
        smartDayExpired += ss.stock;
        ss.expired += ss.stock;
        ss.stock = 0;
        ss.alreadyExpired = true;
      }

      if (ss.stock > 0 && daysRemaining > 0) {
        const expDemand = expectedDemand(product, smartPrice, settings);
        const actualDemand = Math.min(sampleDemand(smartRng, expDemand), ss.stock);
        const sold = Math.min(actualDemand, ss.stock);
        if (sold > 0) {
          ss.stock -= sold;
          ss.unitsSold += sold;
          const dayRevenue = sold * smartPrice;
          ss.revenue += dayRevenue;
          ss.cogs += sold * product.unitCost;
          smartDayRevenue += dayRevenue;
          smartDayUnitsSold += sold;
        }
      }
      smartDayStock += ss.stock;
      smartDayPrice += smartPrice;
    }

    dailyResults.push({
      day: day + 1,
      date: dateStr,
      fixedRevenue: fixedDayRevenue,
      fixedUnitsSold: fixedDayUnitsSold,
      fixedStock: fixedDayStock,
      fixedExpired: fixedDayExpired,
      fixedPrice: fixedDayPrice / products.length,
      smartRevenue: smartDayRevenue,
      smartUnitsSold: smartDayUnitsSold,
      smartStock: smartDayStock,
      smartExpired: smartDayExpired,
      smartPrice: smartDayPrice / products.length,
    });
  }

  // Aggregate results
  const fixed = aggregateSimStates(fixedStates);
  const smart = aggregateSimStates(smartStates);

  // Product-level results
  const productResults: ProductSimulationResult[] = products.map((p, i) => ({
    productId: p.id,
    productName: p.name,
    category: p.category,
    fixedUnitsSold: fixedStates[i].unitsSold,
    fixedRevenue: fixedStates[i].revenue,
    fixedExpired: fixedStates[i].expired,
    fixedProfit: fixedStates[i].revenue - fixedStates[i].cogs,
    smartUnitsSold: smartStates[i].unitsSold,
    smartRevenue: smartStates[i].revenue,
    smartExpired: smartStates[i].expired,
    smartProfit: smartStates[i].revenue - smartStates[i].cogs,
  }));

  const totalInitialUnits = products.reduce(
    (sum, p) => sum + Math.round(p.initialStock * settings.initialInventoryMultiplier),
    0,
  );

  const wasteReduction =
    fixed.unitsExpired === 0
      ? smart.unitsExpired === 0
        ? 0
        : 0 // baseline zero, can't reduce
      : ((fixed.unitsExpired - smart.unitsExpired) / fixed.unitsExpired) * 100;

  // Discount impact: revenue difference due to markdown pricing (fixed - smart, but only the price effect)
  // Measured as: what smart pricing "gave up" in per-unit revenue vs fixed, on units it sold
  let discountImpact = 0;
  for (let i = 0; i < products.length; i++) {
    const priceGap = products[i].originalPrice; // fixed price is always original
    // For each unit sold under smart, the discount given is (originalPrice - avgSmartPrice)
    // Approximate: use total smart revenue vs (smart units * original price)
  }
  // More accurate: revenue smart would have earned at original price
  const smartRevenueAtOriginal = smartStates.reduce(
    (sum, s) => sum + s.unitsSold * s.product.originalPrice,
    0,
  );
  discountImpact = smartRevenueAtOriginal - smart.revenue;

  return {
    dailyResults,
    productResults,
    fixed,
    smart,
    wasteReduction,
    discountImpact,
    horizon,
  };
}

function aggregateSimStates(states: ProductSimState[]) {
  const revenue = states.reduce((s, st) => s + st.revenue, 0);
  const cogs = states.reduce((s, st) => s + st.cogs, 0);
  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const unitsSold = states.reduce((s, st) => s + st.unitsSold, 0);
  const unitsExpired = states.reduce((s, st) => s + st.expired, 0);
  const totalInitial = states.reduce((s, st) => s + Math.round(st.product.initialStock), 0);
  const wasteRate = totalInitial > 0 ? (unitsExpired / totalInitial) * 100 : 0;

  return { revenue, cogs, grossProfit, grossMargin, unitsSold, unitsExpired, wasteRate };
}

/**
 * Generate markdown recommendations for products based on current state.
 */
export function generateRecommendations(
  products: Product[],
  settings: SimSettings,
): MarkdownRecommendation[] {
  return products.map((p) => {
    const daysRemaining = p.daysToExpiry;
    const stock = p.availableStock;
    const cost = p.unitCost;
    const original = p.originalPrice;
    const floor = cost * settings.minPriceFloor;

    // Expected demand at original price over remaining shelf life
    const demandAtOriginal = expectedDemand(p, original, settings) * daysRemaining;
    // Expected demand at smart price over remaining shelf life
    const smartPrice = computeSmartPrice(p, daysRemaining, settings);
    const demandAtSmart = expectedDemand(p, smartPrice, settings) * daysRemaining;

    // Will stock sell through before expiry at current price?
    const willSellThroughAtOriginal = demandAtOriginal >= stock;
    const willSellThroughAtSmart = demandAtSmart >= stock;

    const expectedSales = Math.min(stock, demandAtSmart);
    const expectedRevenue = expectedSales * smartPrice;
    const expectedProfit = expectedRevenue - expectedSales * cost;

    const shouldDiscount =
      daysRemaining <= settings.markdownTiming &&
      !willSellThroughAtOriginal &&
      stock > 0;

    const recommendedPrice = shouldDiscount ? smartPrice : original;
    const discountPercent = shouldDiscount
      ? ((original - recommendedPrice) / original) * 100
      : 0;

    const reasons: string[] = [];
    if (daysRemaining <= 0) {
      reasons.push('Product has reached or passed expiry date — immediate action required.');
    } else if (daysRemaining <= 2) {
      reasons.push(`Critical: only ${daysRemaining} day(s) until expiry with ${stock} units in stock.`);
    } else if (daysRemaining <= settings.markdownTiming) {
      reasons.push(`Within markdown window: ${daysRemaining} days remaining, within ${settings.markdownTiming}-day markdown trigger.`);
    }

    if (!willSellThroughAtOriginal) {
      reasons.push(
        `At current price, expected demand (~${demandAtOriginal.toFixed(0)} units) is below stock (${stock} units) — risk of unsold inventory.`,
      );
    }

    if (shouldDiscount) {
      reasons.push(
        `Markdown to ${formatPrice(recommendedPrice)} (${discountPercent.toFixed(1)}% off) increases expected demand to ~${demandAtSmart.toFixed(0)} units, improving sell-through.`,
      );
      if (recommendedPrice <= floor) {
        reasons.push('Price is at minimum floor (unit cost) — cannot discount further.');
      }
    } else if (daysRemaining > settings.markdownTiming) {
      reasons.push(
        `Sufficient shelf life (${daysRemaining} days > ${settings.markdownTiming}-day markdown window) — no markdown needed yet.`,
      );
    } else if (willSellThroughAtOriginal) {
      reasons.push('Expected demand at current price is sufficient to sell through stock — no markdown needed.');
    }

    return {
      productId: p.id,
      productName: p.name,
      category: p.category,
      currentPrice: p.currentPrice,
      originalPrice: original,
      unitCost: cost,
      recommendedPrice,
      discountPercent,
      riskLevel: p.riskLevel,
      daysToExpiry: daysRemaining,
      availableStock: stock,
      expectedDemand: demandAtSmart,
      expectedSales,
      expectedRevenue,
      expectedProfit,
      reasons,
      shouldDiscount,
    };
  });
}

function formatPrice(v: number): string {
  return '$' + v.toFixed(2);
}

/**
 * Aggregate results by category for charts.
 */
export function aggregateByCategory(
  productResults: ProductSimulationResult[],
  products: Product[],
): CategoryResult[] {
  const map = new Map<string, CategoryResult>();
  for (const p of products) {
    if (!map.has(p.category)) {
      map.set(p.category, {
        category: p.category,
        fixedRevenue: 0,
        smartRevenue: 0,
        fixedExpired: 0,
        smartExpired: 0,
        fixedUnitsSold: 0,
        smartUnitsSold: 0,
      });
    }
  }
  for (const pr of productResults) {
    const cat = products.find((p) => p.id === pr.productId)?.category;
    if (!cat) continue;
    const entry = map.get(cat)!;
    entry.fixedRevenue += pr.fixedRevenue;
    entry.smartRevenue += pr.smartRevenue;
    entry.fixedExpired += pr.fixedExpired;
    entry.smartExpired += pr.smartExpired;
    entry.fixedUnitsSold += pr.fixedUnitsSold;
    entry.smartUnitsSold += pr.smartUnitsSold;
  }
  return Array.from(map.values());
}
