import { useState } from "react";
import {
  ArrowUpRight,
  Download,
  Users,
  BriefcaseBusiness,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

import {
  dashboardStats,
  conversionPipeline,
  employmentTrend,
  programPerformance,
  schemeBreakdown,
  insights,
} from "../data/dashboardData";

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

import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import IntelligenceCard from "../components/IntelligenceCard";
import ActionModal from "../components/ActionModal";

export default function ImpactDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("YTD 2026");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);

  const statIcons = [Users, GraduationCap, BriefcaseBusiness, ShieldCheck];

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
            <div className="flex items-center rounded-lg border border-slate-200/80 bg-white p-1">
              {["Q1 2026", "Q2 2026", "YTD 2026"].map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSelectedPeriod(period)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedPeriod === period
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
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
              <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </>
        }
      />

      {/* =====================================================
          1. CORE LONGITUDINAL KPI METRICS
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat, idx) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            period={stat.period}
            subtitle={stat.subtitle}
            highlight={stat.highlight}
            icon={statIcons[idx]}
          />
        ))}
      </section>

      {/* =====================================================
          2. PRIMARY ANALYTICS: TREND & PIPELINE CONVERSION
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Longitudinal Employment Curve (7 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-7 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Longitudinal Employment Conversion & Target Baseline"
              subtitle="Actual verified placement conversion vs. MSDE national target (Jan – Jul 2026)"
              badge={
                <StatusBadge variant="success" size="sm" dot>
                  +8.4% above baseline
                </StatusBadge>
              }
              actions={
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-700" />
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={employmentTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                    dy={6}
                  />

                  <YAxis
                    domain={[40, 80]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                    tickFormatter={(val) => `${val}%`}
                  />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-slate-200 bg-slate-900 p-3 text-white shadow-xl text-xs">
                            <p className="font-bold text-slate-200">{label}</p>
                            <div className="mt-2 space-y-1.5">
                              <p className="flex justify-between gap-4 font-semibold text-blue-400">
                                <span>Actual Placement:</span>
                                <span className="tabular-nums font-bold text-white">{d.rate}% ({d.placed.toLocaleString()} placed)</span>
                              </p>
                              <p className="flex justify-between gap-4 text-amber-300">
                                <span>National Target:</span>
                                <span className="tabular-nums font-bold text-white">{d.target}%</span>
                              </p>
                              <p className="flex justify-between gap-4 text-slate-400 pt-1.5 border-t border-slate-800">
                                <span>Certified Cohort:</span>
                                <span className="tabular-nums text-slate-300">{d.certified.toLocaleString()}</span>
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
                    stroke="#1D4ED8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                    dot={{ r: 4, fill: "#FFFFFF", stroke: "#1D4ED8", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#1D4ED8", stroke: "#FFFFFF", strokeWidth: 2 }}
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
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 font-medium">
            <span>Peak placement velocity reached in July 2026 (69% conversion)</span>
            <span className="font-semibold text-blue-700">Aadhaar-EPFO Linkage Verified</span>
          </div>
        </div>

        {/* Skilling-to-Employment Conversion Pipeline (5 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-5 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Skilling Conversion Funnel"
              subtitle="Longitudinal tracking from initial enrollment to 180-day retention"
            />

            <div className="mt-4 divide-y divide-slate-100">
              {conversionPipeline.map((stage, idx) => {
                const colors = [
                  "bg-slate-900",
                  "bg-blue-800",
                  "bg-blue-600",
                  "bg-emerald-600",
                  "bg-emerald-700",
                ];

                return (
                  <div key={stage.stage} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {idx + 1}. {stage.stage}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 tabular-nums">
                          {stage.count.toLocaleString()}
                        </span>
                        <StatusBadge
                          variant={idx >= 3 ? "success" : "neutral"}
                          size="sm"
                          className="tabular-nums"
                        >
                          {stage.rate}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${colors[idx]}`}
                        style={{
                          width: `${(stage.count / conversionPipeline[0].count) * 100}%`,
                        }}
                      />
                    </div>

                    <p className="mt-1 text-[11px] text-slate-500">{stage.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">
              Longitudinal Efficiency: <strong className="text-slate-900 tabular-nums">48.2%</strong> retained at 6M
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Benchmark: 38%</span>
          </div>
        </div>
      </section>

      {/* =====================================================
          3. PROGRAM PERFORMANCE & SCHEME IMPACT MATRIX
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Sector Matrix (8 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-8">
          <SectionHeader
            title="Sector & Program Performance Matrix"
            subtitle="Comparing certified candidate volume, placement conversion, and starting wage growth"
            actions={
              <StatusBadge variant="indigo" size="sm">
                6 Active Sectors
              </StatusBadge>
            }
          />

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3">Program / Sector</th>
                  <th className="pb-3 text-right">Certified</th>
                  <th className="pb-3 text-right">Placement %</th>
                  <th className="pb-3 text-right">6M Retention</th>
                  <th className="pb-3 text-right">Avg Starting Wage</th>
                  <th className="pb-3 text-right">Status Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {programPerformance.map((prog) => (
                  <tr key={prog.name} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-semibold text-slate-900">
                      <div>{prog.name}</div>
                      <span className="text-[10px] text-slate-400 font-normal">{prog.sector}</span>
                    </td>
                    <td className="py-3 text-right font-medium text-slate-700 tabular-nums">
                      {prog.learners.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-bold text-slate-900 tabular-nums">{prog.employment}%</span>
                    </td>
                    <td className="py-3 text-right font-semibold text-emerald-700 tabular-nums">
                      {prog.retention}%
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-800 tabular-nums">
                      {prog.avgWage}
                    </td>
                    <td className="py-3 text-right">
                      <StatusBadge
                        variant={
                          prog.employment >= 74
                            ? "success"
                            : prog.employment >= 68
                            ? "info"
                            : "warning"
                        }
                        size="sm"
                      >
                        {prog.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scheme Impact Summary (4 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-4 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Scheme-Wise Outcome Efficiency"
              subtitle="Performance across national & state skilling missions"
            />

            <div className="mt-4 divide-y divide-slate-100">
              {schemeBreakdown.map((item) => (
                <div key={item.scheme} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                    <span>{item.scheme}</span>
                    <span className="text-blue-700 tabular-nums font-bold">{item.placedRate}% Placed</span>
                  </div>

                  <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>{item.enrolled.toLocaleString()} Enrolled</span>
                    <span>Budget Utilized: {item.budgetUtil}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">Unified Portal Sync</span>
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
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-slate-200/80 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <StatusBadge
                      variant={isWarning ? "warning" : "success"}
                      size="sm"
                      dot
                    >
                      {insight.category}
                    </StatusBadge>
                    <span className="font-bold text-slate-900 text-xs tabular-nums">
                      {insight.metric}
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-900 tracking-tight">
                    {insight.title}
                  </h3>

                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    {insight.description}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[220px]">
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
        subtitle="Export longitudinal employment & retention dataset for SIH 2026 evaluation"
        confirmText="Download Signed PDF Dossier"
        onConfirm={() => {
          alert("Audit Dossier generated successfully conforming to MSDE PS-135 standards.");
        }}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            This comprehensive report compiles:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
            <li>District-level 3M, 6M, and 12M longitudinal retention breakdown</li>
            <li>Aadhaar/EPFO verified employer placement certificates</li>
            <li>Scheme-wise budget utilization and wage growth analytics</li>
            <li>Identified skill gap matrix across all 42 tracked districts</li>
          </ul>
          <div className="rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
            <span className="font-semibold text-slate-900">Format:</span> Signed PDF + Raw CSV Dataset (28,450 rows)
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
        <p className="text-xs text-slate-600">
          You are about to authorize the deployment of the Cloud Infrastructure & Power BI 40-hour bridge curriculum package for 2,450 beneficiaries in Eastern UP.
        </p>
      </ActionModal>
    </div>
  );
}