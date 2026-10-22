interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="p-2.5 rounded-lg bg-slate-800 text-white mt-0.5">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
