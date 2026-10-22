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
 * Markdown evaluates:
 * 1. Remaining shelf life vs markdownTiming trigger
 * 2. Product category perishability weight
 * 3. Inventory overhang vs expected sales velocity
 * 4. Aggressiveness setting
 * 5. Cost-based price floor: Price never goes below unitCost * minPriceFloor.
 */
export function computeSmartPrice(
  product: Product,
  daysRemaining: number,
  settings: SimSettings,
): number {
  const { markdownTiming, markdownAggressiveness, minPriceFloor } = settings;
  const cost = product.unitCost;
  const originalPrice = product.originalPrice;
  const floor = Math.max(0, cost * minPriceFloor);

  if (daysRemaining > markdownTiming) return originalPrice;
  if (daysRemaining <= 0) return floor;

  // 1. Shelf life progression: 0 at window entry, ramps up to 1.0 at expiry day
  const progress = Math.max(0, Math.min(1, 1 - daysRemaining / markdownTiming));

  // 2. Category perishability weighting
  const categoryMultipliers: Record<string, number> = {
    'Meat': 1.15,
    'Bakery': 1.20,
    'Packaged Fresh': 1.25,
    'Fruits': 1.05,
    'Vegetables': 1.05,
    'Dairy': 1.0,
  };
  const catWeight = categoryMultipliers[product.category] || 1.0;

  // 3. Inventory overhang factor: ratio of stock to baseline expected demand
  const baselineDemand = Math.max(0.1, product.dailyBaseDemand * daysRemaining * settings.demandMultiplier);
  const overhang = product.availableStock / baselineDemand;
  const overhangFactor = overhang > 1.0 ? Math.min(1.35, 1.0 + (overhang - 1.0) * 0.25) : 0.85;

  // 4. Max discount fraction: capped at 50% max to preserve retailer credibility & margin
  const maxDiscountFraction = 0.50;
  const discountFraction = Math.min(
    maxDiscountFraction,
    progress * markdownAggressiveness * catWeight * overhangFactor
  );

  const calculatedPrice = originalPrice * (1 - discountFraction);
  // Guarantee price is between floor and originalPrice
  return Math.max(floor, Math.min(originalPrice, Math.round(calculatedPrice * 100) / 100));
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
    const floor = Math.max(0, cost * settings.minPriceFloor);

    // Sales velocity at original price
    const velocityAtOriginal = expectedDemand(p, original, settings);
    const demandAtOriginal = velocityAtOriginal * Math.max(daysRemaining, 1);

    // Smart price calculation
    const smartPrice = computeSmartPrice(p, daysRemaining, settings);
    const salesVelocity = expectedDemand(p, smartPrice, settings);
    const demandAtSmart = salesVelocity * Math.max(daysRemaining, 1);

    // Will stock sell through before expiry at current price?
    const willSellThroughAtOriginal = demandAtOriginal >= stock;

    const shouldDiscount =
      daysRemaining <= settings.markdownTiming &&
      !willSellThroughAtOriginal &&
      stock > 0;

    const recommendedPrice = shouldDiscount ? smartPrice : original;
    const effectiveVelocity = shouldDiscount ? salesVelocity : velocityAtOriginal;
    const effectiveDemand = shouldDiscount ? demandAtSmart : demandAtOriginal;

    const discountPercent = shouldDiscount
      ? Math.max(0, Math.min(100, ((original - recommendedPrice) / original) * 100))
      : 0;

    const expectedSales = Math.min(stock, Math.round(effectiveDemand));
    const expectedUnsold = Math.max(0, stock - expectedSales);
    const expectedRevenue = Math.round(expectedSales * recommendedPrice * 100) / 100;
    const expectedProfit = Math.round((expectedRevenue - (expectedSales * cost)) * 100) / 100;

    const reasons: string[] = [];
    if (daysRemaining <= 0) {
      reasons.push('Product has reached or passed expiry date — remove from shelf immediately.');
    } else if (daysRemaining <= 2) {
      reasons.push(`Critical urgency: only ${daysRemaining} day(s) until expiry with ${stock} units remaining.`);
    } else if (daysRemaining <= settings.markdownTiming) {
      reasons.push(`Active markdown window: ${daysRemaining} days remaining (threshold: ${settings.markdownTiming} days).`);
    }

    if (!willSellThroughAtOriginal && stock > 0) {
      reasons.push(
        `Demand overhang: At full price, expected sales velocity (~${velocityAtOriginal.toFixed(1)}/day) leaves ~${Math.max(0, stock - Math.round(demandAtOriginal))} units at risk of spoilage.`,
      );
    }

    if (shouldDiscount) {
      reasons.push(
        `Recommended ${discountPercent.toFixed(1)}% markdown to ${formatPrice(recommendedPrice)} lifts sales velocity to ~${salesVelocity.toFixed(1)}/day, clearing ~${expectedSales} units.`,
      );
      if (recommendedPrice <= floor + 0.01) {
        reasons.push(`Protected floor: Price is bounded at unit cost floor (${formatPrice(floor)}) to prevent negative gross margin.`);
      }
    } else if (daysRemaining > settings.markdownTiming) {
      reasons.push(
        `Adequate shelf life: ${daysRemaining} days remaining exceeds the ${settings.markdownTiming}-day intervention window.`,
      );
    } else if (willSellThroughAtOriginal) {
      reasons.push('High organic demand: Current sales velocity is projected to clear all available inventory without discounting.');
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
      expectedDemand: effectiveDemand,
      expectedSales,
      expectedUnsold,
      salesVelocity: effectiveVelocity,
      expectedRevenue,
      expectedProfit,
      floorPrice: floor,
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
