import { useState, useEffect, useCallback } from "react";
import {
  BrainCircuit,
  Search,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Download,
} from "lucide-react";

import { skillGapsApi } from "../api/skillGaps";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { exportSkillGapsCSV } from "../utils/csvExport";
import { exportSkillInterventionPDF } from "../utils/pdfExport";
import { usePermissions } from "../hooks/usePermissions";

import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import ActionModal from "../components/ActionModal";
import AISkillIntelligence from "../components/AISkillIntelligence";
import StateView from "../components/StateView";

export default function SkillGapIntelligence() {
  const permissions = usePermissions();

  // Filters & Selection
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [selectedSector, setSelectedSector] = useState("All");

  // Live Backend Data States
  const [prioritySkills, setPrioritySkills] = useState([]);
  const [distributionData, setDistributionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Intervention Modal States
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [selectedSkillAction, setSelectedSkillAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);



  // Form states for intervention deployment
  const [interventionType, setInterventionType] = useState("BRIDGE_COURSE");
  const [targetCapacity, setTargetCapacity] = useState(150);
  const [budgetINR, setBudgetINR] = useState(500000);
  const [completionWeeks, setCompletionWeeks] = useState(4);
  const [interventionNotes, setInterventionNotes] = useState("");

  // Fetch skill gap analytics from backend
  const fetchSkillGapData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      await authApi.ensureAuthenticated();

      const [priorityRes, distRes] = await Promise.all([
        skillGapsApi.getPriorityGaps({
          severity: selectedSeverity === "All" ? undefined : selectedSeverity,
          sector: selectedSector === "All" ? undefined : selectedSector,
          limit: 60,
        }),
        skillGapsApi.getDistribution(),
      ]);

      setPrioritySkills(priorityRes || []);
      setDistributionData(distRes || null);
    } catch (err) {
      console.error("Skill Gap data fetch failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedSeverity, selectedSector]);

  useEffect(() => {
    fetchSkillGapData();
  }, [fetchSkillGapData]);

  // Handle row selection for targeted intervention
  const handleOpenInterventionModal = (skill = null) => {
    const target = skill || (prioritySkills.length > 0 ? prioritySkills[0] : null);
    setSelectedSkillAction(target);
    if (target) {
      setTargetCapacity(Math.max(50, Math.min(500, target.learners_affected || 150)));
      setBudgetINR(500000);
      setInterventionNotes(
        `Automated NQR-aligned bridge course deployment for ${target.competency_name} in ${target.district_name || target.district_id}.`
      );
    }
    setIsInterventionModalOpen(true);
  };

  // Deploy intervention via backend POST /api/v1/skill-gaps/deploy-intervention
  const handleDeployIntervention = async () => {
    if (!selectedSkillAction) {
      alert("Please select a competency deficit to target.");
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        district_id: selectedSkillAction.district_id,
        competency_id: selectedSkillAction.competency_id,
        intervention_type: interventionType,
        target_capacity: Number(targetCapacity),
        budget_allocated_inr: Number(budgetINR),
        target_completion_weeks: Number(completionWeeks),
        notes: interventionNotes || undefined,
      };

      const res = await skillGapsApi.deployIntervention(payload);

      // Generate printable PDF Mandate Directive Order for training centers
      exportSkillInterventionPDF(payload, selectedSkillAction);

      setIsInterventionModalOpen(false);
      setActionSuccessMsg(
        `✅ Intervention Deployed & PDF Mandate Order Downloaded! Projected deficit reduction: -${res.projected_deficit_reduction_pct}%.`
      );

      // Refresh live priority matrix and distribution
      await fetchSkillGapData(true);
    } catch (err) {
      console.error("Intervention deployment failed:", err);
      alert(`Intervention deployment failed: ${getErrorMessage(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Client-side search filtering on current loaded priority set
  const filteredSkills = prioritySkills.filter((s) => {
    const matchesSearch =
      s.competency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.district_name && s.district_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Calculate dynamic stats
  const criticalCount = distributionData?.severity_counts?.Critical || 0;
  const highCount = distributionData?.severity_counts?.High || 0;
  const totalTrackedGaps = prioritySkills.length;
  const totalSeverityCount =
    (distributionData?.severity_counts?.Critical || 0) +
    (distributionData?.severity_counts?.High || 0) +
    (distributionData?.severity_counts?.Moderate || 0) +
    (distributionData?.severity_counts?.Aligned || 0) || 1;

  const severityDistribution = [
    {
      level: "Critical Severity",
      count: distributionData?.severity_counts?.Critical || 0,
      percentage: Math.round(
        ((distributionData?.severity_counts?.Critical || 0) / totalSeverityCount) * 100
      ),
      barColor: "bg-rose-600 dark:bg-rose-500",
      textTone: "text-rose-700",
      description: "Deficit > 40% directly impeding immediate employer hiring",
    },
    {
      level: "High Severity",
      count: distributionData?.severity_counts?.High || 0,
      percentage: Math.round(
        ((distributionData?.severity_counts?.High || 0) / totalSeverityCount) * 100
      ),
      barColor: "bg-amber-500 dark:bg-amber-400",
      textTone: "text-amber-700",
      description: "Deficit 25–40% requiring 30-hour bridge curriculum",
    },
    {
      level: "Moderate Severity",
      count: distributionData?.severity_counts?.Moderate || 0,
      percentage: Math.round(
        ((distributionData?.severity_counts?.Moderate || 0) / totalSeverityCount) * 100
      ),
      barColor: "bg-blue-600 dark:bg-blue-500",
      textTone: "text-blue-700",
      description: "Deficit 10–25% solvable via standard PMKK lab credits",
    },
    {
      level: "Aligned / Balanced",
      count: distributionData?.severity_counts?.Aligned || 0,
      percentage: Math.round(
        ((distributionData?.severity_counts?.Aligned || 0) / totalSeverityCount) * 100
      ),
      barColor: "bg-emerald-600 dark:bg-emerald-500",
      textTone: "text-emerald-700",
      description: "Workforce supply matches regional hiring mandates",
    },
  ];

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <PageHeader
        badge="Workforce Gap Engine"
        badgeVariant="danger"
        title="Skill Gap Intelligence & Shortage Engine"
        description="Identifying structural mismatches between employer hiring mandates and training curriculum outputs across all active sectors."
        breadcrumbs={["National Platform", "Skill Gap Intelligence"]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchSkillGapData(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Sync latest skill gap calculations from PostgreSQL"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-rose-600" : ""} />
              <span>{isRefreshing ? "Syncing..." : "Sync Live Deficits"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportSkillGapsCSV(filteredSkills, selectedSeverity, selectedSector);
                setActionSuccessMsg(`✅ Exported ${filteredSkills.length} skill shortage deficits to CSV.`);
              }}
              disabled={filteredSkills.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Export filtered deficit matrix to CSV"
            >
              <Download size={13} />
              <span>Export Matrix (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenInterventionModal(null)}
              className="group inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 active:scale-[0.98] dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              <BrainCircuit size={14} />
              <span>Launch National Bridge Program</span>
              <ArrowUpRight
                size={12}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </button>
          </div>
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

      {/* Error Alert Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-semibold">Unable to Load Skill Gap Data</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchSkillGapData()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-700 active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* =====================================================
          1. SKILL GAP STATS
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
        ) : (
          <>
            <StatCard
              title="Critical Skill Deficits"
              value={criticalCount.toString()}
              change="Action Mandated"
              trend="down"
              period="priority tier"
              subtitle={`${criticalCount} competencies require bridge modules`}
              highlight="Deficit > 40% vs Demand"
              tone="danger"
            />

            <StatCard
              title="Avg Workforce Deficit"
              value={`${distributionData?.avg_deficit_pct || 0}%`}
              change="+3.4% MoM"
              trend="up"
              period="shortage delta"
              subtitle="Demand vs. certified supply spread"
              highlight="Aggregated Across Sectors"
              tone="warning"
            />

            <StatCard
              title="Impacted Beneficiaries"
              value={Number(distributionData?.total_learners_affected || 0).toLocaleString()}
              change="Across 31 Districts"
              trend="up"
              period="curriculum pipeline"
              subtitle="Candidates in bottleneck specializations"
              highlight="PMKK Monitored Cohorts"
              tone="indigo"
            />

            <StatCard
              title="Monitored Competencies"
              value={totalTrackedGaps.toString()}
              change="6 Sectors Active"
              trend="up"
              period="national registry"
              subtitle="NCVET / NQR standards benchmarked"
              highlight="Deterministic Gap Engine"
              tone="success"
            />
          </>
        )}
      </section>

      {/* =====================================================
          2. DEMAND VS SUPPLY GAP MATRIX & DISTRIBUTION
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Priority Skill Shortage Matrix (8 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-8 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <SectionHeader
              title="Priority Skill Shortages — Demand vs. Supply Delta"
              subtitle="Comparing active employer mandate demand against certified candidate availability (PostgreSQL Engine)"
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="Filter skills or district..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 w-44 rounded-md border border-slate-200 bg-slate-50/80 pl-8 pr-2.5 text-xs text-slate-800 focus:border-blue-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:focus:bg-slate-800"
                    />
                  </div>

                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="h-8 rounded-md border border-slate-200 bg-slate-50/80 px-2 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200"
                  >
                    <option value="All">All Severity</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Moderate">Moderate</option>
                  </select>
                </div>
              }
            />

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:text-slate-500">
                    <th className="pb-3">Skill / Sector</th>
                    <th className="pb-3">District</th>
                    <th className="pb-3">Employer Demand</th>
                    <th className="pb-3">Trained Supply</th>
                    <th className="pb-3 text-right">Shortage Gap</th>
                    <th className="pb-3 text-right">Affected</th>
                    <th className="pb-3 text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx}>
                        <td colSpan={7} className="py-3">
                          <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                        </td>
                      </tr>
                    ))
                  ) : filteredSkills.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-xs text-slate-500 dark:text-slate-400"
                      >
                        No skill shortages found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSkills.map((skill) => (
                      <tr
                        key={skill.id || `${skill.competency_id}-${skill.district_id}`}
                        onClick={() => handleOpenInterventionModal(skill)}
                        className="cursor-pointer transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                        title="Click to deploy curriculum intervention"
                      >
                        <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                              #{skill.priority_rank}
                            </span>
                            <div>
                              <div>{skill.competency_name}</div>
                              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                {skill.sector}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* District */}
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-slate-800 dark:text-slate-300">
                            {skill.district_name || skill.district_id}
                          </span>
                        </td>

                        {/* Employer Demand Bar */}
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full bg-blue-700 transition-all dark:bg-blue-600"
                                style={{ width: `${Math.min(100, skill.employer_demand_pct)}%` }}
                              />
                            </div>
                            <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                              {skill.employer_demand_pct}%
                            </span>
                          </div>
                        </td>

                        {/* Workforce Supply Bar */}
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full bg-slate-400 transition-all dark:bg-slate-600"
                                style={{ width: `${Math.min(100, skill.workforce_supply_pct)}%` }}
                              />
                            </div>
                            <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                              {skill.workforce_supply_pct}%
                            </span>
                          </div>
                        </td>

                        {/* Gap % */}
                        <td className="py-3 text-right font-bold tabular-nums text-rose-700 dark:text-rose-400">
                          -{skill.deficit_pct}%
                        </td>

                        {/* Affected count */}
                        <td className="py-3 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                          {Number(skill.learners_affected || 0).toLocaleString()}
                        </td>

                        {/* Severity */}
                        <td className="py-3 text-right">
                          <StatusBadge
                            variant={
                              skill.severity === "Critical"
                                ? "danger"
                                : skill.severity === "High"
                                ? "warning"
                                : skill.severity === "Moderate"
                                ? "info"
                                : "success"
                            }
                            size="sm"
                          >
                            {skill.severity}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Click any row to deploy targeted curriculum intervention</span>
            <span className="font-semibold text-rose-700 dark:text-rose-400">
              {filteredSkills.length} Shortage Deficits Monitored
            </span>
          </div>
        </div>

        {/* Severity Distribution & Impact (4 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <SectionHeader
              title="Skill Shortage Severity Tiers"
              subtitle="Distribution of identified workforce deficits"
            />

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="space-y-2 py-3">
                    <div className="flex justify-between">
                      <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <div className="h-1.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                ))
              ) : (
                severityDistribution.map((item) => (
                  <div key={item.level} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={`${item.textTone} dark:text-slate-200`}>
                        {item.level}
                      </span>
                      <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {item.count} Skills ({item.percentage}%)
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${item.barColor}`}
                        style={{ width: `${Math.max(4, item.percentage)}%` }}
                      />
                    </div>

                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-rose-200/80 bg-rose-50/70 p-2.5 text-center text-xs font-medium text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            {criticalCount} Critical shortages cause 64% of total placement delays.
          </div>
        </div>
      </section>

      {/* =====================================================
          3. TARGETED CURRICULUM INTERVENTIONS
      ====================================================== */}
      <section className="space-y-4">
        <SectionHeader
          title="Approved Curriculum Bridge Interventions"
          subtitle="Mandated short-term specialization modules designed to eliminate critical shortages"
          badge={
            <StatusBadge variant="indigo" size="sm">
              Live Interventions Engine
            </StatusBadge>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          {prioritySkills.slice(0, 3).map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 transition-all dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge
                    variant={item.severity === "Critical" ? "danger" : "warning"}
                    size="sm"
                    dot
                  >
                    {item.severity} Priority
                  </StatusBadge>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {item.projected_timeline || "30 Days"}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {item.competency_name}
                </h3>

                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  District: {item.district_name || item.district_id} · Sector: {item.sector}
                </p>

                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.suggested_action ||
                    `Deploy 40-hour applied lab curriculum to bridge the -${item.deficit_pct}% supply deficit for ${item.learners_affected} registered candidates.`}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    Target Deficit
                  </span>
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    -{item.deficit_pct}% Gap
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenInterventionModal(item)}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
                >
                  <span>Deploy</span>
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          4. AI COHORT SKILL INTELLIGENCE & REMEDIATION (GEMINI)
      ====================================================== */}
      {prioritySkills.length > 0 && (
        <AISkillIntelligence
          learner={{
            id: `COHORT-${prioritySkills[0].competency_code || 'DEFICIT'}`,
            is_cohort: true,
            full_name: `${prioritySkills[0].district_name || 'Regional'} ${prioritySkills[0].competency_name} Cohort`,
            district_name: prioritySkills[0].district_name,
            nsqf_level: "NSQF Level 5",
            employment_readiness_score: Math.max(45, 100 - Math.round(prioritySkills[0].deficit_pct)),
            overall_progress: 78,
            skills: prioritySkills.slice(0, 3).map((s) => ({
              name: s.competency_name,
              sector: s.sector,
              score_percentage: Math.round(s.workforce_supply_pct),
              is_verified: true,
            })),
            detected_gaps: prioritySkills.slice(0, 3).map((s) => ({
              name: s.competency_name,
              level: s.severity,
              impact: `Supply deficit of -${s.deficit_pct}% vs active demand (${s.employer_demand_pct}%)`,
            })),
          }}
          onInterventionDeploy={() => handleOpenInterventionModal(prioritySkills[0])}
        />
      )}


      {/* =====================================================
          DEPLOY INTERVENTION ACTION MODAL
      ====================================================== */}
      <ActionModal
        isOpen={isInterventionModalOpen}
        onClose={() => {
          setIsInterventionModalOpen(false);
          setSelectedSkillAction(null);
        }}
        title={
          selectedSkillAction
            ? `Deploy Intervention: ${selectedSkillAction.competency_name}`
            : "Deploy National Skill Bridge Package"
        }
        subtitle={
          selectedSkillAction
            ? `Target District: ${selectedSkillAction.district_name || selectedSkillAction.district_id} (Deficit: -${selectedSkillAction.deficit_pct}%)`
            : "Mandate specialization modules across accredited training centers"
        }
        confirmText={
          permissions.canDeployIntervention
            ? (actionLoading ? "Deploying..." : "Authorize & Deploy Intervention")
            : null
        }
        onConfirm={handleDeployIntervention}
      >
        <div className="space-y-4">
          {!permissions.canDeployIntervention && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <strong>Policy Oversight Notice:</strong> Authorizing curriculum interventions and fiscal budgets is reserved for MSDE Officers and State Skill Mission Administrators.
            </div>
          )}
          {selectedSkillAction && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400">Competency:</span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedSkillAction.competency_name}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Target District:</span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedSkillAction.district_name || selectedSkillAction.district_id}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Employer Demand:</span>
                  <p className="font-semibold text-blue-700 dark:text-blue-400">
                    {selectedSkillAction.employer_demand_pct}%
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Current Deficit:</span>
                  <p className="font-semibold text-rose-700 dark:text-rose-400">
                    -{selectedSkillAction.deficit_pct}%
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Intervention Strategy:
              </label>
              <select
                value={interventionType}
                onChange={(e) => setInterventionType(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="BRIDGE_COURSE">40-Hour Bridge Course</option>
                <option value="TRAINER_DEPLOYMENT">Expert Master Trainer Deployment</option>
                <option value="LAB_EQUIPMENT_UPGRADE">PMKK Lab Equipment Upgrade</option>
                <option value="CURRICULUM_UPDATE">National Curriculum Alignment</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Target Capacity (Seats):
              </label>
              <input
                type="number"
                min="10"
                max="5000"
                value={targetCapacity}
                onChange={(e) => setTargetCapacity(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Budget Allocation (INR ₹):
              </label>
              <input
                type="number"
                step="50000"
                value={budgetINR}
                onChange={(e) => setBudgetINR(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Target Timeline (Weeks):
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={completionWeeks}
                onChange={(e) => setCompletionWeeks(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Administrative & NQR Alignment Notes:
            </label>
            <textarea
              rows={2}
              value={interventionNotes}
              onChange={(e) => setInterventionNotes(e.target.value)}
              placeholder="e.g. Authorized under PMKVY 4.0 Special Projects allocation..."
              className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="rounded-md bg-blue-50 p-2.5 text-[11px] text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            <span className="font-semibold">Simulated NQR Integration:</span> Authorizing this action
            will record a compliance audit entry and dispatch curriculum updates to regional PMKK centers.
          </div>
        </div>
      </ActionModal>
    </div>
  );
}