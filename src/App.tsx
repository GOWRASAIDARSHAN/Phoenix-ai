import { useState } from 'react';
import { Menu } from 'lucide-react';
import { AppProvider, useAppStore } from './store/AppStore';
import { Sidebar } from './components/Sidebar';
import { CommandCenter } from './pages/CommandCenter';
import { InventoryIntelligence } from './pages/InventoryIntelligence';
import { SmartMarkdownEngine } from './pages/SmartMarkdownEngine';
import { WasteRiskMonitor } from './pages/WasteRiskMonitor';
import { PerformanceAnalytics } from './pages/PerformanceAnalytics';
import { WhatIfSimulator } from './pages/WhatIfSimulator';
import { AssumptionsMethodology } from './pages/AssumptionsMethodology';

function AppContent() {
  const { activePage, setActivePage } = useAppStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const renderPage = () => {
    switch (activePage) {
      case 'command':
        return <CommandCenter />;
      case 'inventory':
        return <InventoryIntelligence />;
      case 'markdown':
        return <SmartMarkdownEngine />;
      case 'waste':
        return <WasteRiskMonitor />;
      case 'analytics':
        return <PerformanceAnalytics />;
      case 'simulator':
        return <WhatIfSimulator />;
      case 'methodology':
        return <AssumptionsMethodology />;
      default:
        return <CommandCenter />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-800">
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm tracking-wide">PHOENIX AI</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-medium">
            PS 4.1 Near-Expiry
          </span>
        </div>

        {/* Main content */}
        <main className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
