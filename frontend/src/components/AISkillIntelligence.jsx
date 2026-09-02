import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  ArrowRight,
  Code2,
  Briefcase,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { aiApi } from "../api/ai";
import { getErrorMessage } from "../api/client";
import SectionHeader from "./SectionHeader";
import StatusBadge from "./StatusBadge";


const PRESET_OCCUPATIONS = [
  "Full Stack Cloud Engineer",
  "Data Analyst & Analytics Engineer",
  "DevOps & Containerization Specialist",
  "Electric Vehicle (EV) Diagnostic Specialist",
  "Solar Microgrid & Renewables Technician",
  "CNC Precision Manufacturing Technician",
];

export default function AISkillIntelligence({
  learner,
  onInterventionDeploy,
}) {
  const [targetRole, setTargetRole] = useState(
    learner?.skills?.[0]?.name ? `${learner.skills[0].name} Specialist` : "Full Stack Cloud Engineer"
  );
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [isCustomRole, setIsCustomRole] = useState(false);

  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(1);
  const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);

  // Sync default target role if learner changes
  useEffect(() => {
    if (learner) {
      const defaultRole = learner.skills?.[0]?.sector === "Green Energy & Renewables"
        ? "Solar Microgrid & Renewables Technician"
        : learner.skills?.[0]?.sector === "Automotive & Manufacturing"
        ? "Electric Vehicle (EV) Diagnostic Specialist"
        : learner.skills?.[0]?.sector === "IT-ITeS"
        ? "Full Stack Cloud Engineer"
        : "Full Stack Cloud Engineer";
      setTargetRole(defaultRole);
      setIsCustomRole(false);
      setAiData(null);
      setError(null);
    }
  }, [learner?.id]);

  const handleGenerateAnalysis = useCallback(async () => {
    if (!learner) return;

    try {
      setLoading(true);
      setError(null);

      const effectiveRole = isCustomRole && customRoleInput.trim()
        ? customRoleInput.trim()
        : targetRole;

      const isCohort = learner.is_cohort || learner.isCohort || (typeof learner.id === "string" && learner.id.startsWith("COHORT-"));

      const payload = {
        learner_id: isCohort ? null : learner.id,
        full_name: learner.full_name || "Beneficiary Candidate",
        target_occupation: effectiveRole,
        education_level: learner.education_level,
        district_name: learner.district_name || learner.district_id,
        nsqf_level: learner.nsqf_level || "NSQF Level 5",
        employment_readiness_score: learner.employment_readiness_score,
        overall_progress: learner.overall_progress,
        current_skills: (learner.skills || []).map((s) => ({
          name: s.name,
          sector: s.sector || "IT-ITeS",
          score_percentage: s.score_percentage,
          is_verified: s.is_verified,
        })),
        existing_gaps: (learner.detected_gaps || []).map((g) => (typeof g === "string" ? g : g.name || "")).filter(Boolean),
      };

      const result = await aiApi.analyzeSkillGap(payload);
      setAiData(result);
      setExpandedPhase(1);
    } catch (err) {
      console.error("AI Skill Gap Analysis failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [learner, isCustomRole, customRoleInput, targetRole]);

  // Trigger analysis automatically once on initial mount if candidate exists
  useEffect(() => {
    if (learner?.id && !aiData && !hasAutoAnalyzed && !loading) {
      setHasAutoAnalyzed(true);
      handleGenerateAnalysis();
    }
  }, [learner?.id, aiData, hasAutoAnalyzed, loading, handleGenerateAnalysis]);

  if (!learner) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-white p-5 sm:p-7 shadow-xs dark:border-indigo-900/50 dark:bg-slate-900">
      {/* Background Decorative Accent */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl dark:bg-indigo-500/10" />

      {/* Header & Target Role Selector */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Sparkles size={15} />
            </div>
            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              AI Skill Intelligence & Personalized Learning Roadmap
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Zap size={11} className="text-amber-500 fill-amber-500" />
              Google Gemini Powered
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Synthesizes verified competency dossiers against industry demand using Google Gemini AI
            to construct a personalized curriculum roadmap and job-readiness timeline.
          </p>
        </div>



        {/* Target Occupation Control */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Target Role:
            </span>
            {isCustomRole ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  placeholder="e.g. Cloud Security Engineer"
                  className="h-8 w-48 rounded-md border border-indigo-200 bg-white px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomRole(false)}
                  className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Presets
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <select
                  value={targetRole}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomRole(true);
                      setCustomRoleInput("");
                    } else {
                      setTargetRole(e.target.value);
                    }
                  }}
                  className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {PRESET_OCCUPATIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                  <option value="__custom__">+ Custom Occupation...</option>
                </select>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateAnalysis}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Analyzing..." : "Analyze Skill Gap"}</span>
          </button>
        </div>
      </div>

      {/* Error Alert State */}
      {error && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">
                {error.toLowerCase().includes("scope") || error.toLowerCase().includes("permission")
                  ? "Institutional Scope Restriction"
                  : "AI Analysis Generation Notice"}
              </p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">{error}</p>
            </div>
          </div>
          {!error.toLowerCase().includes("scope") && !error.toLowerCase().includes("permission") && (
            <button
              type="button"
              onClick={handleGenerateAnalysis}
              className="rounded bg-amber-700 px-3 py-1 font-semibold text-white hover:bg-amber-800"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !aiData && (
        <div className="mt-6 space-y-4">
          <div className="h-20 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-44 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-44 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      )}

      {/* AI Analysis Main Display */}
      {aiData && (
        <div className="mt-6 space-y-6">
          {/* 1. Executive Summary & Core Strengths Bar */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-blue-50/60 p-4 sm:p-5 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-blue-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  {aiData.is_ai_generated ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                      <Sparkles size={11} className="text-purple-600 dark:text-purple-400" />
                      AI-Generated Analysis
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                      <ShieldCheck size={11} className="text-blue-600 dark:text-blue-400" />
                      Deterministic Rules Engine
                    </span>
                  )}
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Engine: <strong className="text-slate-700 dark:text-slate-300">{aiData.model_used || "Google Gemini"}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <CheckCircle2 size={10} /> Verified Grounding
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                  {aiData.summary}
                </p>
              </div>

              <div className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-right shadow-2xs dark:border-indigo-900/60 dark:bg-slate-900">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Readiness Horizon
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {typeof aiData.job_readiness === "object"
                    ? aiData.job_readiness.estimated_time_to_ready || "3–4 Weeks"
                    : "3–4 Weeks"}
                </span>
              </div>
            </div>

            {/* Strengths Chips */}
            {aiData.strengths && aiData.strengths.length > 0 && (
              <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-indigo-100/80 pt-3 dark:border-indigo-900/30">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  Demonstrated Strengths:
                </span>
                {aiData.strengths.map((str) => (
                  <span
                    key={str}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                    {str}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 2. Prioritized Skill Gaps & Rationale Grid */}
          <div className="space-y-3">
            <SectionHeader
              title="Diagnosed Skill Gaps & Employer Mandate Rationale"
              subtitle="Prioritized competency deficits hindering direct placement in target role"
              badge={
                <StatusBadge variant="warning" size="sm">
                  {aiData.skill_gaps?.length || 0} Actionable Deficits
                </StatusBadge>
              }
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(aiData.skill_gaps || []).map((gap, idx) => {
                const isCritical = gap.priority === "Critical";
                const isHigh = gap.priority === "High";

                return (
                  <div
                    key={gap.skill || idx}
                    className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                      isCritical
                        ? "border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20"
                        : isHigh
                        ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20"
                        : "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          GAP #{idx + 1}
                        </span>
                        <StatusBadge
                          variant={isCritical ? "danger" : isHigh ? "warning" : "info"}
                          size="sm"
                          dot
                        >
                          {gap.priority} Priority
                        </StatusBadge>
                      </div>

                      <h4 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                        {gap.skill}
                      </h4>

                      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-800 dark:text-slate-200">
                          Why it matters:
                        </strong>{" "}
                        {gap.reason}
                      </p>
                    </div>

                    {gap.suggested_action && (
                      <div className="mt-3 rounded-lg border border-slate-100 bg-white p-2 text-[10px] font-medium text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          Recommended Action:
                        </span>{" "}
                        {gap.suggested_action}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Phased Personalized Learning Roadmap (Interactive Accordion) */}
          <div className="space-y-3">
            <SectionHeader
              title="Personalized Phased Learning Roadmap"
              subtitle="Step-by-step modular progression to achieve 100% employment readiness"
              badge={
                <StatusBadge variant="indigo" size="sm">
                  {aiData.roadmap?.length || 3} Milestone Phases
                </StatusBadge>
              }
            />

            <div className="space-y-2.5">
              {(aiData.roadmap || []).map((phase) => {
                const isExpanded = expandedPhase === phase.phase;

                return (
                  <div
                    key={phase.phase}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white transition dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Accordion Phase Header */}
                    <button
                      type="button"
                      onClick={() => setExpandedPhase(isExpanded ? null : phase.phase)}
                      className="flex w-full items-center justify-between p-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-bold text-xs text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                          P{phase.phase}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {phase.title || `Phase ${phase.phase}`}
                          </span>
                          <span className="ml-2 text-[10px] font-medium text-slate-400">
                            Duration: {phase.duration}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline-block rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                          {phase.skills?.length || 0} Competencies
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Accordion Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/70">
                        {/* Skills Covered in Phase */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Target Competencies:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(phase.skills || []).map((sk) => (
                              <span
                                key={sk}
                                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Practical Activities */}
                        {phase.activities && phase.activities.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Curriculum & Lab Drills:
                            </span>
                            <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                              {phase.activities.map((act, aIdx) => (
                                <li key={aIdx} className="flex items-start gap-1.5">
                                  <ArrowRight
                                    size={12}
                                    className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400"
                                  />
                                  <span>{act}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Milestone Expected Outcome */}
                        {phase.expected_outcome && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-[11px] font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>
                              <strong>Milestone Benchmark:</strong> {phase.expected_outcome}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Practical Lab Projects & Job Readiness Recommendations */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Suggested Lab Projects */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center gap-2">
                  <Code2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Suggested Practical Lab Projects
                  </h4>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Hands-on portfolio implementations demonstrating production readiness to recruiters.
                </p>

                <div className="mt-3 space-y-3">
                  {(aiData.projects || []).map((proj, pIdx) => (
                    <div
                      key={proj.title || pIdx}
                      className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {proj.title}
                        </span>
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                          {proj.complexity || "Intermediate"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                        {proj.description}
                      </p>
                      {proj.skills_applied && proj.skills_applied.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {proj.skills_applied.map((s) => (
                            <span
                              key={s}
                              className="rounded bg-slate-200/70 px-1.5 py-0.2 text-[9px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Job Readiness Assessment */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Job-Readiness Recommendations
                  </h4>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Strategic placement positioning benchmarked against enterprise qualification mandates.
                </p>

                {typeof aiData.job_readiness === "object" ? (
                  <div className="mt-3 space-y-3 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 dark:bg-slate-950/60">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Readiness Tier:
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {aiData.job_readiness.readiness_level}
                      </span>
                    </div>

                    {aiData.job_readiness.recommended_target_roles && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          Recommended Target Roles:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {aiData.job_readiness.recommended_target_roles.map((r) => (
                            <span
                              key={r}
                              className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">Interview Advice:</strong>{" "}
                      {aiData.job_readiness.key_advice}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                    {aiData.job_readiness}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-[10px] text-slate-400">
                  NCVET / NSQF Standard Matrix
                </span>
                {onInterventionDeploy && (
                  <button
                    type="button"
                    onClick={onInterventionDeploy}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <span>Allocate Bridge Credit</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI vs Database Fact Disclaimer Badge */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200/60 bg-slate-50/70 px-3.5 py-2.5 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>
                <strong>Grounding & Reliability Standard:</strong> {aiData.is_ai_generated
                  ? `AI analysis generated via ${aiData.model_used} grounded on supplied candidate competencies.`
                  : `Structured recommendations generated via ${aiData.model_used}.`}{" "}
                Assessment scores, verified skill badges, and NSQF levels are verified database facts.
              </span>
            </div>
            <span className="shrink-0 font-mono text-[9px] text-slate-400">
              {new Date(aiData.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

        </div>
      )}
    </section>
  );
}
