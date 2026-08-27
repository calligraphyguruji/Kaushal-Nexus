import { useState } from "react";
import {
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import StatusBadge from "../components/StatusBadge";

export default function Settings() {
  const [synced, setSynced] = useState(false);
  const [retentionTarget, setRetentionTarget] = useState(80);
  const [gapThreshold, setGapThreshold] = useState(65);

  const handleManualSync = () => {
    setSynced(true);
    setTimeout(() => setSynced(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Platform Governance"
        badgeVariant="neutral"
        title="Platform & Policy Settings"
        description="Configure longitudinal tracking parameters, verification sources, and national data synchronization intervals."
        breadcrumbs={["Administration", "Settings"]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Configuration */}
        <div className="space-y-6 lg:col-span-2">
          {/* Longitudinal Outcome Parameters */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6">
            <SectionHeader
              title="Longitudinal Tracking Benchmarks"
              subtitle="Define state and scheme-level outcome thresholds for intervention alerts."
            />

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800">
                  <span>Minimum 6-Month Employment Retention Target</span>
                  <span className="font-bold text-blue-700 tabular-nums">{retentionTarget}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="95"
                  value={retentionTarget}
                  onChange={(e) => setRetentionTarget(Number(e.target.value))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Cohorts falling below this rate are automatically flagged for curriculum audit.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between text-xs font-semibold text-slate-800">
                  <span>Critical Skill Gap Trigger Threshold</span>
                  <span className="font-bold text-rose-700 tabular-nums">{gapThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="90"
                  value={gapThreshold}
                  onChange={(e) => setGapThreshold(Number(e.target.value))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-rose-600"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Employer demand-to-supply deltas exceeding this limit activate regional bridge training mandates.
                </p>
              </div>
            </div>
          </div>

          {/* Verification Integrations */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6">
            <SectionHeader
              title="Institutional Data Pipelines & APIs"
              subtitle="Real-time verification sources powering the KaushalNexus intelligence pipeline."
            />

            <div className="mt-4 divide-y divide-slate-100">
              {[
                {
                  name: "UIDAI / Aadhaar Beneficiary Verification",
                  type: "Identity Authentication",
                  status: "Connected · 99.4% Match",
                  variant: "success",
                },
                {
                  name: "NCVET National Qualification Register (NQR)",
                  type: "Curriculum & NSQF Alignment",
                  status: "Connected · Version 2026.1",
                  variant: "success",
                },
                {
                  name: "EPFO & National Career Service (NCS)",
                  type: "Longitudinal Employment & PF Verification",
                  status: "Active Webhook",
                  variant: "success",
                },
                {
                  name: "State Skill Mission ERP (UPSDM)",
                  type: "Training Center Assessment Feed",
                  status: "Hourly Polling",
                  variant: "indigo",
                },
              ].map((pipe) => (
                <div key={pipe.name} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{pipe.name}</p>
                    <p className="text-[11px] text-slate-500">{pipe.type}</p>
                  </div>
                  <StatusBadge variant={pipe.variant} size="sm" dot>
                    {pipe.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: System Health & Audit */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200/80 bg-white p-5">
            <SectionHeader title="System Integrity" />
            <div className="mt-4 space-y-2.5">
              <div className="rounded-lg bg-slate-50 p-3 text-xs border border-slate-100">
                <span className="text-slate-500 font-medium">Database Records:</span>
                <p className="mt-0.5 font-bold text-slate-900 tabular-nums">28,450 Beneficiaries · 142 Districts</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-xs border border-slate-100">
                <span className="text-slate-500 font-medium">Last Data Audit:</span>
                <p className="mt-0.5 font-bold text-slate-900">Today, 08:30 AM IST (Automated)</p>
              </div>

              <button
                type="button"
                onClick={handleManualSync}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <RefreshCw size={13} className={synced ? "animate-spin text-blue-600" : ""} />
                {synced ? "Synchronization Complete!" : "Trigger On-Demand Sync"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-blue-700" />
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                SIH 2026 Audit-Ready Mode
              </h4>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-blue-900/80">
              All metrics displayed in this portal conform to Ministry of Skill Development & Entrepreneurship (MSDE) measurement guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
