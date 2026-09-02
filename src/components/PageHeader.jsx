import StatusBadge from "./StatusBadge";

export default function PageHeader({
  badge = "KaushalNexus Intelligence",
  badgeVariant = "indigo",
  title,
  description,
  actions,
  breadcrumbs,
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
      <div className="min-w-0 flex-1">
        {breadcrumbs && (
          <nav className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <span className="text-slate-300 dark:text-slate-600">/</span>}
                <span className={idx === breadcrumbs.length - 1 ? "font-semibold text-slate-700 dark:text-slate-200" : ""}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {badge && (
            <StatusBadge variant={badgeVariant} size="sm" dot>
              {badge}
            </StatusBadge>
          )}
        </div>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-slate-50">
          {title}
        </h1>

        {description && (
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-end">
          {actions}
        </div>
      )}
    </header>
  );
}
