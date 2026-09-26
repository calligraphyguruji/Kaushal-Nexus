export default function SectionHeader({
  title,
  subtitle,
  badge,
  actions,
  className = "",
}) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
