import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * TechStatCard
 * High-density metric card with monospace telemetry typography, supporting Light Mode & Cyber-Navy Dark Mode.
 */
export default function TechStatCard({
  title,
  value,
  subtitle,
  trend,
  trendDirection = "up",
  icon: Icon,
  variant = "cyan",
  footerText,
  className = "",
}) {
  const variantStyles = {
    cyan: {
      border: "hover:border-sky-500/40 dark:hover:border-sky-400/40",
      valueColor: "text-sky-600 dark:text-sky-400",
      iconBg: "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-400/20",
    },
    emerald: {
      border: "hover:border-emerald-500/40 dark:hover:border-emerald-400/40",
      valueColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-400/20",
    },
    amber: {
      border: "hover:border-amber-500/40 dark:hover:border-amber-400/40",
      valueColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-400/20",
    },
    indigo: {
      border: "hover:border-indigo-500/40 dark:hover:border-indigo-400/40",
      valueColor: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-400/20",
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.cyan;

  return (
    <div
      className={`group relative rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 transition-colors ${currentVariant.border} ${className}`}
    >

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className={`font-mono text-3xl font-extrabold tracking-tight ${currentVariant.valueColor}`}>
            {value}
          </div>
        </div>

        {Icon && (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg border ${currentVariant.iconBg}`}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-[#1e293b] pt-3 text-xs">
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
              {subtitle}
            </span>
          )}

          {trend && (
            <div
              className={`flex items-center gap-1 font-mono text-[11px] font-bold ${
                trendDirection === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : trendDirection === "down"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {trendDirection === "up" ? (
                <TrendingUp size={13} />
              ) : trendDirection === "down" ? (
                <TrendingDown size={13} />
              ) : (
                <Minus size={13} />
              )}
              <span>{trend}</span>
            </div>
          )}
        </div>
      )}

      {footerText && (
        <div className="mt-2.5 border-t border-slate-100 dark:border-[#1e293b] pt-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">
          {footerText}
        </div>
      )}
    </div>
  );
}
