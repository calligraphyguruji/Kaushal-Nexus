import {
  ShieldAlert,
  Lock,
  SearchX,
  AlertTriangle,
  Inbox,
  Loader2,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

/**
 * Enterprise state view component for handling Loading, Empty, 401, 403, 404, and 500 states.
 */
export default function StateView({
  variant = "empty", // "loading" | "empty" | "forbidden" | "unauthorized" | "notfound" | "error"
  title,
  message,
  actionLabel,
  onAction,
  backLink,
  backLabel = "Back to Dashboard",
  badge,
}) {
  if (variant === "loading") {
    return (
      <div className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600 dark:text-blue-400" />
        <h4 className="mt-4 text-sm font-bold text-slate-900 dark:text-slate-100">
          {title || "Loading Intelligence Records..."}
        </h4>
        <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
          {message || "Querying secure institutional telemetry and longitudinal benchmarks."}
        </p>
      </div>
    );
  }

  if (variant === "forbidden") {
    return (
      <div className="flex min-h-[340px] w-full flex-col items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50/40 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800 shadow-xs dark:bg-amber-900/60 dark:text-amber-300">
          <Lock size={24} strokeWidth={2.2} />
        </div>

        <div className="mt-4">
          <StatusBadge variant="warning" size="sm" dot>
            {badge || "HTTP 403 · Access Restricted"}
          </StatusBadge>
        </div>

        <h3 className="mt-3 text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
          {title || "Institutional Scope & Access Restricted"}
        </h3>

        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
          {message ||
            "You don't have permission to access this resource, or this candidate/district is outside your authorized institutional scope."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <RefreshCw size={13} />
              {actionLabel || "Retry Authorized Request"}
            </button>
          )}

          {backLink && (
            <Link
              to={backLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={13} />
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (variant === "unauthorized") {
    return (
      <div className="flex min-h-[340px] w-full flex-col items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/40 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-800 shadow-xs dark:bg-rose-900/60 dark:text-rose-300">
          <ShieldAlert size={24} strokeWidth={2.2} />
        </div>

        <div className="mt-4">
          <StatusBadge variant="danger" size="sm" dot>
            {badge || "HTTP 401 · Unauthorized"}
          </StatusBadge>
        </div>

        <h3 className="mt-3 text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
          {title || "Authentication Session Expired"}
        </h3>

        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
          {message || "Your institutional security token has expired or is invalid. Please sign in again."}
        </p>

        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Sign In with Institutional ID
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "notfound") {
    return (
      <div className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-xs dark:bg-slate-800 dark:text-slate-300">
          <SearchX size={24} strokeWidth={2.2} />
        </div>

        <div className="mt-4">
          <StatusBadge variant="neutral" size="sm">
            {badge || "HTTP 404 · Record Not Found"}
          </StatusBadge>
        </div>

        <h3 className="mt-3 text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
          {title || "Requested Record Not Found"}
        </h3>

        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
          {message || "The candidate, district, or mandate identifier could not be located in the database."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {backLink && (
            <Link
              to={backLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={13} />
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (variant === "error") {
    return (
      <div className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-xl border border-rose-200/80 bg-white p-8 text-center dark:border-rose-900/50 dark:bg-slate-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 shadow-xs dark:bg-rose-950/60 dark:text-rose-400">
          <AlertTriangle size={24} strokeWidth={2.2} />
        </div>

        <h3 className="mt-4 text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
          {title || "Telemetry Synchronization Error"}
        </h3>

        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
          {message || "An unexpected error occurred while communicating with the backend services."}
        </p>

        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <RefreshCw size={13} />
            {actionLabel || "Retry Request"}
          </button>
        )}
      </div>
    );
  }

  // Default: Empty state
  return (
    <div className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-2xs dark:bg-slate-900 dark:text-slate-500">
        <Inbox size={22} strokeWidth={2} />
      </div>

      <h4 className="mt-3.5 text-sm font-bold text-slate-900 dark:text-slate-100">
        {title || "No Matching Records Found"}
      </h4>

      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
        {message || "No telemetry records or candidate dossiers match your current filter parameters."}
      </p>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {actionLabel || "Reset Filters"}
        </button>
      )}
    </div>
  );
}
