import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Check,
  ScrollText,
  Lock,
  Search,
  SlidersHorizontal,
  Server,
  AlertCircle,
  Clock,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import StatusBadge from "../components/StatusBadge";
import StateView from "../components/StateView";
import { useTheme } from "../context/ThemeContext";
import { usePermissions } from "../hooks/usePermissions";
import { auditApi } from "../api/audit";
import { getErrorMessage } from "../api/client";

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "preferences";
  const { theme, setTheme, resolvedTheme } = useTheme();
  const permissions = usePermissions();

  const [retentionTarget, setRetentionTarget] = useState(80);
  const [gapThreshold, setGapThreshold] = useState(65);

  // Audit Logs Live Data
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [auditSearch, setAuditSearch] = useState("");
  const [epfoSyncLoading, setEpfoSyncLoading] = useState(false);
  const [sidSyncLoading, setSidSyncLoading] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const fetchAuditLogs = useCallback(async () => {
    if (!permissions.canViewAuditLogs) return;
    try {
      setAuditLoading(true);
      setAuditError(null);
      const data = await auditApi.getLogs({ limit: 50 });
      setAuditLogs(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      setAuditError(getErrorMessage(err));
    } finally {
      setAuditLoading(false);
    }
  }, [permissions.canViewAuditLogs]);

  useEffect(() => {
    if (activeTab === "audit" && permissions.canViewAuditLogs) {
      fetchAuditLogs();
    }
  }, [activeTab, permissions.canViewAuditLogs, fetchAuditLogs]);

  const handleTriggerEPFOSync = async () => {
    if (!permissions.canRunEPFOSync) return;
    try {
      setEpfoSyncLoading(true);
      setSyncStatusMsg(null);
      // Simulate live webhook trigger
      await new Promise((r) => setTimeout(r, 1200));
      setSyncStatusMsg("✅ EPFO Wage & Retention webhook polling triggered successfully.");
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err) {
      alert(`EPFO Sync failed: ${getErrorMessage(err)}`);
    } finally {
      setEpfoSyncLoading(false);
    }
  };

  const handleTriggerSIDSync = async () => {
    if (!permissions.canRunSIDSync) return;
    try {
      setSidSyncLoading(true);
      setSyncStatusMsg(null);
      await new Promise((r) => setTimeout(r, 1200));
      setSyncStatusMsg("✅ Skill India Digital (SID) learner registry sync complete.");
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err) {
      alert(`SID Sync failed: ${getErrorMessage(err)}`);
    } finally {
      setSidSyncLoading(false);
    }
  };

  const themeOptions = [
    {
      id: "light",
      name: "Light Mode",
      description: "Clean high-contrast daytime interface for bright office environments.",
      icon: Sun,
      iconColor: "text-amber-400",
    },
    {
      id: "dark",
      name: "Dark Mode",
      description: "Deep Cyber-Navy palette engineered for low eye strain during data auditing.",
      icon: Moon,
      iconColor: "text-sky-400",
    },
    {
      id: "system",
      name: "System Default",
      description: "Automatically matches your operating system preference dynamically.",
      icon: Monitor,
      iconColor: "text-slate-300",
    },
  ];

  const filteredLogs = auditLogs.filter((log) => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.resource_type?.toLowerCase().includes(q) ||
      log.resource_id?.toLowerCase().includes(q) ||
      log.actor_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 font-sans text-[#f1f5f9]">
      {/* =====================================================
          1. PAGE HEADER
      ====================================================== */}
      <PageHeader
        badge="SYSTEM CONFIGURATION"
        badgeVariant="cyan"
        title="Settings"
        description="Configure longitudinal tracking parameters, verification sources, theme preferences, and inspect compliance audit trails."
        breadcrumbs={["Administration", "Settings"]}
      />

      {/* =====================================================
          2. NAVIGATION TABS
      ====================================================== */}
      <div className="flex border-b border-[#1e293b] overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange("preferences")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-xs font-semibold transition cursor-pointer shrink-0 ${
            activeTab === "preferences"
              ? "border-sky-400 text-sky-400 bg-sky-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>Platform Preferences</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("pipelines")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-xs font-semibold transition cursor-pointer shrink-0 ${
            activeTab === "pipelines"
              ? "border-sky-400 text-sky-400 bg-sky-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Server size={14} />
          <span>Data Pipelines &amp; Integrations</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("audit")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-xs font-semibold transition cursor-pointer shrink-0 ${
            activeTab === "audit"
              ? "border-sky-400 text-sky-400 bg-sky-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ScrollText size={14} />
          <span>Compliance Audit Logs</span>
          <span className="rounded border border-indigo-500/30 bg-indigo-950/40 px-1.5 py-0.2 font-mono text-[9px] font-bold text-indigo-300">
            Privileged
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("privacy")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-xs font-semibold transition cursor-pointer shrink-0 ${
            activeTab === "privacy"
              ? "border-sky-400 text-sky-400 bg-sky-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Lock size={14} />
          <span>Privacy &amp; Consent</span>
          <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.2 font-mono text-[9px] font-bold text-emerald-300">
            DPDP-Aligned
          </span>
        </button>
      </div>

      {syncStatusMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 font-mono text-xs font-semibold text-emerald-200">
          {syncStatusMsg}
        </div>
      )}

      {/* =====================================================
          TAB 1: PREFERENCES
      ====================================================== */}
      {activeTab === "preferences" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Appearance & Theme Selector */}
            <div className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 shadow-sm">
              <SectionHeader
                title="Interface Appearance &amp; Theme"
                subtitle="Choose your preferred color theme for data visualization and navigation."
                badge={
                  <StatusBadge variant="info" size="sm">
                    Active: {resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}
                  </StatusBadge>
                }
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = theme === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTheme(opt.id)}
                      className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-sky-400/50 bg-[#0f1c33] shadow-xs ring-1 ring-sky-400/30"
                          : "border-[#1e293b] bg-[#070d18] hover:border-slate-700 hover:bg-[#0b1528]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1e293b] bg-[#0b1528]">
                            <Icon size={16} className={opt.iconColor} />
                          </div>
                          {isSelected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-slate-950">
                              <Check size={12} strokeWidth={2.5} />
                            </span>
                          )}
                        </div>

                        <h4 className="mt-3 font-heading text-xs font-bold text-white">
                          {opt.name}
                        </h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Longitudinal Outcome Parameters */}
            <div className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 shadow-sm">
              <SectionHeader
                title="Longitudinal Tracking Benchmarks"
                subtitle="Define state and scheme-level outcome thresholds for intervention alerts."
              />

              <div className="mt-5 space-y-4 font-sans">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Minimum 6-Month Employment Retention Target</span>
                    <span className="font-mono font-bold text-sky-400 tabular-nums">
                      {retentionTarget}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="95"
                    value={retentionTarget}
                    onChange={(e) => setRetentionTarget(Number(e.target.value))}
                    className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#070d18] accent-sky-400"
                  />
                  <p className="mt-1 font-mono text-[11px] text-slate-400">
                    Cohorts falling below this rate are automatically flagged for curriculum audit.
                  </p>
                </div>

                <div className="border-t border-[#1e293b] pt-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Critical Skill Gap Trigger Threshold</span>
                    <span className="font-mono font-bold text-rose-400 tabular-nums">
                      {gapThreshold}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="90"
                    value={gapThreshold}
                    onChange={(e) => setGapThreshold(Number(e.target.value))}
                    className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#070d18] accent-rose-500"
                  />
                  <p className="mt-1 font-mono text-[11px] text-slate-400">
                    Employer demand-to-supply deltas exceeding this limit activate regional bridge training mandates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-sky-400" />
                <h4 className="font-heading text-xs font-bold text-white uppercase tracking-wide">
                  Authoritative Security Baseline
                </h4>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                All platform endpoints enforce strict institutional RBAC, user scope boundaries,
                and automated PII redaction.
              </p>
              <div className="mt-4 space-y-2 border-t border-[#1e293b] pt-3 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>RBAC Enforcement:</span>
                  <span className="text-emerald-400 font-semibold">Active Strict</span>
                </div>
                <div className="flex justify-between">
                  <span>Session Security:</span>
                  <span className="text-sky-400 font-semibold">HTTP-Only / JWT</span>
                </div>
                <div className="flex justify-between">
                  <span>PII Redaction:</span>
                  <span className="text-slate-200">Aadhaar/Phone Masked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          TAB 2: PIPELINES & INTEGRATIONS
      ====================================================== */}
      {activeTab === "pipelines" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 shadow-sm">
            <SectionHeader
              title="Institutional Data Pipelines &amp; Adapters"
              subtitle="Integration-ready verification architecture with sandbox/mock adapters for demonstration."
            />

            <div className="mt-4 divide-y divide-[#1e293b]">
              {[
                {
                  name: "UIDAI / Aadhaar Beneficiary Verification",
                  type: "Identity Authentication (Sandbox Adapter)",
                  status: "Mock Adapter Active",
                  variant: "info",
                  canTrigger: false,
                },
                {
                  name: "NCVET National Qualification Register (NQR)",
                  type: "Curriculum & NSQF Alignment",
                  status: "Aligned Qualification Model",
                  variant: "success",
                  canTrigger: false,
                },
                {
                  name: "EPFO & National Career Service (NCS)",
                  type: "Longitudinal Employment & PF Verification",
                  status: "Sandbox Adapter (Demo Sync)",
                  variant: "indigo",
                  canTrigger: permissions.canRunEPFOSync,
                  triggerLabel: "Trigger EPFO Mock Sync",
                  onTrigger: handleTriggerEPFOSync,
                  loading: epfoSyncLoading,
                },
                {
                  name: "Skill India Digital (SID) Central Registry",
                  type: "Candidate Enrolment & Training Center Feed",
                  status: "Sandbox Pipeline Active",
                  variant: "indigo",
                  canTrigger: permissions.canRunSIDSync,
                  triggerLabel: "Trigger SID Mock Sync",
                  onTrigger: handleTriggerSIDSync,
                  loading: sidSyncLoading,
                },
              ].map((pipe) => (
                <div
                  key={pipe.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-heading text-xs font-semibold text-white">
                      {pipe.name}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">{pipe.type}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge variant={pipe.variant} size="sm" dot>
                      {pipe.status}
                    </StatusBadge>

                    {pipe.canTrigger && (
                      <button
                        type="button"
                        onClick={pipe.onTrigger}
                        disabled={pipe.loading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#070d18] px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-200 hover:border-slate-700 hover:bg-[#0f1c33] disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw
                          size={12}
                          className={pipe.loading ? "animate-spin text-sky-400" : "text-sky-400"}
                        />
                        <span>{pipe.loading ? "Syncing..." : pipe.triggerLabel}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          TAB 3: COMPLIANCE AUDIT LOGS
      ====================================================== */}
      {activeTab === "audit" && (
        <div>
          {!permissions.canViewAuditLogs ? (
            <StateView
              variant="forbidden"
              title="Audit Log Access Restricted"
              message="Access to compliance and security audit logs is restricted to MSDE Central Officers and System Administrators."
              actionLabel="Return to Platform Preferences"
              onAction={() => handleTabChange("preferences")}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:flex-row sm:items-center sm:justify-between shadow-sm">
                <div>
                  <SectionHeader
                    title="Compliance &amp; Security Audit Trail"
                    subtitle="Role-gated audit logging with PII redaction and correlation tracing."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="Search action or actor..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="h-8 w-52 rounded-lg border border-[#1e293b] bg-[#070d18] pl-8 pr-2.5 font-sans text-xs text-slate-200 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={fetchAuditLogs}
                    disabled={auditLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#070d18] px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-300 hover:border-slate-700 hover:bg-[#0f1c33] disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      size={12}
                      className={auditLoading ? "animate-spin text-sky-400" : "text-sky-400"}
                    />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {auditLoading ? (
                <StateView variant="loading" title="Querying Compliance Audit Logs..." />
              ) : auditError ? (
                <StateView
                  variant="error"
                  title="Failed to Load Audit Logs"
                  message={auditError}
                  onAction={fetchAuditLogs}
                  actionLabel="Retry Query"
                />
              ) : filteredLogs.length === 0 ? (
                <StateView
                  variant="empty"
                  title="No Audit Logs Found"
                  message="No compliance audit records match your query."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#1e293b] bg-[#0b1528] shadow-sm">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#1e293b] bg-[#070d18] text-slate-400">
                        <th className="px-4 py-3 font-semibold">Timestamp (UTC)</th>
                        <th className="px-4 py-3 font-semibold">Action</th>
                        <th className="px-4 py-3 font-semibold">Resource</th>
                        <th className="px-4 py-3 font-semibold">Actor ID</th>
                        <th className="px-4 py-3 font-semibold">Correlation ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                      {filteredLogs.map((log, idx) => (
                        <tr
                          key={log.id || idx}
                          className="hover:bg-[#0f1c33] transition-colors"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-400">
                            {log.timestamp || new Date().toISOString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded border border-[#1e293b] bg-[#070d18] px-2 py-0.5 text-[10px] font-bold text-sky-400">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            <span className="font-semibold text-white">{log.resource_type}</span>
                            {log.resource_id && (
                              <span className="ml-1.5 text-[10px] text-slate-400">
                                {log.resource_id}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-300">
                            {log.actor_id || "System Engine"}
                          </td>
                          <td className="px-4 py-3 text-[10px] text-slate-400">
                            {log.correlation_id || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          TAB 4: PRIVACY & CONSENT GOVERNANCE
      ====================================================== */}
      {activeTab === "privacy" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1e293b] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
                    <ShieldCheck size={18} />
                  </span>
                  <h3 className="font-heading text-base font-bold text-white">
                    Beneficiary Consent &amp; Data Privacy Governance
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  KaushalNexus incorporates privacy controls aligned with relevant DPDP principles, including consent, purpose limitation, data minimization and accountability. Candidate consents are explicitly tracked with purpose-limitation, immutable audit timestamps, and automated revocation compliance.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 font-mono text-xs font-semibold text-emerald-300 shrink-0">
                <Check size={12} /> DPDP Act Aligned
              </span>
            </div>

            {/* Tracking Authorization Matrix */}
            <div className="mt-6">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Tracking Permission Categories &amp; Enforcement Rules
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#1e293b] bg-[#070d18] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-semibold text-xs text-white">
                      Follow-Up Communication
                    </span>
                    <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                      Active Guardrail
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                    Governs automated 30, 90, 180, and 365-day milestone outreach. If consent is revoked, all dispatch queues immediately skip candidate outreach.
                  </p>
                  <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-slate-500">
                    <Clock size={11} /> <span>Revocation latency: &lt;10ms (Synchronous check)</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#1e293b] bg-[#070d18] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-semibold text-xs text-white">
                      Wage Progression Verification
                    </span>
                    <span className="rounded border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                      Range-Based Minimization
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                    Protects sensitive compensation details. Employs wage brackets and percentage deltas rather than granular transaction ledger pulls.
                  </p>
                  <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-slate-500">
                    <Lock size={11} /> <span>Anonymized in aggregated state metrics</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#1e293b] bg-[#070d18] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-semibold text-xs text-white">
                      Micro-Enterprise &amp; Self-Employment
                    </span>
                    <span className="rounded border border-indigo-500/30 bg-indigo-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
                      Field Verified
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                    Tracks entrepreneurial ventures, Udyam MSME credentials, and revenue bands with dual-signature assessor sign-off.
                  </p>
                  <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-slate-500">
                    <Check size={11} /> <span>Dual verification audit trail enabled</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#1e293b] bg-[#070d18] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-semibold text-xs text-white">
                      Epistemic AI Inference Standard
                    </span>
                    <span className="rounded border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      Strict Guardrail
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                    Ensures AI models express correlations (&quot;associated with&quot;, &quot;observed pattern&quot;) without asserting unsubstantiated causality in candidate dossiers.
                  </p>
                  <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-slate-500">
                    <AlertCircle size={11} /> <span>Non-causal phrasing enforced</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
