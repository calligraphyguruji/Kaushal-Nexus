export default function StatusBadge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
}) {
  const variantStyles = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-800 border-amber-200/80",
    danger: "bg-rose-50 text-rose-800 border-rose-200/80",
    info: "bg-blue-50 text-blue-800 border-blue-200/80",
    indigo: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
    purple: "bg-purple-50 text-purple-800 border-purple-200/80",
    neutral: "bg-slate-100 text-slate-700 border-slate-200/80",
    dark: "bg-slate-900 text-slate-100 border-slate-800",
  };

  const dotStyles = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-blue-600",
    indigo: "bg-indigo-600",
    purple: "bg-purple-600",
    neutral: "bg-slate-400",
    dark: "bg-emerald-400",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] font-semibold",
    md: "px-2.5 py-0.5 text-[11px] font-semibold",
    lg: "px-3 py-1 text-xs font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide transition-colors ${
        variantStyles[variant] || variantStyles.neutral
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            dotStyles[variant] || dotStyles.neutral
          }`}
        />
      )}
      {children}
    </span>
  );
}
