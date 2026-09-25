import React from "react";

/**
 * InstitutionalBadge
 * Status indicator supporting Light Mode & Cyber-Navy Dark Mode with pulsing telemetry beacon.
 */
export default function InstitutionalBadge({
  label,
  secondaryText,
  variant = "cyan",
  pulse = true,
  size = "md",
  icon: Icon,
  className = "",
}) {
  const variantStyles = {
    cyan: {
      container: "bg-sky-50 dark:bg-[#0b1528] border-sky-300 dark:border-sky-400/40 text-sky-900 dark:text-slate-200 glow-cyan",
      beacon: "bg-sky-500 dark:bg-sky-400",
      primaryText: "text-sky-700 dark:text-sky-400 font-semibold",
      secondaryText: "text-slate-600 dark:text-slate-300 font-normal",
    },
    emerald: {
      container: "bg-emerald-50 dark:bg-[#062c1e]/70 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200",
      beacon: "bg-emerald-500 dark:bg-emerald-400",
      primaryText: "text-emerald-700 dark:text-emerald-400 font-semibold",
      secondaryText: "text-slate-600 dark:text-slate-300 font-normal",
    },
    amber: {
      container: "bg-amber-50 dark:bg-[#2d1b06]/70 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200",
      beacon: "bg-amber-500 dark:bg-amber-400",
      primaryText: "text-amber-700 dark:text-amber-400 font-semibold",
      secondaryText: "text-slate-600 dark:text-slate-300 font-normal",
    },
    indigo: {
      container: "bg-indigo-50 dark:bg-[#161b3d]/70 border-indigo-300 dark:border-indigo-500/40 text-indigo-900 dark:text-indigo-200 glow-indigo",
      beacon: "bg-indigo-500 dark:bg-indigo-400",
      primaryText: "text-indigo-700 dark:text-indigo-400 font-semibold",
      secondaryText: "text-slate-600 dark:text-slate-300 font-normal",
    },
    outline: {
      container: "bg-slate-100 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200",
      beacon: "bg-slate-500 dark:bg-slate-400",
      primaryText: "text-slate-700 dark:text-slate-200 font-medium",
      secondaryText: "text-slate-600 dark:text-slate-300 font-normal",
    },
  };

  const sizeStyles = {
    sm: "px-2.5 py-1 text-[10px] gap-1.5",
    md: "px-3.5 py-1.5 text-xs gap-2.5",
    lg: "px-4 py-2 text-sm gap-3",
  };

  const currentVariant = variantStyles[variant] || variantStyles.cyan;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <div
      className={`inline-flex items-center rounded-full border font-mono tracking-wide backdrop-blur-xs transition-colors duration-200 ${currentVariant.container} ${currentSize} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${currentVariant.beacon}`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${currentVariant.beacon}`}
          />
        </span>
      )}

      {Icon && <Icon size={size === "sm" ? 12 : 14} className="shrink-0" />}

      <span className={currentVariant.primaryText}>{label}</span>

      {secondaryText && (
        <>
          <span className="text-slate-500">•</span>
          <span className={currentVariant.secondaryText || "text-slate-300 font-normal"}>
            {secondaryText}
          </span>
        </>
      )}
    </div>
  );
}
