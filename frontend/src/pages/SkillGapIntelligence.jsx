import React, { useState, useEffect, useCallback } from "react";
import {
  BrainCircuit,
  Search,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Download,
  Users,
  Target,
  Layers,
} from "lucide-react";

import { skillGapsApi } from "../api/skillGaps";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { exportSkillGapsCSV } from "../utils/csvExport";
import { exportSkillInterventionPDF } from "../utils/pdfExport";
import { usePermissions } from "../hooks/usePermissions";

import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import TechStatCard from "../components/TechStatCard";
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
      barColor: "bg-rose-500",
      textTone: "text-rose-400",
      description: "Deficit > 40% directly impeding immediate employer hiring",
    },
    {
      level: "High Severity",
      count: distributionData?.severity_counts?.High || 0,
      percentage: Math.round(
        ((distributionData?.severity_counts?.High || 0) / totalSeverityCount) * 100
      ),
      barColor: "bg-amber-400",
      textTone: "text-amber-400",
      description: "Deficit 25–40% requiring 30-hour bridge curriculum",
    },
    {
      level: "Moderate Severity",
      count: distributionData?.severity_counts?.Moderate || 0,
      percentage: Math.round(
        ((distributionData?.severity_counts?.Moderate || 0) / totalSeverityCount) * 100
      ),
      barColor: "bg-sky-400",
      textTone: "text-sky-400",
      description: "Deficit 10–25% solvable via standard PMKK lab credits",
    },
    {
      level: "Aligned / Balanced",
      count: distributionData?.severity_counts?.Aligned || 0,
      percentage: Math.round(
        ((distributionData?.severity_counts?.Aligned || 0) / totalSeverityCount) * 100
      ),
      barColor: "bg-emerald-400",
      textTone: "text-emerald-400",
      description: "Workforce supply matches regional hiring mandates",
    },
  ];

  return (
    <div className="space-y-8 font-sans text-[#f1f5f9]">
      {/* =====================================================
          1. PAGE HEADER & ACTIONS
      ====================================================== */}
      <PageHeader
        badge="SKILL GAP INTELLIGENCE"
        badgeVariant="danger"
        title="Skill Gap Matrix"
        description="Evidence-based skill supply, demand, and training-gap intelligence."
        breadcrumbs={["National Platform", "Skill Gap Intelligence"]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchSkillGapData(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#0b1528] px-3 py-2 font-mono text-xs font-semibold text-slate-300 shadow-xs transition hover:border-slate-700 hover:bg-[#0f1c33] hover:text-white disabled:opacity-50 cursor-pointer"
              title="Sync latest skill gap calculations"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-rose-400" : "text-rose-400"} />
              <span>{isRefreshing ? "Syncing..." : "Sync Live Deficits"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportSkillGapsCSV(filteredSkills, selectedSeverity, selectedSector);
                setActionSuccessMsg(`✅ Exported ${filteredSkills.length} skill shortage deficits to CSV.`);
              }}
              disabled={filteredSkills.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#0b1528] px-3 py-2 font-mono text-xs font-semibold text-slate-300 shadow-xs transition hover:border-slate-700 hover:bg-[#0f1c33] hover:text-white disabled:opacity-50 cursor-pointer"
              title="Export filtered deficit matrix to CSV"
            >
              <Download size={13} className="text-sky-400" />
              <span>Export Matrix (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenInterventionModal(null)}
              className="group inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 px-3.5 py-2 font-heading text-xs font-bold text-white shadow-xs transition active:scale-[0.98] cursor-pointer"
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

      {/* Error Alert Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-400" />
            <div>
              <p className="font-heading font-bold text-white">Unable to Load Skill Gap Data</p>
              <p className="mt-0.5 font-mono text-rose-300">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchSkillGapData()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 font-mono font-semibold text-white transition hover:bg-rose-500 active:scale-95 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* =====================================================
          2. CORE NATIONAL SKILL GAP KPIS (TechStatCard)
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex h-36 animate-pulse flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5"
            >
              <div className="h-3 w-28 rounded bg-[#1e293b]" />
              <div className="h-7 w-20 rounded bg-[#1e293b]" />
              <div className="h-3 w-40 rounded bg-[#1e293b]" />
            </div>
          ))
        ) : (
          <>
            <TechStatCard
              title="Critical Skill Deficits"
              value={criticalCount.toString()}
              subtitle={`${criticalCount} competencies require bridge modules`}
              trend="Action Mandated"
              trendDirection="down"
              icon={AlertCircle}
              variant="amber"
              footerText="Deficit > 40% vs Demand"
            />

            <TechStatCard
              title="Avg Workforce Deficit"
              value={`${distributionData?.avg_deficit_pct || 0}%`}
              subtitle="Demand vs. certified supply spread"
              trend="+3.4% MoM"
              trendDirection="up"
              icon={BrainCircuit}
              variant="cyan"
              footerText="Aggregated Across Sectors"
            />

            <TechStatCard
              title="Impacted Beneficiaries"
              value={Number(distributionData?.total_learners_affected || 0).toLocaleString()}
              subtitle="Candidates in bottleneck specializations"
              trend="Across Districts"
              trendDirection="up"
              icon={Users}
              variant="indigo"
              footerText="PMKK Monitored Cohorts"
            />

            <TechStatCard
              title="Monitored Competencies"
              value={totalTrackedGaps.toString()}
              subtitle="NCVET / NQR standards benchmarked"
              trend="Active Matrix"
              trendDirection="up"
              icon={Target}
              variant="emerald"
              footerText="Deterministic Gap Engine"
            />
          </>
        )}
      </section>

      {/* =====================================================
          3. DEMAND VS SUPPLY GAP MATRIX & DISTRIBUTION
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Priority Skill Shortage Matrix (8 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 xl:col-span-8 shadow-sm">
          <div>
            <SectionHeader
              title="Priority Skill Shortages — Demand vs. Supply Delta"
              subtitle="Comparing active employer mandate demand against certified candidate availability"
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="Filter skills or district..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 w-44 rounded-lg border border-[#1e293b] bg-[#070d18] pl-8 pr-2.5 font-sans text-xs text-slate-200 placeholder:text-slate-500 transition-all focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="h-8 rounded-lg border border-[#1e293b] bg-[#070d18] px-2 font-mono text-xs font-semibold text-slate-300 focus:border-sky-400 focus:outline-none cursor-pointer"
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
                  <tr className="border-b border-[#1e293b] font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3">Skill / Sector</th>
                    <th className="pb-3">District</th>
                    <th className="pb-3">Employer Demand</th>
                    <th className="pb-3">Trained Supply</th>
                    <th className="pb-3 text-right">Shortage Gap</th>
                    <th className="pb-3 text-right">Affected</th>
                    <th className="pb-3 text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b] text-xs">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx}>
                        <td colSpan={7} className="py-3">
                          <div className="h-4 w-full animate-pulse rounded bg-[#1e293b]" />
                        </td>
                      </tr>
                    ))
                  ) : filteredSkills.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center font-mono text-xs text-slate-500"
                      >
                        No skill shortages found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSkills.map((skill) => (
                      <tr
                        key={skill.id || `${skill.competency_id}-${skill.district_id}`}
                        onClick={() => handleOpenInterventionModal(skill)}
                        className="cursor-pointer transition-colors hover:bg-[#0f1c33]"
                        title="Click to deploy curriculum intervention"
                      >
                        <td className="py-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-sky-400">
                              #{skill.priority_rank}
                            </span>
                            <div>
                              <div>{skill.competency_name}</div>
                              <span className="font-mono text-[10px] font-normal text-slate-400">
                                {skill.sector}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* District */}
                        <td className="py-3 text-slate-300">
                          <span className="rounded border border-[#1e293b] bg-[#070d18] px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-300">
                            {skill.district_name || skill.district_id}
                          </span>
                        </td>

                        {/* Employer Demand Bar */}
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[#070d18]">
                              <div
                                className="h-full rounded-full bg-sky-400 transition-all"
                                style={{ width: `${Math.min(100, skill.employer_demand_pct)}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold tabular-nums text-white">
                              {skill.employer_demand_pct}%
                            </span>
                          </div>
                        </td>

                        {/* Workforce Supply Bar */}
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[#070d18]">
                              <div
                                className="h-full rounded-full bg-slate-500 transition-all"
                                style={{ width: `${Math.min(100, skill.workforce_supply_pct)}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold tabular-nums text-slate-300">
                              {skill.workforce_supply_pct}%
                            </span>
                          </div>
                        </td>

                        {/* Gap % */}
                        <td className="py-3 text-right font-mono font-bold tabular-nums text-rose-400">
                          -{skill.deficit_pct}%
                        </td>

                        {/* Affected count */}
                        <td className="py-3 text-right font-mono font-semibold tabular-nums text-slate-300">
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

          <div className="mt-4 flex items-center justify-between border-t border-[#1e293b] pt-3 font-mono text-xs text-slate-400">
            <span>Click any row to deploy targeted curriculum intervention</span>
            <span className="font-bold text-rose-400">
              {filteredSkills.length} Shortage Deficits Monitored
            </span>
          </div>
        </div>

        {/* Severity Distribution & Impact (4 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 sm:p-6 xl:col-span-4 shadow-sm">
          <div>
            <SectionHeader
              title="Skill Shortage Severity Tiers"
              subtitle="Distribution of identified workforce deficits"
            />

            <div className="mt-4 divide-y divide-[#1e293b]">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="space-y-2 py-3">
                    <div className="flex justify-between">
                      <div className="h-3 w-28 rounded bg-[#1e293b]" />
                      <div className="h-3 w-12 rounded bg-[#1e293b]" />
                    </div>
                    <div className="h-1.5 w-full rounded bg-[#1e293b]" />
                  </div>
                ))
              ) : (
                severityDistribution.map((item) => (
                  <div key={item.level} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={`${item.textTone} font-heading`}>
                        {item.level}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-white">
                        {item.count} Skills ({item.percentage}%)
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#070d18]">
                      <div
                        className={`h-full rounded-full ${item.barColor}`}
                        style={{ width: `${Math.max(4, item.percentage)}%` }}
                      />
                    </div>

                    <p className="mt-1 text-[11px] text-slate-400">
                      {item.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/30 p-2.5 text-center font-mono text-xs text-rose-300">
            {criticalCount} Critical shortages cause 64% of total placement delays.
          </div>
        </div>
      </section>

      {/* =====================================================
          4. TARGETED CURRICULUM INTERVENTIONS
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
              className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 transition-all hover:border-slate-700 shadow-sm"
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
                  <span className="rounded border border-[#1e293b] bg-[#070d18] px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                    {item.projected_timeline || "30 Days"}
                  </span>
                </div>

                <h3 className="mt-3 font-heading text-sm font-bold tracking-tight text-white">
                  {item.competency_name}
                </h3>

                <p className="mt-1 font-mono text-xs font-semibold text-slate-400">
                  District: {item.district_name || item.district_id} · Sector: {item.sector}
                </p>

                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {item.suggested_action ||
                    `Deploy 40-hour applied lab curriculum to bridge the -${item.deficit_pct}% supply deficit for ${item.learners_affected} registered candidates.`}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#1e293b] pt-3">
                <div>
                  <span className="block font-mono text-[10px] font-bold uppercase text-slate-500">
                    Target Deficit
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-400">
                    -{item.deficit_pct}% Gap
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenInterventionModal(item)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#1e293b] bg-[#070d18] px-2.5 py-1 font-mono text-xs font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-[#0f1c33] cursor-pointer"
                >
                  <span>Deploy</span>
                  <ArrowUpRight size={12} className="text-sky-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          5. AI COHORT SKILL INTELLIGENCE & REMEDIATION (GEMINI)
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
        <div className="space-y-4 font-sans text-xs">
          {!permissions.canDeployIntervention && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-2.5 text-xs text-amber-200">
              <strong>Policy Oversight Notice:</strong> Authorizing curriculum interventions and fiscal budgets is reserved for MSDE Officers and State Skill Mission Administrators.
            </div>
          )}
          {selectedSkillAction && (
            <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="font-mono text-[10px] text-slate-500">Competency:</span>
                  <p className="font-heading font-semibold text-white">
                    {selectedSkillAction.competency_name}
                  </p>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-slate-500">Target District:</span>
                  <p className="font-semibold text-white">
                    {selectedSkillAction.district_name || selectedSkillAction.district_id}
                  </p>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-slate-500">Employer Demand:</span>
                  <p className="font-mono font-semibold text-sky-400">
                    {selectedSkillAction.employer_demand_pct}%
                  </p>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-slate-500">Current Deficit:</span>
                  <p className="font-mono font-semibold text-rose-400">
                    -{selectedSkillAction.deficit_pct}%
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-300">
                Intervention Strategy:
              </label>
              <select
                value={interventionType}
                onChange={(e) => setInterventionType(e.target.value)}
                className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2 text-xs text-white focus:border-sky-400 focus:outline-none"
              >
                <option value="BRIDGE_COURSE">40-Hour Bridge Course</option>
                <option value="TRAINER_DEPLOYMENT">Expert Master Trainer Deployment</option>
                <option value="LAB_EQUIPMENT_UPGRADE">PMKK Lab Equipment Upgrade</option>
                <option value="CURRICULUM_UPDATE">National Curriculum Alignment</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300">
                Target Capacity (Seats):
              </label>
              <input
                type="number"
                min="10"
                max="5000"
                value={targetCapacity}
                onChange={(e) => setTargetCapacity(e.target.value)}
                className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2.5 font-mono text-xs text-white focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300">
                Budget Allocation (INR ₹):
              </label>
              <input
                type="number"
                step="50000"
                value={budgetINR}
                onChange={(e) => setBudgetINR(e.target.value)}
                className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2.5 font-mono text-xs text-white focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300">
                Target Timeline (Weeks):
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={completionWeeks}
                onChange={(e) => setCompletionWeeks(e.target.value)}
                className="mt-1 h-8 w-full rounded border border-[#1e293b] bg-[#070d18] px-2.5 font-mono text-xs text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300">
              Administrative &amp; NQR Alignment Notes:
            </label>
            <textarea
              rows={2}
              value={interventionNotes}
              onChange={(e) => setInterventionNotes(e.target.value)}
              placeholder="e.g. Authorized under PMKVY 4.0 Special Projects allocation..."
              className="mt-1 w-full rounded border border-[#1e293b] bg-[#070d18] p-2 text-xs text-white focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-sky-500/30 bg-sky-950/40 p-2.5 font-mono text-[11px] text-sky-300">
            <span className="font-semibold">Simulated NQR Integration:</span> Authorizing this action
            will record a compliance audit entry and dispatch curriculum updates to regional PMKK centers.
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
