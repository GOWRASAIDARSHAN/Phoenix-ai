import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Product, SimulationResult, SimSettings, MarkdownRecommendation } from '../lib/types';
import { createSeedProducts, DEFAULT_SIM_SETTINGS, SIM_START_DATE } from '../lib/data';
import { runSimulation, generateRecommendations } from '../lib/simulation';
import { checkOllamaStatus, type OllamaStatus, OLLAMA_MODEL } from '../lib/ollama';
import type { PageId } from '../components/Sidebar';

interface AppStore {
  products: Product[];
  settings: SimSettings;
  recommendations: MarkdownRecommendation[];
  simulationResult: SimulationResult;
  activePage: PageId;
  selectedProductId: string | null;
  ollamaStatus: OllamaStatus;
  isCalculating: boolean;
  setSettings: (s: Partial<SimSettings>) => void;
  recalculate: () => void;
  resetDemoData: () => void;
  setActivePage: (p: PageId) => void;
  setSelectedProductId: (id: string | null) => void;
  navigateToPage: (page: PageId, productId?: string) => void;
  applyPriceUpdate: (productId: string, newPrice: number) => void;
  applyAllRecommendedMarkdowns: () => void;
  refreshOllamaStatus: () => Promise<void>;
}

const Ctx = createContext<AppStore | null>(null);

const STORAGE_KEY = 'phoenix-ai-store-v1';

interface PersistedState {
  settings: SimSettings;
  customPrices?: Record<string, number>;
}

function loadSettings(): SimSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: PersistedState = JSON.parse(raw);
      return { ...DEFAULT_SIM_SETTINGS, ...parsed.settings };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SIM_SETTINGS };
}

function loadCustomPrices(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: PersistedState = JSON.parse(raw);
      return parsed.customPrices || {};
    }
  } catch {
    // ignore
  }
  return {};
}

function saveState(settings: SimSettings, customPrices: Record<string, number>) {
  try {
    const data: PersistedState = { settings, customPrices };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialSeedProducts] = useState<Product[]>(() => createSeedProducts());
  const [customPrices, setCustomPrices] = useState<Record<string, number>>(() => loadCustomPrices());
  const [settings, setSettingsState] = useState<SimSettings>(() => loadSettings());
  const [isCalculating, setIsCalculating] = useState(false);
  const [activePage, setActivePage] = useState<PageId>('command');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({
    available: false,
    model: OLLAMA_MODEL,
    endpoint: 'http://localhost:11434',
  });

  // Re-check Ollama status on mount and periodically
  const refreshOllamaStatus = useCallback(async () => {
    const status = await checkOllamaStatus();
    setOllamaStatus(status);
  }, []);

  useEffect(() => {
    refreshOllamaStatus();
  }, [refreshOllamaStatus]);

  // Merge seed products with any live applied markdown prices
  const products = useMemo(() => {
    return initialSeedProducts.map((p) => {
      const livePrice = customPrices[p.id] ?? p.originalPrice;
      return {
        ...p,
        currentPrice: Math.max(p.unitCost, Math.min(p.originalPrice, livePrice)),
      };
    });
  }, [initialSeedProducts, customPrices]);

  const simulationResult = useMemo(() => {
    return runSimulation({
      products,
      settings,
      seed: 42,
      startDate: SIM_START_DATE,
    });
  }, [products, settings]);

  const recommendations = useMemo(() => {
    return generateRecommendations(products, settings);
  }, [products, settings]);

  const setSettings = useCallback((s: Partial<SimSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...s }));
  }, []);

  const recalculate = useCallback(() => {
    setIsCalculating(true);
    setTimeout(() => setIsCalculating(false), 250);
  }, []);

  const navigateToPage = useCallback((page: PageId, productId?: string) => {
    setActivePage(page);
    if (productId) {
      setSelectedProductId(productId);
    }
  }, []);

  const applyPriceUpdate = useCallback((productId: string, newPrice: number) => {
    setCustomPrices((prev) => {
      const updated = { ...prev, [productId]: newPrice };
      saveState(settings, updated);
      return updated;
    });
  }, [settings]);

  const applyAllRecommendedMarkdowns = useCallback(() => {
    setCustomPrices((prev) => {
      const updated = { ...prev };
      recommendations.forEach((r) => {
        if (r.shouldDiscount) {
          updated[r.productId] = r.recommendedPrice;
        }
      });
      saveState(settings, updated);
      return updated;
    });
  }, [recommendations, settings]);

  const resetDemoData = useCallback(() => {
    setSettingsState({ ...DEFAULT_SIM_SETTINGS });
    setCustomPrices({});
    setSelectedProductId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    saveState(settings, customPrices);
  }, [settings, customPrices]);

  const value: AppStore = {
    products,
    settings,
    recommendations,
    simulationResult,
    activePage,
    selectedProductId,
    ollamaStatus,
    isCalculating,
    setSettings,
    recalculate,
    resetDemoData,
    setActivePage,
    setSelectedProductId,
    navigateToPage,
    applyPriceUpdate,
    applyAllRecommendedMarkdowns,
    refreshOllamaStatus,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
