import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'teal';
  subtitle?: string;
}

const ACCENT_STYLES = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100' },
  green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-100' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', ring: 'ring-slate-200' },
  teal: { bg: 'bg-teal-50', icon: 'text-teal-600', ring: 'ring-teal-100' },
};

export function KpiCard({ label, value, icon: Icon, trend, trendValue, trendLabel, accent = 'slate', subtitle }: KpiCardProps) {
  const a = ACCENT_STYLES[accent];
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${a.bg} ring-1 ${a.ring}`}>
          <Icon className={`w-5 h-5 ${a.icon}`} />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : null}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {trendLabel && <p className="text-xs text-slate-400 mt-1">{trendLabel}</p>}
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
