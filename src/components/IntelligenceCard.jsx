import { BrainCircuit, ArrowUpRight, CheckCircle2, AlertTriangle } from "lucide-react";

export default function IntelligenceCard({
  category = "National Intelligence Signal",
  title,
  description,
  confidence = "98.2% Confidence",
  sampleSize = "28,450 records analyzed",
  actionText = "Review Intervention Protocol",
  onAction,
  type = "primary", // primary, warning, success
}) {
  const typeStyles = {
    primary: {
      border: "border-slate-800 bg-slate-900 text-white dark:border-slate-750 dark:bg-slate-900/90",
      badge: "bg-slate-800 text-blue-300 border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700",
      iconBg: "bg-slate-800 text-blue-400 border border-slate-700 dark:bg-slate-800 dark:text-blue-400",
      button: "bg-white text-slate-900 hover:bg-slate-100 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500",
      bodyText: "text-slate-300 dark:text-slate-300",
      metaText: "text-slate-400 dark:text-slate-400",
    },
    warning: {
      border: "border-amber-200 bg-amber-50/70 text-slate-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100",
      badge: "bg-amber-100 text-amber-900 border-amber-300/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80",
      iconBg: "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
      button: "bg-amber-900 text-white hover:bg-amber-950 dark:bg-amber-600 dark:hover:bg-amber-500",
      bodyText: "text-slate-600 dark:text-slate-300",
      metaText: "text-slate-500 dark:text-slate-400",
    },
    success: {
      border: "border-emerald-200 bg-emerald-50/70 text-slate-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100",
      badge: "bg-emerald-100 text-emerald-900 border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80",
      iconBg: "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
      button: "bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-600 dark:hover:bg-emerald-500",
      bodyText: "text-slate-600 dark:text-slate-300",
      metaText: "text-slate-500 dark:text-slate-400",
    },
  };

  const current = typeStyles[type] || typeStyles.primary;

  return (
    <div className={`rounded-xl border p-5 sm:p-6 transition-all ${current.border}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${current.iconBg}`}>
            {type === "warning" ? (
              <AlertTriangle size={18} strokeWidth={2} />
            ) : type === "success" ? (
              <CheckCircle2 size={18} strokeWidth={2} />
            ) : (
              <BrainCircuit size={18} strokeWidth={2} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${current.badge}`}>
                {category}
              </span>
              <span className={`text-[11px] font-medium ${current.metaText}`}>
                {confidence} · {sampleSize}
              </span>
            </div>

            <h3 className="mt-1.5 text-base font-bold sm:text-lg tracking-tight">
              {title}
            </h3>

            <p className={`mt-1 text-xs leading-relaxed sm:text-sm max-w-3xl ${current.bodyText}`}>
              {description}
            </p>
          </div>
        </div>

        {actionText && (
          <button
            type="button"
            onClick={onAction}
            className={`group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] ${current.button}`}
          >
            <span>{actionText}</span>
            <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}
