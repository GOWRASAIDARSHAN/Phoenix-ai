export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type Category =
  | 'Dairy'
  | 'Bakery'
  | 'Fruits'
  | 'Vegetables'
  | 'Meat'
  | 'Packaged Fresh';

export interface Product {
  id: string;
  name: string;
  category: Category;
  initialStock: number;
  availableStock: number;
  unitCost: number;
  originalPrice: number;
  currentPrice: number;
  expiryDate: string; // ISO date
  daysToExpiry: number;
  dailyBaseDemand: number;
  priceElasticity: number; // negative: demand increases as price drops
  riskLevel: RiskLevel;
}

export interface MarkdownRecommendation {
  productId: string;
  productName: string;
  category: Category;
  currentPrice: number;
  originalPrice: number;
  unitCost: number;
  recommendedPrice: number;
  discountPercent: number;
  riskLevel: RiskLevel;
  daysToExpiry: number;
  availableStock: number;
  expectedDemand: number;
  expectedSales: number;
  expectedRevenue: number;
  expectedProfit: number;
  reasons: string[];
  shouldDiscount: boolean;
}

export interface DailySimulationResult {
  day: number;
  date: string;
  fixedRevenue: number;
  fixedUnitsSold: number;
  fixedStock: number;
  fixedExpired: number;
  fixedPrice: number;
  smartRevenue: number;
  smartUnitsSold: number;
  smartStock: number;
  smartExpired: number;
  smartPrice: number;
}

export interface ProductSimulationResult {
  productId: string;
  productName: string;
  category: Category;
  fixedUnitsSold: number;
  fixedRevenue: number;
  fixedExpired: number;
  fixedProfit: number;
  smartUnitsSold: number;
  smartRevenue: number;
  smartExpired: number;
  smartProfit: number;
}

export interface SimulationResult {
  dailyResults: DailySimulationResult[];
  productResults: ProductSimulationResult[];
  fixed: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    grossMargin: number;
    unitsSold: number;
    unitsExpired: number;
    wasteRate: number;
  };
  smart: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    grossMargin: number;
    unitsSold: number;
    unitsExpired: number;
    wasteRate: number;
  };
  wasteReduction: number;
  discountImpact: number; // revenue lost to discounts
  horizon: number;
}

export interface SimSettings {
  demandMultiplier: number;
  priceElasticity: number;
  markdownAggressiveness: number; // 0..1, higher = more aggressive
  markdownTiming: number; // days before expiry to start markdown
  minPriceFloor: number; // ratio of unit cost (e.g. 1.0 = cost)
  horizon: number;
  initialInventoryMultiplier: number;
}

export interface SimControls {
  initialInventory: number;
  demandMultiplier: number;
  priceElasticity: number;
  markdownAggressiveness: number;
  markdownTiming: number;
  minSellingPrice: number;
  simulationDuration: number;
}

export interface CategoryResult {
  category: Category;
  fixedRevenue: number;
  smartRevenue: number;
  fixedExpired: number;
  smartExpired: number;
  fixedUnitsSold: number;
  smartUnitsSold: number;
}
