import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({
  title,
  value,
  change,
  trend = "up",
  period = "vs previous period",
  subtitle,
  highlight,
  icon: Icon,
  onClick,
}) {
  const isPositive = trend === "up";

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 transition-all duration-150 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900 dark:hover:border-slate-700 ${
        onClick ? "cursor-pointer active:scale-[0.99]" : ""
      }`}
    >
      <div>
        {/* Card Header: Label & Optional Context Icon */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>

          {Icon && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-500 transition-colors group-hover:bg-slate-100 group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-750 dark:group-hover:text-slate-200">
              <Icon size={15} strokeWidth={1.8} />
            </div>
          )}
        </div>

        {/* Dominant Metric Value */}
        <div className="mt-2.5">
          <h3 className="text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-slate-50">
            {value}
          </h3>
        </div>

        {/* Metric Delta & Context */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          {change && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${
                isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
              }`}
            >
              {isPositive ? (
                <TrendingUp size={13} strokeWidth={2.2} />
              ) : (
                <TrendingDown size={13} strokeWidth={2.2} />
              )}
              {change}
            </span>
          )}
          {period && (
            <span className="text-slate-400 font-normal dark:text-slate-500">{period}</span>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {/* Footer / Context highlight */}
      {highlight && (
        <div className="mt-3.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600 font-medium truncate dark:border-slate-800 dark:text-slate-400">
          {highlight}
        </div>
      )}
    </div>
  );
}