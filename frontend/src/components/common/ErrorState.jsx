import React from "react";
import { AlertCircle, RefreshCw, WifiOff, ShieldAlert } from "lucide-react";
import { AnimatedButton } from "../motion/MotionSystem";

/**
 * Enterprise Inline Error & Failure State Component
 * Masks raw stacktraces and presents actionable, clear recovery options.
 */
export default function ErrorState({
  title = "Unable to load data",
  error,
  variant = "network", // 'network' | 'forbidden' | 'generic'
  onRetry,
  retrying = false,
  className = "",
}) {
  const isNetwork =
    variant === "network" ||
    (typeof error === "string" &&
      (error.toLowerCase().includes("network") ||
        error.toLowerCase().includes("failed to fetch") ||
        error.toLowerCase().includes("offline")));

  const isForbidden =
    variant === "forbidden" ||
    (typeof error === "string" &&
      (error.toLowerCase().includes("403") ||
        error.toLowerCase().includes("permission") ||
        error.toLowerCase().includes("unauthorized")));

  const Icon = isForbidden ? ShieldAlert : isNetwork ? WifiOff : AlertCircle;

  const displayTitle = isForbidden
    ? "Access Permission Required"
    : isNetwork
    ? "Connection Interrupted"
    : title;

  const displayMessage = isForbidden
    ? "You do not have administrative authorization to inspect this resource. Contact your MSDE or State Administrator."
    : isNetwork
    ? "Unable to reach the KaushalNexus service. Please check your network connection or try again."
    : typeof error === "string"
    ? error
    : error?.message || "An unexpected error occurred while processing your request.";

  return (
    <div
      className={`rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-6 sm:p-8 text-center ${className}`}
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mb-3 shadow-xs">
        <Icon size={22} strokeWidth={2} />
      </div>

      <h3 className="font-heading text-sm sm:text-base font-bold text-slate-900 dark:text-white">
        {displayTitle}
      </h3>

      <p className="mt-1.5 mx-auto max-w-md text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        {displayMessage}
      </p>

      {onRetry && !isForbidden && (
        <div className="mt-5 flex justify-center">
          <AnimatedButton
            onClick={onRetry}
            loading={retrying}
            className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold shadow-xs"
            icon={RefreshCw}
            iconPosition="left"
          >
            {retrying ? "Retrying Connection..." : "Retry Request"}
          </AnimatedButton>
        </div>
      )}
    </div>
  );
}
