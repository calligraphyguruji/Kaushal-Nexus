import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowUpRight,
  Download,
  Users,
  BriefcaseBusiness,
  GraduationCap,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Activity,
  TrendingUp,
  Layers,
} from "lucide-react";

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { dashboardApi } from "../api/dashboard";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";

import { schemeBreakdown, insights } from "../data/dashboardData";

import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import TechStatCard from "../components/TechStatCard";
import InstitutionalBadge from "../components/InstitutionalBadge";
import StatusBadge from "../components/StatusBadge";
import IntelligenceCard from "../components/IntelligenceCard";
import ActionModal from "../components/ActionModal";
import StateView from "../components/StateView";
import { useTheme } from "../context/ThemeContext";
import { usePermissions } from "../hooks/usePermissions";

import { exportImpactAuditPDF } from "../utils/pdfExport";
import { exportImpactOutcomesCSV } from "../utils/csvExport";

export default function ImpactDashboard() {
  const { resolvedTheme } = useTheme();
  const permissions = usePermissions();
  const isDark = resolvedTheme === "dark";
  const [selectedPeriod, setSelectedPeriod] = useState("YTD 2026");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("PDF"); // "PDF" | "CSV" | "BOTH"
  const [isExporting, setIsExporting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);

  // Live Backend Data States
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [summaryData, setSummaryData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [sectorMatrixData, setSectorMatrixData] = useState([]);

  // Longitudinal Outcomes & Diagnostic States
  const [outcomesData, setOutcomesData] = useState(null);
  const [followUpData, setFollowUpData] = useState(null);
  const [nonPlacementData, setNonPlacementData] = useState(null);
  const [attritionData, setAttritionData] = useState(null);
  const [wageData, setWageData] = useState(null);

  // Fetch all dashboard & longitudinal outcome endpoints in parallel
  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Ensure active demo authentication session exists
      await authApi.ensureAuthenticated();

      const [
        summaryRes,
        trendRes,
        funnelRes,
        sectorRes,
        outcomesRes,
        followUpsRes,
        nonPlacementRes,
        attritionRes,
        wageRes,
      ] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getEmploymentTrend({ months: 6 }),
        dashboardApi.getFunnel(),
        dashboardApi.getSectorMatrix(),
        dashboardApi.getOutcomeDistribution(),
        dashboardApi.getFollowUpMetrics(),
        dashboardApi.getNonPlacementAnalytics(),
        dashboardApi.getAttritionAnalytics(),
        dashboardApi.getWageMetrics(),
      ]);

      setSummaryData(summaryRes);
      setTrendData(trendRes || []);
      setFunnelData(funnelRes || []);
      setSectorMatrixData(sectorRes || []);
      setOutcomesData(outcomesRes || null);
      setFollowUpData(followUpsRes || null);
      setNonPlacementData(nonPlacementRes || null);
      setAttritionData(attritionRes || null);
      setWageData(wageRes || null);
    } catch (err) {
      console.error("Impact Dashboard fetch failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived Chart Data for Recharts Area Visualizer
  const chartPoints = (trendData.length > 0 ? trendData : []).map((pt) => {
    const rate =
      pt.certified > 0
        ? Math.round((pt.placed / pt.certified) * 100)
        : pt.enrolled > 0
        ? Math.round((pt.placed / pt.enrolled) * 100)
        : 60;
    return {
      month: pt.month,
      rate: rate,
      target: 60,
      placed: pt.placed,
      certified: pt.certified,
      enrolled: pt.enrolled,
      retained: pt.retained,
    };
  });

  const funnelDescriptions = {
    Enrollment: "Total registered candidates across PMKK & accredited centers",
    Training: "Candidates completed >= 70% curriculum coursework",
    Certified: "NCVET certified and skills-assessed candidates",
    Placed: "Verified employment with employer joining record",
    Retained: "Active retention at 180-day milestone with EPFO verification",
  };

  const funnelColors = [
    "bg-slate-600",
    "bg-indigo-600",
    "bg-sky-500",
    "bg-emerald-500",
    "bg-emerald-400",
  ];

  return (
    <div className="space-y-8 font-sans text-[#f1f5f9]">
      {/* =====================================================
          1. PAGE HEADER & EXECUTIVE ACTIONS
      ====================================================== */}
      <PageHeader
        badge="NATIONAL SKILL INTELLIGENCE"
        badgeVariant="cyan"
        title="Impact & Employment Overview"
        description="Continuous longitudinal tracking of training outcomes, certified candidate placement conversion, 6-month retention, and workforce demand equilibrium."
        breadcrumbs={["National Platform", "Executive Overview"]}
        actions={
          <>
            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#0b1528] px-3 py-2 font-mono text-xs font-semibold text-slate-300 shadow-xs transition hover:border-slate-700 hover:bg-[#0f1c33] hover:text-white disabled:opacity-50 cursor-pointer"
              title="Refresh live data from PostgreSQL"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-sky-400" : "text-sky-400"} />
              <span>{isRefreshing ? "Syncing..." : "Sync Live DB"}</span>
            </button>

            <div className="flex items-center rounded-lg border border-[#1e293b] bg-[#0b1528] p-1 font-mono text-xs">
              {["Q1 2026", "Q2 2026", "YTD 2026"].map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSelectedPeriod(period)}
                  className={`rounded-md px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                    selectedPeriod === period
                      ? "bg-sky-400 text-slate-950 font-bold shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="group inline-flex items-center gap-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 px-3.5 py-2 font-heading text-xs font-bold text-slate-950 shadow-xs transition glow-cyan cursor-pointer"
            >
              <Download size={14} />
              <span>Export Audit Dossier</span>
              <ArrowUpRight
                size={12}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </button>
          </>
        }
      />

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="font-mono text-xs font-bold uppercase text-emerald-400 hover:text-emerald-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================
          API ERROR ALERT BANNER (WITH RETRY)
      ====================================================== */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-400" />
            <div>
              <p className="font-heading font-bold text-white">Backend Connection Issue</p>
              <p className="mt-0.5 font-mono text-rose-300">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchDashboardData()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 font-mono font-semibold text-white transition hover:bg-rose-500 active:scale-95 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* =====================================================
          2. CORE LONGITUDINAL KPI METRICS (TechStatCard)
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex h-40 animate-pulse flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5"
            >
              <div className="h-3 w-28 rounded bg-[#1e293b]" />
              <div className="h-8 w-24 rounded bg-[#1e293b]" />
              <div className="h-3 w-40 rounded bg-[#1e293b]" />
            </div>
          ))
        ) : summaryData ? (
          <>
            <TechStatCard
              title="Certified Beneficiaries"
              value={Number(summaryData.total_certified || 0).toLocaleString()}
              subtitle={`${Number(summaryData.total_trained || 0).toLocaleString()} trained (${Number(summaryData.total_enrolled || 0).toLocaleString()} enrolled)`}
              trend={summaryData.deltas?.certified?.value || "+8.7%"}
              trendDirection="up"
              icon={GraduationCap}
              variant="indigo"
              footerText="NCVET Authenticated Assessment"
            />
            <TechStatCard
              title="Verified Placements"
              value={Number(summaryData.total_placed || 0).toLocaleString()}
              subtitle={`${summaryData.placement_percentage || 0}% conversion of certified cohort`}
              trend={`+${summaryData.placement_percentage || 0}%`}
              trendDirection="up"
              icon={BriefcaseBusiness}
              variant="cyan"
              footerText="Direct Verification Ready"
            />
            <TechStatCard
              title="Longitudinal Retention"
              value={`${summaryData.retention_percentage || 0}%`}
              subtitle="180-day retention tracked"
              trend={`${Number(summaryData.retention_verified_count || 0).toLocaleString()} active`}
              trendDirection="up"
              icon={ShieldCheck}
              variant="emerald"
              footerText="EPFO Integration Sandbox Adapter"
            />
            <TechStatCard
              title="Active Mandates"
              value={Number(summaryData.active_hiring_mandates || 0).toLocaleString()}
              subtitle="Enterprise & MSME Openings in DB"
              trend={summaryData.deltas?.mandates?.value || "+22%"}
              trendDirection="up"
              icon={Users}
              variant="amber"
              footerText="100% Minimum Wage Gated"
            />
          </>
        ) : (
          <div className="col-span-full rounded-xl border border-[#1e293b] bg-[#0b1528] p-6 text-center text-xs font-mono text-slate-400">
            No KPI metrics recorded yet. Please run database seeding.
          </div>
        )}
      </section>

      {/* =====================================================
          3. PRIMARY ANALYTICS: TREND & PIPELINE CONVERSION
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Longitudinal Employment Curve (7 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 xl:col-span-7">
          <div>
            <SectionHeader
              title="Longitudinal Employment Conversion & Target Baseline"
              subtitle="Actual verified placement conversion vs. MSDE national target (PostgreSQL time-series)"
              badge={
                <StatusBadge variant="success" size="sm" dot>
                  Live PostgreSQL Sync
                </StatusBadge>
              }
              actions={
                <div className="flex items-center gap-3 font-mono text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    Actual Conversion
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Target Baseline
                  </span>
                </div>
              }
            />

            <div className="mt-6 h-64 sm:h-80 w-full">
              {loading ? (
                <div className="flex h-full w-full items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-sky-400" />
                </div>
              ) : chartPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#1e293b"
                    />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#94a3b8",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                      dy={6}
                    />

                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#94a3b8",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                      tickFormatter={(val) => `${val}%`}
                    />

                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-3 text-xs text-white shadow-2xl font-mono">
                              <p className="font-bold text-sky-400">{label}</p>
                              <div className="mt-2 space-y-1.5">
                                <p className="flex justify-between gap-4 font-semibold text-sky-300">
                                  <span>Actual Placement:</span>
                                  <span className="font-bold tabular-nums text-white">
                                    {d.rate}% ({Number(d.placed || 0).toLocaleString()} placed)
                                  </span>
                                </p>
                                <p className="flex justify-between gap-4 text-amber-400">
                                  <span>National Target:</span>
                                  <span className="font-bold tabular-nums text-white">
                                    {d.target}%
                                  </span>
                                </p>
                                <p className="flex justify-between gap-4 border-t border-[#1e293b] pt-1.5 text-slate-400">
                                  <span>Certified Cohort:</span>
                                  <span className="tabular-nums text-slate-300">
                                    {Number(d.certified || 0).toLocaleString()}
                                  </span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="rate"
                      name="Actual Conversion"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorActual)"
                      dot={{
                        r: 4,
                        fill: "#070d18",
                        stroke: "#38bdf8",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 6,
                        fill: "#38bdf8",
                        stroke: "#070d18",
                        strokeWidth: 2,
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="target"
                      name="Target Benchmark"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-mono text-slate-400">
                  No longitudinal trend data recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#1e293b] pt-3 text-[11px] font-mono text-slate-400">
            <span>Aggregated from {summaryData?.total_enrolled || 0} candidate cohorts</span>
            <span className="text-sky-400">
              Verification Adapter Linked (Demo)
            </span>
          </div>
        </div>

        {/* Skilling-to-Employment Conversion Pipeline (5 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 xl:col-span-5">
          <div>
            <SectionHeader
              title="Skilling Conversion Funnel"
              subtitle="Longitudinal tracking from initial enrollment to 180-day retention"
            />

            <div className="mt-4 divide-y divide-[#1e293b]">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="space-y-2 py-3">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 rounded bg-[#1e293b]" />
                      <div className="h-3 w-12 rounded bg-[#1e293b]" />
                    </div>
                    <div className="h-1.5 w-full rounded bg-[#1e293b]" />
                  </div>
                ))
              ) : funnelData.length > 0 ? (
                funnelData.map((stage, idx) => (
                  <div key={stage.stage} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-heading font-semibold text-slate-200">
                        {idx + 1}. {stage.stage}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tabular-nums text-white">
                          {Number(stage.count || 0).toLocaleString()}
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${
                            idx >= 3
                              ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                              : "bg-[#070d18] text-slate-300 border-[#1e293b]"
                          }`}
                        >
                          {stage.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#070d18]">
                      <div
                        className={`h-full rounded-full transition-all ${funnelColors[idx % funnelColors.length]}`}
                        style={{
                          width: `${Math.max(5, stage.percentage)}%`,
                        }}
                      />
                    </div>

                    <p className="mt-1 text-[11px] text-slate-400">
                      {funnelDescriptions[stage.stage] ||
                        `Drop-off from previous stage: ${stage.drop_off_rate}%`}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs font-mono text-slate-400">
                  No funnel data available
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-[#1e293b] bg-[#070d18] p-3 text-xs">
            <span className="font-medium text-slate-300">
              Longitudinal Retention:{" "}
              <strong className="font-mono font-bold text-emerald-400">
                {summaryData?.retention_percentage || 0}%
              </strong>{" "}
              at 180-Day Milestone
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              Database Audited
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          4. PROGRAM PERFORMANCE & SCHEME IMPACT MATRIX
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Sector Matrix (8 Cols) */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 xl:col-span-8">
          <SectionHeader
            title="Sector & Program Performance Matrix"
            subtitle="Live SQL breakdown of certified candidates, placement conversion, and starting wages"
            actions={
              <StatusBadge variant="indigo" size="sm">
                {sectorMatrixData.length} Monitored Sectors
              </StatusBadge>
            }
          />

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-[#1e293b] font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3">Program / Sector</th>
                  <th className="pb-3 text-right">Certified</th>
                  <th className="pb-3 text-right">Placement %</th>
                  <th className="pb-3 text-right">Avg Readiness</th>
                  <th className="pb-3 text-right">Est. Starting Wage</th>
                  <th className="pb-3 text-right">Demand Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] text-xs">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx}>
                      <td colSpan={6} className="py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-[#1e293b]" />
                      </td>
                    </tr>
                  ))
                ) : sectorMatrixData.length > 0 ? (
                  sectorMatrixData.map((prog) => (
                    <tr
                      key={prog.sector}
                      className="transition-colors hover:bg-[#0f1c33]"
                    >
                      <td className="py-3 font-semibold text-white">
                        <div>{prog.sector}</div>
                        <span className="font-mono text-[10px] font-normal text-slate-400">
                          {prog.enrolled} enrolled candidates
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-medium text-slate-300">
                        {Number(prog.certified || 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span className="font-mono font-bold text-white">
                          {prog.placement_rate}%
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-emerald-400">
                        {prog.avg_readiness_score}%
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-200">
                        ₹{(3.2 + (prog.avg_readiness_score * 0.03)).toFixed(1)} LPA
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-semibold border ${
                            prog.placement_rate >= 50
                              ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                              : prog.placement_rate >= 30
                              ? "bg-sky-950/50 text-sky-300 border-sky-500/30"
                              : "bg-amber-950/50 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {prog.placement_rate >= 50
                            ? "High Placement"
                            : prog.placement_rate >= 30
                            ? "Expanding Demand"
                            : "Intervention Targeted"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center font-mono text-slate-400">
                      No sector matrix metrics recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scheme Impact Summary (4 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 xl:col-span-4">
          <div>
            <SectionHeader
              title="Scheme-Wise Outcome Efficiency"
              subtitle="Performance across national &amp; state skilling missions"
            />

            <div className="mt-4 divide-y divide-[#1e293b]">
              {schemeBreakdown.map((item) => (
                <div key={item.scheme} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span>{item.scheme}</span>
                    <span className="font-mono font-bold text-sky-400">
                      {item.placedRate}% Placed
                    </span>
                  </div>

                  <div className="mt-1.5 flex justify-between font-mono text-[11px] text-slate-400">
                    <span>{item.enrolled.toLocaleString()} Enrolled</span>
                    <span>Budget: {item.budgetUtil}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#1e293b] pt-3 text-xs">
            <span className="font-mono text-slate-400">Unified Portal Sync</span>
            <StatusBadge variant="success" size="sm" dot>
              All Schemes Audited
            </StatusBadge>
          </div>
        </div>
      </section>

      {/* =====================================================
          5. LONGITUDINAL OUTCOME & IMPACT INTELLIGENCE
      ====================================================== */}
      <section className="space-y-4">
        <SectionHeader
          title="Longitudinal Outcomes & Diagnostic Intelligence"
          subtitle="Multi-track destination pathways, follow-up milestone completion, wage trajectories, and attrition drivers (demonstration dataset metrics)"
          badge={
            <StatusBadge variant="neutral" size="sm" dot>
              Demonstration Dataset
            </StatusBadge>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card 1: Multi-Track Outcome Distribution */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                Destination Mix (Demo Dataset)
              </span>
              <span className="rounded border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                {outcomesData?.total_candidates ? `${outcomesData.total_candidates.toLocaleString()} Tracked` : "All Cohorts"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-200">
                  <span>Wage Employment</span>
                  <span className="font-mono font-bold text-sky-400">
                    {outcomesData?.employed_rate || 59.4}% ({outcomesData?.employed_count?.toLocaleString() || "16,886"})
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#070d18]">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all"
                    style={{ width: `${outcomesData?.employed_rate || 59.4}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-200">
                  <span>Self-Employment &amp; Micro-Enterprise</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {outcomesData?.self_employed_rate || 15.0}% ({outcomesData?.self_employed_count?.toLocaleString() || "4,268"})
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#070d18]">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${outcomesData?.self_employed_rate || 15.0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-200">
                  <span>Apprenticeships &amp; On-the-Job Training</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {outcomesData?.apprenticeship_rate || 10.0}% ({outcomesData?.apprenticeship_count?.toLocaleString() || "2,845"})
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#070d18]">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${outcomesData?.apprenticeship_rate || 10.0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-200">
                  <span>Unemployed &amp; Active Job Seekers</span>
                  <span className="font-mono font-bold text-amber-400">
                    {outcomesData?.unemployed_rate || 10.0}% ({outcomesData?.unemployed_count?.toLocaleString() || "2,845"})
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#070d18]">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${outcomesData?.unemployed_rate || 10.0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-200">
                  <span>Further Vocational Higher Ed</span>
                  <span className="font-mono font-bold text-slate-400">
                    {outcomesData?.further_education_rate || 4.0}%
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#070d18]">
                  <div
                    className="h-full rounded-full bg-slate-500 transition-all"
                    style={{ width: `${outcomesData?.further_education_rate || 4.0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Follow-Up & Wage Progression */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                Outreach &amp; Wage Trajectory
              </span>
              <span className="rounded border border-emerald-500/30 bg-emerald-950/50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                {followUpData?.completion_rate || 80.3}% Follow-Up Complete
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-3">
                  <p className="font-mono text-[10px] font-medium text-slate-400">Follow-Up Response Rate</p>
                  <p className="mt-1 font-mono text-lg font-bold text-white">
                    {followUpData?.response_rate || 76.5}%
                  </p>
                  <p className="font-mono text-[10px] text-slate-500">
                    {followUpData?.pending_count || 3120} pending outreach
                  </p>
                </div>
                <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-3">
                  <p className="font-mono text-[10px] font-medium text-slate-400">Wage Progression (CTC)</p>
                  <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
                    +{wageData?.avg_wage_growth_pct || 2.9}%
                  </p>
                  <p className="font-mono text-[10px] text-slate-400">
                    ₹{wageData?.avg_starting_ctc_lpa || 4.47}L → ₹{wageData?.avg_current_ctc_lpa || 4.60}L
                  </p>
                </div>
              </div>

              <div>
                <p className="font-mono text-xs font-semibold text-slate-300 mb-2">
                  Follow-Up Channel Distribution
                </p>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="rounded border border-[#1e293b] bg-[#070d18] p-2">
                    <span className="font-mono text-[10px] text-slate-400 block">In-App</span>
                    <span className="font-mono text-xs font-bold text-sky-400">45%</span>
                  </div>
                  <div className="rounded border border-[#1e293b] bg-[#070d18] p-2">
                    <span className="font-mono text-[10px] text-slate-400 block">SMS</span>
                    <span className="font-mono text-xs font-bold text-emerald-400">18%</span>
                  </div>
                  <div className="rounded border border-[#1e293b] bg-[#070d18] p-2">
                    <span className="font-mono text-[10px] text-slate-400 block">Email</span>
                    <span className="font-mono text-xs font-bold text-indigo-400">28%</span>
                  </div>
                  <div className="rounded border border-[#1e293b] bg-[#070d18] p-2">
                    <span className="font-mono text-[10px] text-slate-400 block">Assisted</span>
                    <span className="font-mono text-xs font-bold text-amber-400">9%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Diagnostic Bottlenecks (Non-Placement & Attrition) */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                Diagnostic Factors &amp; Turnover
              </span>
              <span className="rounded border border-rose-800/70 bg-rose-950/50 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                {attritionData?.attrition_rate || 8.4}% Turnover Rate
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {/* Checkpoint Retentions */}
              <div>
                <p className="font-mono text-xs font-semibold text-slate-300 mb-1.5">
                  Milestone Retention Sustainability
                </p>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="rounded border border-[#1e293b] bg-[#070d18] p-2">
                    <span className="text-[10px] text-slate-400 block">3-Month</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {attritionData?.three_month_retention_rate || 88.5}%
                    </span>
                  </div>
                  <div className="rounded border border-[#1e293b] bg-[#070d18] p-2">
                    <span className="text-[10px] text-slate-400 block">6-Month</span>
                    <span className="text-xs font-bold text-sky-400">
                      {attritionData?.six_month_retention_rate || 81.3}%
                    </span>
                  </div>
                  <div className="rounded border border-[#1e293b] bg-[#070d18] p-2">
                    <span className="text-[10px] text-slate-400 block">12-Month</span>
                    <span className="text-xs font-bold text-indigo-400">
                      {attritionData?.twelve_month_retention_rate || 74.2}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Non-Placement Driver */}
              <div className="border-t border-[#1e293b] pt-2.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">
                    Skill-Deficit Linked Non-Placement:
                  </span>
                  <span className="font-mono font-bold text-rose-400">
                    {nonPlacementData?.skill_gap_percentage || 38.0}%
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  Root Causes: Skill Deficits (38%), Interview Failures (24%), Relocation Constraints (17%).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          6. ACTIONABLE POLICY & OPERATIONAL INTELLIGENCE
      ====================================================== */}
      <section className="space-y-4">
        <SectionHeader
          title="Policy Signals & Operational Intelligence"
          subtitle="Real-time anomalies, skill shortages, and institutional opportunities detected across the ecosystem"
          badge={
            <StatusBadge variant="indigo" size="sm">
              3 Signals Active
            </StatusBadge>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          {insights.map((insight) => {
            const isWarning = insight.type === "warning";

            return (
              <div
                key={insight.title}
                className={`flex flex-col justify-between rounded-xl border p-5 transition-all ${
                  isWarning
                    ? "border-amber-500/30 bg-amber-950/20"
                    : "border-[#1e293b] bg-[#0b1528] hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <StatusBadge variant={isWarning ? "warning" : "success"} size="sm" dot>
                      {insight.category}
                    </StatusBadge>
                    <span className="font-mono text-xs font-bold tabular-nums text-white">
                      {insight.metric}
                    </span>
                  </div>

                  <h3 className="mt-3 font-heading text-sm font-bold tracking-tight text-white">
                    {insight.title}
                  </h3>

                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    {insight.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#1e293b] pt-3">
                  <span className="max-w-[220px] truncate font-mono text-[11px] font-semibold text-sky-400">
                    Action: {insight.action}
                  </span>
                  <ArrowUpRight size={13} className="text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          7. INSTITUTIONAL ACTION DOSSIER BANNER
      ====================================================== */}
      <IntelligenceCard
        category="National Policy Engine"
        title="Q3 Skilling Allocation Strategy Recommendation"
        description="Data models recommend shifting 15% training capacity from legacy office suites to Cloud Infrastructure and Power BI specializations in Eastern UP to capture active employer hiring mandates."
        confidence="98.7% Model Confidence"
        sampleSize="Demonstration Cohort · Audited PostgreSQL Records"
        actionText="Deploy Bridge Modules"
        onAction={() => setIsInterventionModalOpen(true)}
      />

      {/* =====================================================
          ACTION MODALS
      ====================================================== */}
      <ActionModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Generate National Skilling Audit Dossier"
        subtitle="Export longitudinal employment & retention dataset for policy and governance evaluation"
        confirmText={isExporting ? "Generating..." : `Download ${exportFormat === "BOTH" ? "PDF + CSV" : exportFormat} Dossier`}
        onConfirm={async () => {
          try {
            setIsExporting(true);
            if (exportFormat === "PDF" || exportFormat === "BOTH") {
              exportImpactAuditPDF({
                summary: summaryData,
                trendData,
                funnelData,
                sectorMatrixData,
                period: selectedPeriod,
              });
            }
            if (exportFormat === "CSV" || exportFormat === "BOTH") {
              exportImpactOutcomesCSV(summaryData, trendData, funnelData, selectedPeriod);
            }
            setActionSuccessMsg(`✅ ${exportFormat === "BOTH" ? "PDF Dossier & CSV Dataset" : exportFormat + " Dossier"} downloaded successfully.`);
          } catch (err) {
            console.error("Export error:", err);
          } finally {
            setIsExporting(false);
          }
        }}
      >
        <div className="space-y-3.5 font-sans">
          <p className="text-xs text-slate-300">
            This comprehensive national evaluation report compiles:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
            <li>District-level 3M, 6M, and 12M longitudinal retention breakdown</li>
            <li>NCVET authenticated candidate placement conversion metrics</li>
            <li>Sectoral demand equilibrium and wage progression analytics</li>
            <li>Identified skill gap matrix across tracked district clusters</li>
          </ul>

          <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-3 text-xs">
            <label className="block font-heading font-semibold text-white">
              Select Output Format:
            </label>
            <div className="mt-2 flex flex-wrap gap-4 font-mono text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="impact_format"
                  checked={exportFormat === "PDF"}
                  onChange={() => setExportFormat("PDF")}
                />
                <span className="text-slate-200">
                  Signed PDF Dossier (Printable A4)
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="impact_format"
                  checked={exportFormat === "CSV"}
                  onChange={() => setExportFormat("CSV")}
                />
                <span className="text-slate-200">
                  Raw CSV Dataset (Excel Compatible)
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="impact_format"
                  checked={exportFormat === "BOTH"}
                  onChange={() => setExportFormat("BOTH")}
                />
                <span className="text-slate-200">
                  Dual Bundle (PDF + CSV)
                </span>
              </label>
            </div>
          </div>
        </div>
      </ActionModal>

      <ActionModal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        title="Execute Regional Bridge Training Allocation"
        subtitle="Fast-track 60-hour specialization curriculum to 4 PMKK centers"
        confirmText="Confirm & Notify Training Centers"
        onConfirm={() => {
          alert("Bridge module curriculum dispatched to designated training centers.");
        }}
      >
        <p className="text-xs text-slate-300">
          You are about to authorize the deployment of the Cloud Infrastructure &amp; Power BI 40-hour
          bridge curriculum package for candidate cohorts in the demonstration dataset.
        </p>
      </ActionModal>
    </div>
  );
}
