import type { RiskLevel } from '../lib/types';
import { RISK_BG, RISK_BORDER } from '../lib/utils';

export function RiskBadge({ level, className = '' }: { level: RiskLevel; className?: string }) {
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${RISK_BG[level]} ${RISK_BORDER[level]} ${className}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: {
            low: '#059669',
            medium: '#d97706',
            high: '#ea580c',
            critical: '#dc2626',
          }[level],
        }}
      />
      {label}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
      {category}
    </span>
  );
}
