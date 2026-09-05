import React, { useState, useEffect, useCallback } from "react";
import {
  Compass,
  Sparkles,
  ShieldCheck,
  Target,
  Zap,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Code2,
  FileText,
  Clock,
  ArrowUpRight,
  BarChart3,
  Layers,
  GraduationCap,
  Info,
} from "lucide-react";
import { careerIntelligenceApi } from "../api/careerIntelligence";
import { getErrorMessage } from "../api/client";

export default function CareerIntelligenceCenter({ learnerId = null, onNavigateAction = null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedFormula, setExpandedFormula] = useState(false);
  const [expandedActionEvidence, setExpandedActionEvidence] = useState({});

  const fetchIntelligence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (learnerId) {
        res = await careerIntelligenceApi.getLearnerCareerIntelligence(learnerId);
      } else {
        res = await careerIntelligenceApi.getMyCareerIntelligence();
      }
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load career intelligence."));
    } finally {
      setLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  const toggleActionEvidence = (idx) => {
    setExpandedActionEvidence((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#070d19]/90 p-12 text-center shadow-xl">
        <Loader2 size={36} className="mx-auto animate-spin text-cyan-400 mb-4" />
        <h3 className="font-mono text-base font-semibold text-slate-200">
          Synthesizing Multi-Layer Career Intelligence...
        </h3>
        <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
          Aggregating BKT mastery states, role alignment deficits, adaptive learning milestones,
          verified portfolio evidence, and calibrated XGBoost outcome likelihoods.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-8 text-center">
        <AlertCircle size={36} className="mx-auto text-rose-400 mb-3" />
        <h3 className="font-medium text-slate-200">Unable to Load Career Intelligence</h3>
        <p className="text-xs text-rose-300 mt-1 max-w-md mx-auto">{error || "Data unavailable"}</p>
        <button
          onClick={fetchIntelligence}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={14} /> Retry Analysis
        </button>
      </div>
    );
  }

  const {
    overall_readiness,
    readiness_tier,
    readiness_breakdown,
    placement_probability,
    placement_readiness_tier,
    priority_areas,
    strengths,
    risks,
    next_best_actions,
    career_recommendations,
    learning_recommendations,
    application_recommendations,
    model_version,
    disclaimer,
  } = data;

  const getTierColor = (tier) => {
    switch (tier) {
      case "STRONG_READINESS":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          pill: "bg-emerald-500 text-slate-950",
          progress: "bg-emerald-500",
        };
      case "CAREER_READY":
        return {
          bg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
          pill: "bg-cyan-400 text-slate-950",
          progress: "bg-cyan-400",
        };
      case "DEVELOPING":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          pill: "bg-amber-400 text-slate-950",
          progress: "bg-amber-400",
        };
      default:
        return {
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          pill: "bg-rose-500 text-white",
          progress: "bg-rose-500",
        };
    }
  };

  const tierStyle = getTierColor(readiness_tier);

  const displayedActions =
    activeTab === "learning"
      ? learning_recommendations
      : activeTab === "applications"
      ? application_recommendations
      : next_best_actions;

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case "PRACTICE_DRILL":
      case "LEARN_SKILL":
        return <Zap size={16} className="text-amber-400" />;
      case "REASSESS":
        return <RefreshCw size={16} className="text-cyan-400" />;
      case "COMPLETE_PROJECT":
      case "IMPROVE_PROJECT":
        return <Code2 size={16} className="text-emerald-400" />;
      case "APPLY_TO_ROLE":
      case "CONTINUE_APPLICATIONS":
        return <Briefcase size={16} className="text-blue-400" />;
      case "PREPARE_INTERVIEW":
        return <Sparkles size={16} className="text-purple-400" />;
      case "UPDATE_RESUME":
        return <FileText size={16} className="text-indigo-400" />;
      default:
        return <Target size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0c182c] via-[#091222] to-[#060c18] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Compass size={14} className="animate-spin-slow" /> Phase 6 Production Intelligence
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Career Intelligence Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Closed-loop decision support synthesizing your Bayesian Knowledge Tracing proficiency,
              role requirement benchmarks, adaptive study progress, and calibrated outcome forecasts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchIntelligence}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-all shadow-sm"
              title="Refresh intelligence metrics"
            >
              <RefreshCw size={14} /> Refresh Analysis
            </button>
          </div>
        </div>

        {/* Executive Metrics 4-Card Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {/* Card 1: Multi-Component Readiness */}
          <div className="rounded-xl border border-slate-800 bg-[#070f1e]/90 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>READINESS INDEX (R)</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tierStyle.bg}`}>
                {readiness_tier.replace("_", " ")}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-white">
                {Math.round(overall_readiness * 100)}%
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 100</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full ${tierStyle.progress} transition-all duration-700`}
                style={{ width: `${Math.min(100, Math.max(5, overall_readiness * 100))}%` }}
              />
            </div>
          </div>

          {/* Card 2: Calibrated XGBoost Placement Probability */}
          <div className="rounded-xl border border-slate-800 bg-[#070f1e]/90 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>90-DAY PLACEMENT (P)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                XGBoost
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-sky-400">
                {Math.round(placement_probability * 100)}%
              </span>
              <span className="text-xs text-slate-400 font-mono">likelihood</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 truncate font-mono">
              v: {model_version.split("-")[2] || model_version}
            </p>
          </div>

          {/* Card 3: Priority Area */}
          <div className="rounded-xl border border-slate-800 bg-[#070f1e]/90 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>PRIMARY RISK AREA</span>
              <AlertTriangle size={14} className="text-amber-400" />
            </div>
            <div className="mt-2 text-sm font-medium text-slate-200 line-clamp-2">
              {priority_areas && priority_areas.length > 0
                ? priority_areas[0]
                : "No Critical Blockers"}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Targeted for immediate remediation</p>
          </div>

          {/* Card 4: Action Pipeline */}
          <div className="rounded-xl border border-slate-800 bg-[#070f1e]/90 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>ACTIVE PIPELINE</span>
              <Target size={14} className="text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold text-cyan-400">
                {next_best_actions.length}
              </span>
              <span className="text-xs text-slate-400 font-mono">Next-Best Actions</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Evidence-ordered action steps</p>
          </div>
        </div>
      </div>

      {/* 2. Multi-Component Readiness Breakdown Section */}
      <div className="rounded-2xl border border-slate-800 bg-[#070f1e] p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-cyan-400" />
              Multi-Component Readiness Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic mathematical weighting of verified cognitive and portfolio signals.
            </p>
          </div>
          <button
            onClick={() => setExpandedFormula(!expandedFormula)}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {expandedFormula ? "Hide Formula" : "View Mathematical Model"}
            {expandedFormula ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {expandedFormula && (
          <div className="mt-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 text-xs font-mono text-cyan-300">
            <div className="font-semibold text-white mb-1">Composite Readiness Score Formula:</div>
            <div className="overflow-x-auto whitespace-pre">{readiness_breakdown.formula}</div>
            <p className="text-[11px] text-slate-400 mt-2 font-sans">
              Where BKT represents Bayesian mastery across verified competencies; RoleMatch is
              multi-attribute alignment; GapDeficit measures unmet prerequisite thresholds; and
              Portfolio/Velocity measures verified artifacts and employer responsiveness.
            </p>
          </div>
        )}

        {/* Component Bars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {readiness_breakdown.components.map((comp, idx) => {
            const pct = Math.round(comp.score * 100);
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800/70 bg-[#091325]/70 p-4 space-y-2 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{comp.component}</span>
                  <span className="font-mono text-cyan-400 font-bold">{pct}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Weight: {Math.round(comp.weight * 100)}%</span>
                  <span className="font-mono">Contribution: +{(comp.weighted_score * 100).toFixed(1)}%</span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {comp.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Prioritized Next-Best Actions (The Core Loop) */}
      <div className="rounded-2xl border border-slate-800 bg-[#070f1e] p-6 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              Prioritized Next-Best Actions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked interventions designed to yield the highest marginal gain in qualification and placement velocity.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                activeTab === "all" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              All ({next_best_actions.length})
            </button>
            <button
              onClick={() => setActiveTab("learning")}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                activeTab === "learning" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Learning ({learning_recommendations.length})
            </button>
            <button
              onClick={() => setActiveTab("applications")}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                activeTab === "applications" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Applications ({application_recommendations.length})
            </button>
          </div>
        </div>

        {/* Actions List */}
        <div className="space-y-3">
          {displayedActions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No actions in this category. All current requirements satisfied.
            </div>
          ) : (
            displayedActions.map((act, idx) => {
              const isEvidenceExpanded = !!expandedActionEvidence[idx];
              const urgencyPct = Math.round(act.priority * 100);

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-[#091427]/80 hover:border-slate-700 transition-all p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 mt-0.5">
                        {getActionIcon(act.action_type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-white">{act.title}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {act.action_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{act.reason}</p>
                      </div>
                    </div>

                    {/* Urgency Badge */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-300">
                        <span>{urgencyPct}%</span>
                        <span className="text-[10px] font-normal text-slate-400">urgency</span>
                      </div>
                      <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock size={12} />
                        <span>~{act.estimated_effort_hours}h effort</span>
                      </div>
                    </div>
                  </div>

                  {/* Context chips & Evidence toggle */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {act.related_skill && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 font-mono">
                          Skill: {act.related_skill}
                        </span>
                      )}
                      {act.related_role && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          Role: {act.related_role}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleActionEvidence(idx)}
                      className="text-[11px] text-slate-400 hover:text-cyan-400 font-mono inline-flex items-center gap-1 transition-colors"
                    >
                      {isEvidenceExpanded ? "Hide Evidence" : "Inspect Rationale Evidence"}
                      {isEvidenceExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {/* Expandable Evidence JSON / Context */}
                  {isEvidenceExpanded && act.evidence && (
                    <div className="p-3 rounded-lg bg-[#040812] border border-slate-800 text-xs font-mono text-slate-300 mt-2">
                      <div className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                        Audit Trigger Signals:
                      </div>
                      <pre className="text-[11px] text-cyan-400/90 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(act.evidence, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Strengths & Risk Mitigations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verified Strengths */}
        <div className="rounded-2xl border border-slate-800 bg-[#070f1e] p-6 shadow-lg space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            Verified Portfolio Strengths
          </h3>
          <div className="space-y-3">
            {strengths.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Strengths will populate as assessments and project evidence are verified.
              </p>
            ) : (
              strengths.map((str, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-3.5 space-y-1.5"
                >
                  <h4 className="text-xs font-semibold text-emerald-300">{str.title}</h4>
                  <p className="text-xs text-slate-300">{str.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Risks */}
        <div className="rounded-2xl border border-slate-800 bg-[#070f1e] p-6 shadow-lg space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-400" />
            Identified Risk Factors
          </h3>
          <div className="space-y-3">
            {risks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No active critical risks identified for current role profile.
              </p>
            ) : (
              risks.map((r, idx) => {
                const isCrit = r.severity === "CRITICAL";
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3.5 space-y-1.5 ${
                      isCrit
                        ? "border-rose-900/40 bg-rose-950/10"
                        : "border-amber-900/40 bg-amber-950/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-semibold ${isCrit ? "text-rose-300" : "text-amber-300"}`}>
                        {r.title}
                      </h4>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isCrit
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {r.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{r.description}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. Strategic Recommendations & Non-Coercive Role Opportunities */}
      {career_recommendations.length > 0 && (
        <div className="rounded-2xl border border-cyan-800/40 bg-gradient-to-r from-[#08152c] to-[#0a1835] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-cyan-400" />
            <h3 className="text-base font-semibold text-white">
              Strategic Advisory &amp; Role Opportunities
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {career_recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-4 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold uppercase">
                    {rec.recommendation_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Priority: {Math.round(rec.priority * 100)}%
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white">{rec.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{rec.reason}</p>

                {rec.evidence?.disclaimer && (
                  <p className="text-[10px] text-slate-400 italic pt-2 border-t border-slate-800">
                    {rec.evidence.disclaimer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Legal & Non-Guarantee Disclaimer Callout */}
      <div className="rounded-xl border border-slate-800/80 bg-[#050b16] p-4 text-xs text-slate-400 flex items-start gap-3">
        <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-medium text-slate-300">Decision Support System Notice</div>
          <p className="leading-relaxed">{disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
