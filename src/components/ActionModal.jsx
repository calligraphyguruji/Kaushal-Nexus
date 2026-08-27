import { X, CheckCircle2 } from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function ActionModal({
  isOpen,
  onClose,
  title = "Institutional Action",
  subtitle = "KaushalNexus Skilling Intelligence System",
  children,
  confirmText = "Execute Action",
  onConfirm,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="indigo" size="sm">
                Policy & Execution Engine
              </StatusBadge>
            </div>
            <h3 className="mt-1.5 text-base font-bold text-slate-900 sm:text-lg">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-xs sm:text-sm text-slate-600">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
          {confirmText && (
            <button
              type="button"
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition active:scale-[0.98]"
            >
              <CheckCircle2 size={14} />
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
