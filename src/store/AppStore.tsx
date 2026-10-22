import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Product, SimulationResult, SimSettings, MarkdownRecommendation } from '../lib/types';
import { createSeedProducts, DEFAULT_SIM_SETTINGS, SIM_START_DATE } from '../lib/data';
import { runSimulation, generateRecommendations } from '../lib/simulation';

interface AppStore {
  products: Product[];
  settings: SimSettings;
  recommendations: MarkdownRecommendation[];
  simulationResult: SimulationResult;
  setSettings: (s: Partial<SimSettings>) => void;
  recalculate: () => void;
  resetDemoData: () => void;
  isCalculating: boolean;
}

const Ctx = createContext<AppStore | null>(null);

const STORAGE_KEY = 'phoenix-ai-store-v1';

interface PersistedState {
  settings: SimSettings;
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

function saveSettings(settings: SimSettings) {
  try {
    const data: PersistedState = { settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [products] = useState<Product[]>(() => createSeedProducts());
  const [settings, setSettingsState] = useState<SimSettings>(() => loadSettings());
  const [isCalculating, setIsCalculating] = useState(false);

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
    // Simulate a brief delay for UX feedback
    setTimeout(() => setIsCalculating(false), 300);
  }, []);

  const resetDemoData = useCallback(() => {
    setSettingsState({ ...DEFAULT_SIM_SETTINGS });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const value: AppStore = {
    products,
    settings,
    recommendations,
    simulationResult,
    setSettings,
    recalculate,
    resetDemoData,
    isCalculating,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
