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
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
