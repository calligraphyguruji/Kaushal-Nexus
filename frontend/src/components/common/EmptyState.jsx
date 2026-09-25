import React from "react";
import { FolderSearch, RotateCcw, ArrowRight } from "lucide-react";
import { AnimatedButton } from "../motion/MotionSystem";

/**
 * Enterprise EmptyState Component
 * Explains:
 * 1. What happened (title)
 * 2. Why the user sees it (message)
 * 3. What action they can take (action / secondaryAction)
 */
export default function EmptyState({
  icon: Icon = FolderSearch,
  title = "No Records Found",
  message = "No matching items found for your current criteria. Try adjusting your query or resetting filters.",
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-[#262320] bg-slate-50/50 dark:bg-[#141210]/40 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#1c1917] text-slate-500 dark:text-slate-400 mb-4 shadow-xs">
        <Icon size={24} strokeWidth={1.75} />
      </div>

      <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-1.5 max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        {message}
      </p>

      {(actionLabel || secondaryLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <AnimatedButton
              onClick={onAction}
              className="rounded-lg bg-blue-600 dark:bg-white text-white dark:text-slate-950 px-4 py-2 text-xs font-semibold hover:bg-blue-700 dark:hover:bg-slate-100 shadow-xs"
              icon={RotateCcw}
              iconPosition="left"
            >
              {actionLabel}
            </AnimatedButton>
          )}

          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-lg border border-slate-200 dark:border-[#262320] bg-white dark:bg-[#141210] px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#191613] transition cursor-pointer"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
