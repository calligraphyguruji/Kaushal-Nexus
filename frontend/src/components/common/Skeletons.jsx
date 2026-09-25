import React from "react";

/**
 * Base Shimmering Skeleton Element
 */
export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800/60 ${className}`}
    />
  );
}

/**
 * CardSkeleton: Structured skeleton for cards
 */
export function CardSkeleton({ rows = 3, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 dark:border-[#262320] bg-white dark:bg-[#141210] p-5 shadow-xs ${className}`}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <Skeleton
            key={idx}
            className={`h-3 ${idx === rows - 1 ? "w-4/5" : "w-full"}`}
          />
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-[#262320] pt-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * MetricSkeleton: For TechStatCard / KPI cards
 */
export function MetricSkeleton({ className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 dark:border-[#262320] bg-white dark:bg-[#141210] p-4 sm:p-5 shadow-xs space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

/**
 * TableSkeleton: Structured skeleton for candidate and placement tables
 */
export function TableSkeleton({ rows = 5, columns = 4, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-[#262320] bg-white dark:bg-[#141210] p-4 overflow-hidden ${className}`}
    >
      {/* Table Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#262320] pb-3 mb-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-[#1c1917]">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center gap-4 py-3.5">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <Skeleton
                key={cIdx}
                className={`h-3.5 ${
                  cIdx === 0
                    ? "w-1/4"
                    : cIdx === columns - 1
                    ? "w-16 ml-auto"
                    : "flex-1"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ChartSkeleton: Shimmering placeholder for area & line charts
 */
export function ChartSkeleton({ height = "h-64", className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-[#262320] bg-white dark:bg-[#141210] p-5 shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
      <div className={`w-full ${height} flex items-end gap-3 pt-6`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${30 + (i * 9) % 65}%` }}
          />
        ))}
      </div>
    </div>
  );
}
