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
        <div className="flex items-center justify-between gap-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>

          {Icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition-colors group-hover:bg-slate-100 group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-750 dark:group-hover:text-slate-200">
              <Icon size={17} strokeWidth={1.8} />
            </div>
          )}
        </div>

        {/* Dominant Metric Value */}
        <div className="mt-3">
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 tabular-nums dark:text-slate-50">
            {value}
          </h3>
        </div>

        {/* Metric Delta & Context */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          {change && (
            <span
              className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
              }`}
            >
              {isPositive ? (
                <TrendingUp size={14} strokeWidth={2.2} />
              ) : (
                <TrendingDown size={14} strokeWidth={2.2} />
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
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {/* Footer / Context highlight */}
      {highlight && (
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600 font-semibold truncate dark:border-slate-800 dark:text-slate-300">
          {highlight}
        </div>
      )}
    </div>
  );
}