import {
  LayoutDashboard,
  PackageSearch,
  Tags,
  AlertTriangle,
  BarChart3,
  SlidersHorizontal,
  BookOpen,
  RotateCcw,
  Flame,
} from 'lucide-react';
import { useAppStore } from '../store/AppStore';

export type PageId =
  | 'command'
  | 'inventory'
  | 'markdown'
  | 'waste'
  | 'analytics'
  | 'simulator'
  | 'methodology';

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'command', label: 'Command Center', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory Intelligence', icon: PackageSearch },
  { id: 'markdown', label: 'Smart Markdown Engine', icon: Tags },
  { id: 'waste', label: 'Waste Risk Monitor', icon: AlertTriangle },
  { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
  { id: 'simulator', label: 'What-If Simulator', icon: SlidersHorizontal },
  { id: 'methodology', label: 'Assumptions & Methodology', icon: BookOpen },
];

export function Sidebar({ activePage, onNavigate, mobileOpen, onCloseMobile }: SidebarProps) {
  const { resetDemoData } = useAppStore();

  const handleReset = () => {
    if (window.confirm('Reset all demo data and settings to defaults? This will restore the original synthetic dataset.')) {
      resetDemoData();
    }
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col z-40 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm tracking-tight leading-tight">PHOENIX AI</h1>
              <p className="text-[10px] text-slate-400 leading-tight">Waste Prevention & Pricing</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-slate-700/50 space-y-2">
          {/* Ollama Status Pill */}
          <div className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">AI Engine</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                useAppStore().ollamaStatus.available ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${useAppStore().ollamaStatus.available ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {useAppStore().ollamaStatus.available ? 'Ollama Online' : 'Fallback Mode'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono mt-1 truncate">
              {useAppStore().ollamaStatus.model}
            </p>
            {!useAppStore().ollamaStatus.available && (
              <button
                onClick={() => useAppStore().refreshOllamaStatus()}
                className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline mt-1 block"
              >
                Retry Ollama connection
              </button>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-left"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            Reset Demo Data
          </button>
          <div className="px-3 py-1 text-[10px] text-slate-500 leading-relaxed">
            <p className="font-medium text-slate-400">NexAI Hack 2026 — Track 4</p>
            <p className="text-slate-500">PS 4.1: Markdown Before Waste</p>
          </div>
        </div>
      </aside>
    </>
  );
}
