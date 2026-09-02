import { useState, useEffect, useCallback } from "react";
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
import StatCard from "../components/StatCard";
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

  // Fetch all 4 dashboard endpoints in parallel
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

      const [summaryRes, trendRes, funnelRes, sectorRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getEmploymentTrend({ months: 6 }),
        dashboardApi.getFunnel(),
        dashboardApi.getSectorMatrix(),
      ]);

      setSummaryData(summaryRes);
      setTrendData(trendRes || []);
      setFunnelData(funnelRes || []);
      setSectorMatrixData(sectorRes || []);
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

  // Derived Dynamic KPI Stat Cards from Backend Data
  const statCards = summaryData
    ? [
        {
          title: "Certified Beneficiaries",
          value: Number(summaryData.total_certified || 0).toLocaleString(),
          change: summaryData.deltas?.certified?.value || "+8.7%",
          trend: "up",
          period: summaryData.deltas?.certified?.context || "MoM growth",
          subtitle: `${Number(summaryData.total_trained || 0).toLocaleString()} trained (${Number(summaryData.total_enrolled || 0).toLocaleString()} enrolled)`,
          highlight: "NCVET Authenticated",
          icon: GraduationCap,
        },
        {
          title: "Verified Placements",
          value: Number(summaryData.total_placed || 0).toLocaleString(),
          change: `+${summaryData.placement_percentage || 0}%`,
          trend: "up",
          period: "conversion rate",
          subtitle: `${summaryData.placement_percentage || 0}% of certified candidates placed`,
          highlight: "Aadhaar / EPFO Linked",
          icon: BriefcaseBusiness,
        },
        {
          title: "Longitudinal Retention",
          value: `${summaryData.retention_percentage || 0}%`,
          change: `${Number(summaryData.retention_verified_count || 0).toLocaleString()} active`,
          trend: "up",
          period: "at 180 days",
          subtitle: "Continuous EPF remittance verified",
          highlight: "180-Day Milestone",
          icon: ShieldCheck,
        },
        {
          title: "Industry Demand Mandates",
          value: Number(summaryData.active_hiring_mandates || 0).toLocaleString(),
          change: `Avg score: ${summaryData.avg_readiness_score || 0}%`,
          trend: "up",
          period: "readiness index",
          subtitle: "Active employer vacancy listings",
          highlight: "Multi-Sectoral",
          icon: Users,
        },
      ]
    : [];

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
    "bg-slate-900 dark:bg-slate-700",
    "bg-blue-800 dark:bg-blue-700",
    "bg-blue-600 dark:bg-blue-500",
    "bg-emerald-600 dark:bg-emerald-500",
    "bg-emerald-700 dark:bg-emerald-600",
  ];

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER & EXECUTIVE ACTIONS
      ====================================================== */}
      <PageHeader
        badge="Executive Outcomes Architecture"
        badgeVariant="indigo"
        title="Impact & Employment Intelligence"
        description="Continuous longitudinal tracking of training outcomes, certified candidate placement conversion, 6-month retention, and workforce demand equilibrium."
        breadcrumbs={["National Platform", "Executive Overview"]}
        actions={
          <>
            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Refresh live data from PostgreSQL"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
              <span>{isRefreshing ? "Syncing..." : "Sync Live DB"}</span>
            </button>

            <div className="flex items-center rounded-lg border border-slate-200/80 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
              {["Q1 2026", "Q2 2026", "YTD 2026"].map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSelectedPeriod(period)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedPeriod === period
                      ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="group inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98]"
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
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-xs font-bold uppercase text-emerald-700 hover:text-emerald-900 dark:text-emerald-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================
          API ERROR ALERT BANNER (WITH RETRY)
      ====================================================== */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-semibold">Backend Connection Issue</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchDashboardData()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-700 active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* =====================================================
          1. CORE LONGITUDINAL KPI METRICS
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex h-36 animate-pulse flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800/80 dark:bg-slate-900"
            >
              <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))
        ) : statCards.length > 0 ? (
          statCards.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              trend={stat.trend}
              period={stat.period}
              subtitle={stat.subtitle}
              highlight={stat.highlight}
              icon={stat.icon}
            />
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No KPI metrics recorded yet. Please run database seeding.
          </div>
        )}
      </section>

      {/* =====================================================
          2. PRIMARY ANALYTICS: TREND & PIPELINE CONVERSION
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Longitudinal Employment Curve (7 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-7 dark:border-slate-800 dark:bg-slate-900">
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
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    Actual Conversion
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Target Baseline
                  </span>
                </div>
              }
            />

            <div className="mt-6 h-72 w-full">
              {loading ? (
                <div className="flex h-full w-full items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                </div>
              ) : chartPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={isDark ? 0.3 : 0.16} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={isDark ? "#1e293b" : "#F1F5F9"}
                    />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: isDark ? "#94A3B8" : "#64748B",
                        fontWeight: 500,
                      }}
                      dy={6}
                    />

                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: isDark ? "#94A3B8" : "#64748B",
                        fontWeight: 500,
                      }}
                      tickFormatter={(val) => `${val}%`}
                    />

                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl dark:border-slate-750 dark:bg-slate-950">
                              <p className="font-bold text-slate-200">{label}</p>
                              <div className="mt-2 space-y-1.5">
                                <p className="flex justify-between gap-4 font-semibold text-blue-400">
                                  <span>Actual Placement:</span>
                                  <span className="font-bold tabular-nums text-white">
                                    {d.rate}% ({Number(d.placed || 0).toLocaleString()} placed)
                                  </span>
                                </p>
                                <p className="flex justify-between gap-4 text-amber-300">
                                  <span>National Target:</span>
                                  <span className="font-bold tabular-nums text-white">
                                    {d.target}%
                                  </span>
                                </p>
                                <p className="flex justify-between gap-4 border-t border-slate-800 pt-1.5 text-slate-400">
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
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorActual)"
                      dot={{
                        r: 4,
                        fill: isDark ? "#0F172A" : "#FFFFFF",
                        stroke: "#3B82F6",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 6,
                        fill: "#3B82F6",
                        stroke: isDark ? "#0F172A" : "#FFFFFF",
                        strokeWidth: 2,
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="target"
                      name="Target Benchmark"
                      stroke="#D97706"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No longitudinal trend data recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Aggregated from {summaryData?.total_enrolled || 0} candidate cohorts</span>
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              Aadhaar-EPFO Linkage Verified
            </span>
          </div>
        </div>

        {/* Skilling-to-Employment Conversion Pipeline (5 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <SectionHeader
              title="Skilling Conversion Funnel"
              subtitle="Longitudinal tracking from initial enrollment to 180-day retention"
            />

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="space-y-2 py-3">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <div className="h-1.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                ))
              ) : funnelData.length > 0 ? (
                funnelData.map((stage, idx) => (
                  <div key={stage.stage} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {idx + 1}. {stage.stage}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {Number(stage.count || 0).toLocaleString()}
                        </span>
                        <StatusBadge
                          variant={idx >= 3 ? "success" : "neutral"}
                          size="sm"
                          className="tabular-nums"
                        >
                          {stage.percentage}%
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${funnelColors[idx % funnelColors.length]}`}
                        style={{
                          width: `${Math.max(5, stage.percentage)}%`,
                        }}
                      />
                    </div>

                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {funnelDescriptions[stage.stage] ||
                        `Drop-off from previous stage: ${stage.drop_off_rate}%`}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No funnel data available
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Longitudinal Efficiency:{" "}
              <strong className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {summaryData?.retention_percentage || 0}%
              </strong>{" "}
              retained at 6M
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Benchmark: 38%
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          3. PROGRAM PERFORMANCE & SCHEME IMPACT MATRIX
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Sector Matrix (8 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-8 dark:border-slate-800 dark:bg-slate-900">
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
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <th className="pb-3">Program / Sector</th>
                  <th className="pb-3 text-right">Certified</th>
                  <th className="pb-3 text-right">Placement %</th>
                  <th className="pb-3 text-right">Avg Readiness</th>
                  <th className="pb-3 text-right">Est. Avg Wage</th>
                  <th className="pb-3 text-right">Demand Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx}>
                      <td colSpan={6} className="py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    </tr>
                  ))
                ) : sectorMatrixData.length > 0 ? (
                  sectorMatrixData.map((prog) => (
                    <tr
                      key={prog.sector}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <div>{prog.sector}</div>
                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                          {prog.enrolled} enrolled candidates
                        </span>
                      </td>
                      <td className="py-3 text-right font-medium tabular-nums text-slate-700 dark:text-slate-300">
                        {Number(prog.certified || 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {prog.placement_rate}%
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {prog.avg_readiness_score}%
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                        ₹{(3.2 + (prog.avg_readiness_score * 0.03)).toFixed(1)} LPA
                      </td>
                      <td className="py-3 text-right">
                        <StatusBadge
                          variant={
                            prog.placement_rate >= 50
                              ? "success"
                              : prog.placement_rate >= 30
                              ? "info"
                              : "warning"
                          }
                          size="sm"
                        >
                          {prog.placement_rate >= 50
                            ? "High Placement"
                            : prog.placement_rate >= 30
                            ? "Expanding Demand"
                            : "Intervention Targeted"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No sector matrix metrics recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scheme Impact Summary (4 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <SectionHeader
              title="Scheme-Wise Outcome Efficiency"
              subtitle="Performance across national & state skilling missions"
            />

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {schemeBreakdown.map((item) => (
                <div key={item.scheme} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
                    <span>{item.scheme}</span>
                    <span className="font-bold tabular-nums text-blue-700 dark:text-blue-400">
                      {item.placedRate}% Placed
                    </span>
                  </div>

                  <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span>{item.enrolled.toLocaleString()} Enrolled</span>
                    <span>Budget Utilized: {item.budgetUtil}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Unified Portal Sync</span>
            <StatusBadge variant="success" size="sm" dot>
              All Schemes Audited
            </StatusBadge>
          </div>
        </div>
      </section>

      {/* =====================================================
          4. ACTIONABLE POLICY & OPERATIONAL INTELLIGENCE
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
                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
                    : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <StatusBadge variant={isWarning ? "warning" : "success"} size="sm" dot>
                      {insight.category}
                    </StatusBadge>
                    <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {insight.metric}
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {insight.title}
                  </h3>

                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {insight.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="max-w-[220px] truncate text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Action: {insight.action}
                  </span>
                  <ArrowUpRight size={13} className="text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          5. INSTITUTIONAL ACTION DOSSIER BANNER
      ====================================================== */}
      <IntelligenceCard
        category="National Policy Engine"
        title="Q3 Skilling Allocation Strategy Recommendation"
        description="Data models recommend shifting 15% training capacity from legacy office suites to Cloud Infrastructure and Power BI specializations in Eastern UP to capture active employer hiring mandates."
        confidence="98.7% Model Confidence"
        sampleSize="42 Districts · 28,450 Beneficiaries"
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
        <div className="space-y-3.5">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            This comprehensive national evaluation report compiles:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 dark:text-slate-300">
            <li>District-level 3M, 6M, and 12M longitudinal retention breakdown</li>
            <li>NCVET authenticated candidate placement conversion metrics</li>
            <li>Sectoral demand equilibrium and wage progression analytics</li>
            <li>Identified skill gap matrix across all 42 tracked districts</li>
          </ul>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60">
            <label className="block font-semibold text-slate-900 dark:text-slate-100">
              Select Output Format:
            </label>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="impact_format"
                  checked={exportFormat === "PDF"}
                  onChange={() => setExportFormat("PDF")}
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">
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
                <span className="font-medium text-slate-800 dark:text-slate-200">
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
                <span className="font-medium text-slate-800 dark:text-slate-200">
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
          alert("Bridge module curriculum dispatched to Varanasi and Gorakhpur centers.");
        }}
      >
        <p className="text-xs text-slate-600 dark:text-slate-300">
          You are about to authorize the deployment of the Cloud Infrastructure & Power BI 40-hour
          bridge curriculum package for 2,450 beneficiaries in Eastern UP.
        </p>
      </ActionModal>
    </div>
  );
}