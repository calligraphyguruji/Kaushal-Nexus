import { TrendingUp } from "lucide-react";

export default function StatCard({
  title,
  value,
  change,
  description,
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] sm:p-6">

      {/* Header */}
      <div className="flex min-w-0 items-start justify-between gap-3">

        <p className="min-w-0 text-sm font-semibold leading-5 text-slate-500">
          {title}
        </p>

        <div className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
          <TrendingUp size={12} />
          {change}
        </div>

      </div>


      {/* Value */}
      <div className="mt-4">

        <h3 className="truncate text-3xl font-extrabold tracking-tight text-slate-950">
          {value}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>

      </div>

    </div>
  );
}