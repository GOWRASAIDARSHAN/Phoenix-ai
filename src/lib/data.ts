import type { Product, RiskLevel, Category } from './types';

// Fixed simulation start date — all expiry dates are relative to this
export const SIM_START_DATE = new Date('2026-10-22T00:00:00');

export const DEFAULT_HORIZON = 30;
export const DEFAULT_SEED = 42;

export const CATEGORIES: Category[] = [
  'Dairy',
  'Bakery',
  'Fruits',
  'Vegetables',
  'Meat',
  'Packaged Fresh',
];

function daysFromStart(days: number): string {
  const d = new Date(SIM_START_DATE);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function computeRiskLevel(daysToExpiry: number, availableStock: number, dailyBaseDemand: number): RiskLevel {
  const expectedSellThroughDays = availableStock / Math.max(dailyBaseDemand, 0.1);
  if (daysToExpiry <= 0) return 'critical';
  if (daysToExpiry <= 2 || expectedSellThroughDays > daysToExpiry * 1.5) return 'critical';
  if (daysToExpiry <= 5 || expectedSellThroughDays > daysToExpiry) return 'high';
  if (daysToExpiry <= 10) return 'medium';
  return 'low';
}

interface SeedProduct {
  name: string;
  category: Category;
  initialStock: number;
  unitCost: number;
  originalPrice: number;
  daysToExpiry: number;
  dailyBaseDemand: number;
  priceElasticity: number;
}

const SEED_PRODUCTS: SeedProduct[] = [
  // Dairy (5)
  { name: 'Whole Milk 1L', category: 'Dairy', initialStock: 80, unitCost: 1.20, originalPrice: 2.50, daysToExpiry: 7, dailyBaseDemand: 12, priceElasticity: -1.5 },
  { name: 'Greek Yogurt 500g', category: 'Dairy', initialStock: 50, unitCost: 2.00, originalPrice: 4.00, daysToExpiry: 14, dailyBaseDemand: 5, priceElasticity: -1.3 },
  { name: 'Cheddar Cheese 250g', category: 'Dairy', initialStock: 40, unitCost: 3.50, originalPrice: 6.50, daysToExpiry: 21, dailyBaseDemand: 4, priceElasticity: -1.1 },
  { name: 'Butter 200g', category: 'Dairy', initialStock: 35, unitCost: 1.80, originalPrice: 3.50, daysToExpiry: 10, dailyBaseDemand: 6, priceElasticity: -1.2 },
  { name: 'Cream Cheese 300g', category: 'Dairy', initialStock: 25, unitCost: 2.50, originalPrice: 4.80, daysToExpiry: 4, dailyBaseDemand: 3, priceElasticity: -1.4 },

  // Bakery (4)
  { name: 'Sourdough Bread', category: 'Bakery', initialStock: 60, unitCost: 1.50, originalPrice: 3.20, daysToExpiry: 3, dailyBaseDemand: 15, priceElasticity: -1.6 },
  { name: 'Croissants 6-pack', category: 'Bakery', initialStock: 45, unitCost: 2.50, originalPrice: 5.00, daysToExpiry: 2, dailyBaseDemand: 8, priceElasticity: -1.8 },
  { name: 'Bagels 8-pack', category: 'Bakery', initialStock: 40, unitCost: 1.80, originalPrice: 3.80, daysToExpiry: 5, dailyBaseDemand: 7, priceElasticity: -1.3 },
  { name: 'Whole Wheat Bread', category: 'Bakery', initialStock: 55, unitCost: 1.40, originalPrice: 2.80, daysToExpiry: 6, dailyBaseDemand: 10, priceElasticity: -1.2 },

  // Fruits (4)
  { name: 'Bananas 1kg', category: 'Fruits', initialStock: 70, unitCost: 0.80, originalPrice: 1.80, daysToExpiry: 4, dailyBaseDemand: 18, priceElasticity: -1.7 },
  { name: 'Strawberries 250g', category: 'Fruits', initialStock: 30, unitCost: 2.20, originalPrice: 4.50, daysToExpiry: 3, dailyBaseDemand: 6, priceElasticity: -1.9 },
  { name: 'Avocados 4-pack', category: 'Fruits', initialStock: 50, unitCost: 1.50, originalPrice: 3.50, daysToExpiry: 7, dailyBaseDemand: 9, priceElasticity: -1.4 },
  { name: 'Green Grapes 500g', category: 'Fruits', initialStock: 40, unitCost: 1.80, originalPrice: 3.80, daysToExpiry: 5, dailyBaseDemand: 7, priceElasticity: -1.5 },

  // Vegetables (5)
  { name: 'Bagged Spinach 200g', category: 'Vegetables', initialStock: 35, unitCost: 1.20, originalPrice: 2.80, daysToExpiry: 4, dailyBaseDemand: 5, priceElasticity: -1.5 },
  { name: 'Cherry Tomatoes 300g', category: 'Vegetables', initialStock: 45, unitCost: 1.50, originalPrice: 3.20, daysToExpiry: 6, dailyBaseDemand: 8, priceElasticity: -1.3 },
  { name: 'Bagged Carrots 1kg', category: 'Vegetables', initialStock: 60, unitCost: 0.90, originalPrice: 2.00, daysToExpiry: 12, dailyBaseDemand: 10, priceElasticity: -1.1 },
  { name: 'Bell Peppers 3-pack', category: 'Vegetables', initialStock: 40, unitCost: 1.80, originalPrice: 3.80, daysToExpiry: 5, dailyBaseDemand: 6, priceElasticity: -1.4 },
  { name: 'Cucumber Bundle', category: 'Vegetables', initialStock: 30, unitCost: 0.70, originalPrice: 1.60, daysToExpiry: 8, dailyBaseDemand: 7, priceElasticity: -1.2 },

  // Meat (3)
  { name: 'Chicken Breast 500g', category: 'Meat', initialStock: 40, unitCost: 3.50, originalPrice: 7.50, daysToExpiry: 3, dailyBaseDemand: 8, priceElasticity: -1.6 },
  { name: 'Ground Beef 500g', category: 'Meat', initialStock: 30, unitCost: 4.00, originalPrice: 8.00, daysToExpiry: 2, dailyBaseDemand: 6, priceElasticity: -1.7 },
  { name: 'Pork Chops 600g', category: 'Meat', initialStock: 25, unitCost: 3.80, originalPrice: 7.80, daysToExpiry: 4, dailyBaseDemand: 4, priceElasticity: -1.5 },

  // Packaged Fresh (3)
  { name: 'Fresh Pasta 350g', category: 'Packaged Fresh', initialStock: 35, unitCost: 2.00, originalPrice: 4.20, daysToExpiry: 8, dailyBaseDemand: 5, priceElasticity: -1.3 },
  { name: 'Hummus 200g', category: 'Packaged Fresh', initialStock: 30, unitCost: 1.50, originalPrice: 3.50, daysToExpiry: 7, dailyBaseDemand: 4, priceElasticity: -1.2 },
  { name: 'Sushi Platter', category: 'Packaged Fresh', initialStock: 20, unitCost: 5.00, originalPrice: 12.00, daysToExpiry: 1, dailyBaseDemand: 5, priceElasticity: -2.0 },
];

export function createSeedProducts(): Product[] {
  return SEED_PRODUCTS.map((sp, i) => {
    const dte = sp.daysToExpiry;
    const risk = computeRiskLevel(dte, sp.initialStock, sp.dailyBaseDemand);
    return {
      id: `P${String(i + 1).padStart(3, '0')}`,
      name: sp.name,
      category: sp.category,
      initialStock: sp.initialStock,
      availableStock: sp.initialStock,
      unitCost: sp.unitCost,
      originalPrice: sp.originalPrice,
      currentPrice: sp.originalPrice,
      expiryDate: daysFromStart(dte),
      daysToExpiry: dte,
      dailyBaseDemand: sp.dailyBaseDemand,
      priceElasticity: sp.priceElasticity,
      riskLevel: risk,
    };
  });
}

export const DEFAULT_SIM_SETTINGS: SimSettings = {
  demandMultiplier: 1.0,
  priceElasticity: 1.0,
  markdownAggressiveness: 0.5,
  markdownTiming: 5,
  minPriceFloor: 1.0,
  horizon: DEFAULT_HORIZON,
  initialInventoryMultiplier: 1.0,
};
