import React, { useState, useEffect, useCallback } from "react";
import {
  BrainCircuit,
  Sparkles,
  Target,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  BookOpen,
  Code2,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Award,
  Layers,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Play,
  Check,
} from "lucide-react";
import { learnerPipelineApi } from "../api/learnerPipeline";
import { getErrorMessage } from "../api/client";

export default function AdaptiveLearningWorkspace({ onProgressUpdated }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Plan & Modules State
  const [plan, setPlan] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [expandedModuleId, setExpandedModuleId] = useState(null);

  // Practice Workspace State
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceData, setPracticeData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmittingPractice, setIsSubmittingPractice] = useState(false);
  const [practiceResult, setPracticeResult] = useState(null);

  // Activity Log State
  const [loggingActivity, setLoggingActivity] = useState(false);

  // Load Active Learning Plan
  const loadLearningPlan = useCallback(async (forceRegenerate = false) => {
    try {
      setLoading(true);
      setError(null);
      const planData = forceRegenerate
        ? await learnerPipelineApi.generateLearningPlan(true)
        : await learnerPipelineApi.getMyLearningPlan();

      setPlan(planData);
      if (planData?.modules?.length > 0) {
        // Set first in-progress or pending module as active
        const current =
          planData.modules.find((m) => m.status === "IN_PROGRESS") ||
          planData.modules.find((m) => m.status !== "MASTERED") ||
          planData.modules[0];
        setActiveModule(current);
      }
    } catch (err) {
      console.error("Error loading learning plan:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLearningPlan();
  }, [loadLearningPlan]);

  // Start Practice for a Module
  const handleStartPractice = async (module) => {
    try {
      setLoading(true);
      setError(null);
      setPracticeResult(null);
      setSelectedAnswers({});
      setCurrentQuestionIndex(0);

      const qSet = await learnerPipelineApi.getPracticeQuestions(module.competency_id);
      setPracticeData(qSet);
      setActiveModule(module);
      setIsPracticing(true);
    } catch (err) {
      console.error("Error fetching practice items:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Submit Practice Attempt
  const handleSubmitPractice = async () => {
    if (!practiceData || !activeModule) return;

    const answersPayload = practiceData.questions.map((q) => ({
      question_id: q.id,
      selected_answer: selectedAnswers[q.id] || "",
    }));

    const unanswered = answersPayload.filter((a) => !a.selected_answer);
    if (unanswered.length > 0) {
      setError(`Please answer all ${practiceData.questions.length} questions before submitting.`);
      return;
    }

    try {
      setIsSubmittingPractice(true);
      setError(null);

      const result = await learnerPipelineApi.submitPractice(activeModule.competency_id, {
        answers: answersPayload,
        time_spent_seconds: 180,
      });

      setPracticeResult(result);
      // Reload plan in background to refresh sequence & mastery deltas
      loadLearningPlan(false);
      if (onProgressUpdated) onProgressUpdated();
    } catch (err) {
      console.error("Error submitting practice attempt:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingPractice(false);
    }
  };

  // Record Educational Resource Activity (reading docs, watching lecture)
  const handleLogResourceActivity = async (resource, module) => {
    try {
      setLoggingActivity(true);
      await learnerPipelineApi.recordLearningActivity({
        module_id: module.id,
        resource_id: resource.id,
        activity_type: "RESOURCE_COMPLETED",
        time_spent_minutes: Math.round(resource.estimated_hours * 60) || 30,
      });
      setSuccessMsg(
        `Activity logged: "${resource.title}". Note: BKT mastery remains unchanged until validated by assessment.`
      );
    } catch (err) {
      console.error("Error recording learning activity:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoggingActivity(false);
    }
  };

  if (loading && !plan) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-[#1e293b] bg-[#0b1528] text-center">
        <Loader2 size={36} className="animate-spin text-sky-400 mb-4" />
        <p className="font-heading text-base font-bold text-white">
          Synthesizing Adaptive Learning Plan...
        </p>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Resolving competency prerequisite dependency graphs, ordering critical BKT gaps, and estimating optimal remediation hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-mono text-xs font-bold uppercase text-rose-400 hover:text-rose-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="font-mono text-xs font-bold uppercase text-emerald-400 hover:text-emerald-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overview & Metric Gauges Header */}
      {plan && (
        <div className="p-5 rounded-2xl border border-[#1e293b] bg-[#0b1528] shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-950/50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  Closed-Loop Remediation Engine
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="font-mono text-xs text-slate-400">
                  Plan ID: {plan.id.slice(0, 8)}...
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-heading font-bold text-white mt-1 flex items-center gap-2">
                <Target size={20} className="text-sky-400" />
                <span>Target Occupation: {plan.role_title}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Personalized sequential learning roadmap ordered by prerequisite chains, BKT skill deficits, and role requirement weights.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => loadLearningPlan(true)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#070d18] px-3 py-1.5 font-mono text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition cursor-pointer"
              >
                <RefreshCw size={13} className={loading ? "animate-spin text-sky-400" : "text-sky-400"} />
                <span>Regenerate Roadmap</span>
              </button>
            </div>
          </div>

          {/* Metric Badges Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#1e293b]">
            <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d18]/70">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Remediation Progress</span>
                <TrendingUp size={14} className="text-sky-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-2xl font-extrabold text-white">
                  {plan.overall_progress_pct}%
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ({plan.completed_modules_count}/{plan.total_modules_count})
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d18]/70">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Estimated Time Left</span>
                <Clock size={14} className="text-amber-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-2xl font-extrabold text-amber-300">
                  {plan.estimated_hours_remaining}
                </span>
                <span className="text-[10px] font-mono text-slate-500">hrs</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d18]/70">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Remaining Critical Gaps</span>
                <AlertTriangle size={14} className="text-rose-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-2xl font-extrabold text-rose-400">
                  {plan.critical_gaps_count}
                </span>
                <span className="text-[10px] font-mono text-slate-500">gaps</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d18]/70">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Engine Convergence</span>
                <Sparkles size={14} className="text-emerald-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {plan.status === "COMPLETED" ? "Certified Ready" : "Adaptive Loop Active"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main View: Interactive Practice vs Remedial Modules Roadmap */}
      {isPracticing && practiceData ? (
        /* ======================================================================
            INTERACTIVE PRACTICE & REASSESSMENT WORKSPACE
        ====================================================================== */
        <div className="p-6 rounded-2xl border border-sky-500/30 bg-[#0b1528] shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1e293b] gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-[11px] font-bold">
                  {practiceData.difficulty_level} Practice Drill
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Current Mastery: {Math.round(practiceData.current_mastery * 100)}% → Target: {Math.round(practiceData.target_mastery * 100)}%
                </span>
              </div>
              <h3 className="text-lg font-heading font-bold text-white mt-1">
                Skill Drill: {practiceData.competency_name}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsPracticing(false);
                setPracticeResult(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e293b] bg-[#070d18] text-slate-300 text-xs font-mono hover:text-white cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Back to Roadmap</span>
            </button>
          </div>

          {/* If Result Available, Display Before/After Convergence Deltas */}
          {practiceResult ? (
            <div className="space-y-6">
              <div
                className={`p-5 rounded-xl border ${
                  practiceResult.result === "MASTERED"
                    ? "border-emerald-500/40 bg-emerald-950/30"
                    : practiceResult.result === "GAP_REDUCED"
                    ? "border-sky-500/40 bg-sky-950/30"
                    : "border-amber-500/40 bg-amber-950/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {practiceResult.result === "MASTERED" ? (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                        <Award size={24} />
                      </div>
                    ) : practiceResult.result === "GAP_REDUCED" ? (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                        <TrendingUp size={24} />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                        <AlertTriangle size={24} />
                      </div>
                    )}

                    <div>
                      <h4 className="font-heading text-base font-bold text-white">
                        {practiceResult.result === "MASTERED"
                          ? "🎉 Competency Mastered!"
                          : practiceResult.result === "GAP_REDUCED"
                          ? "📈 Progress Confirmed: Skill Gap Reduced"
                          : "⚠️ Adaptive Intervention Triggered"}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {practiceResult.adaptation_reason ||
                          "BKT Bayesian parameters updated based on empirical response evidence."}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
                    Accuracy: {Math.round(practiceResult.accuracy * 100)}% ({practiceResult.correct_count}/{practiceResult.questions_count})
                  </span>
                </div>

                {/* Quantitative Before vs After Deltas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
                  <div className="bg-slate-950/40 p-3 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Previous Mastery</span>
                    <p className="font-mono text-lg font-bold text-slate-300 mt-0.5">
                      {Math.round(practiceResult.prior_mastery * 100)}%
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">New BKT Mastery</span>
                    <p className="font-mono text-lg font-bold text-sky-400 mt-0.5 flex items-center gap-1">
                      <span>{Math.round(practiceResult.posterior_mastery * 100)}%</span>
                      <span className={`text-xs ${practiceResult.gap_delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ({practiceResult.gap_delta >= 0 ? "+" : ""}
                        {Math.round((practiceResult.posterior_mastery - practiceResult.prior_mastery) * 100)}%)
                      </span>
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Remaining Deficit</span>
                    <p className="font-mono text-lg font-bold text-amber-300 mt-0.5">
                      {Math.round(practiceResult.posterior_gap * 100)}%
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Target Threshold</span>
                    <p className="font-mono text-lg font-bold text-white mt-0.5">
                      {Math.round(practiceResult.target_mastery * 100)}%
                    </p>
                  </div>
                </div>

                {/* Adaptive Action Guidance */}
                {practiceResult.adaptation_action !== "NONE" && (
                  <div className="mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-950/40 text-xs text-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-amber-400" />
                      <span>
                        Recommended Next Action: <strong>{practiceResult.adaptation_action.replace(/_/g, " ")}</strong>
                        {practiceResult.next_difficulty && ` (Difficulty: ${practiceResult.next_difficulty})`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Question Feedback Breakdown */}
              <div className="space-y-3">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-300">
                  Detailed Question Analysis & Pedagogical Feedback:
                </h4>
                {practiceResult.feedback.map((fb, idx) => (
                  <div
                    key={fb.question_id}
                    className={`p-4 rounded-xl border text-xs ${
                      fb.is_correct
                        ? "border-emerald-500/20 bg-emerald-950/20"
                        : "border-rose-500/20 bg-rose-950/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-200">
                        {idx + 1}. {fb.question_text}
                      </p>
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                          fb.is_correct
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {fb.is_correct ? "Correct" : "Incorrect"}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-slate-950/40">
                        <span className="text-slate-500">Your Answer: </span>
                        <span className={fb.is_correct ? "text-emerald-300 font-semibold" : "text-rose-300 line-through"}>
                          {fb.selected_answer}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/40">
                        <span className="text-slate-500">Correct Standard: </span>
                        <span className="text-emerald-300 font-semibold">{fb.correct_answer}</span>
                      </div>
                    </div>

                    {fb.explanation && (
                      <p className="mt-2 text-slate-400 text-[11px] leading-relaxed border-t border-white/5 pt-2">
                        💡 <em>{fb.explanation}</em>
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => handleStartPractice(activeModule)}
                  className="px-4 py-2 rounded-lg border border-[#1e293b] bg-[#070d18] text-slate-200 text-xs font-semibold hover:border-slate-700 hover:text-white transition cursor-pointer"
                >
                  Repeat Practice Drill
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPracticing(false);
                    setPracticeResult(null);
                    loadLearningPlan();
                  }}
                  className="px-4 py-2 rounded-lg bg-sky-400 text-slate-950 text-xs font-bold hover:bg-sky-300 transition glow-cyan cursor-pointer"
                >
                  Return to Roadmap
                </button>
              </div>
            </div>
          ) : (
            /* Active Practice Form: Step through questions */
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>
                  Question {currentQuestionIndex + 1} of {practiceData.questions.length}
                </span>
                <span>Difficulty: {practiceData.difficulty_level}</span>
              </div>

              {/* Question Item */}
              {(() => {
                const q = practiceData.questions[currentQuestionIndex];
                if (!q) return null;
                return (
                  <div className="space-y-4">
                    <p className="text-sm sm:text-base font-heading font-medium text-white leading-relaxed">
                      {q.question_text}
                    </p>

                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = selectedAnswers[q.id] === opt;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt }))
                            }
                            className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? "border-sky-400 bg-sky-950/40 text-white font-semibold"
                                : "border-[#1e293b] bg-[#070d18] text-slate-300 hover:border-slate-700 hover:text-white"
                            }`}
                          >
                            <span>{opt}</span>
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? "border-sky-400 bg-sky-400 text-slate-950"
                                  : "border-slate-600"
                              }`}
                            >
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Navigation & Submit Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1e293b]">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3.5 py-2 rounded-lg border border-[#1e293b] bg-[#070d18] text-xs font-mono text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  Previous Question
                </button>

                {currentQuestionIndex < practiceData.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentQuestionIndex((prev) =>
                        Math.min(practiceData.questions.length - 1, prev + 1)
                      )
                    }
                    className="px-4 py-2 rounded-lg bg-sky-500 text-slate-950 text-xs font-bold hover:bg-sky-400 transition cursor-pointer"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmittingPractice}
                    onClick={handleSubmitPractice}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-400 text-slate-950 text-xs font-bold hover:bg-sky-300 transition glow-cyan disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingPractice ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-slate-950" />
                        <span>Updating BKT State...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Submit &amp; Evaluate Mastery</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ======================================================================
            ORDERED REMEDIAL ROADMAP MODULE CARDS
        ====================================================================== */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold tracking-tight text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-sky-400" />
              <span>Remediation Roadmap Modules (Topological Order):</span>
            </h3>
            <span className="font-mono text-xs text-slate-400">
              {plan?.modules?.length || 0} Total Modules
            </span>
          </div>

          <div className="space-y-3">
            {plan?.modules?.map((module, idx) => {
              const isExpanded = expandedModuleId === module.id;
              const isMastered = module.status === "MASTERED";
              const isCurrent = module.status === "IN_PROGRESS";
              const isAdapting = module.status === "NEEDS_ADAPTATION";

              return (
                <div
                  key={module.id}
                  className={`rounded-2xl border transition-all ${
                    isMastered
                      ? "border-emerald-500/30 bg-[#0b1528]/80"
                      : isAdapting
                      ? "border-amber-500/40 bg-[#0b1528]"
                      : isCurrent
                      ? "border-sky-400/50 bg-[#0b1528] shadow-md shadow-sky-500/5"
                      : "border-[#1e293b] bg-[#0b1528]"
                  }`}
                >
                  <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                          isMastered
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : isCurrent
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : "bg-slate-800/60 text-slate-400 border border-slate-700"
                        }`}
                      >
                        #{module.sequence_order}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-heading text-sm font-bold text-white">
                            {module.competency_name}
                          </h4>
                          <span className="font-mono text-[11px] text-slate-400">
                            ({module.competency_code})
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                              isMastered
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : isAdapting
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : isCurrent
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {module.status.replace(/_/g, " ")}
                          </span>

                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 border border-[#1e293b] text-slate-300">
                            {module.difficulty_level}
                          </span>
                        </div>

                        {/* Mastery & Gap Details */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
                          <span>
                            Mastery:{" "}
                            <strong className="text-white">
                              {Math.round(module.current_mastery * 100)}%
                            </strong>{" "}
                            → Target:{" "}
                            <strong className="text-sky-400">
                              {Math.round(module.target_mastery * 100)}%
                            </strong>
                          </span>
                          <span>·</span>
                          <span>
                            Active Deficit:{" "}
                            <strong
                              className={
                                module.gap > 0.25 ? "text-rose-400" : "text-amber-300"
                              }
                            >
                              {Math.round(module.gap * 100)}%
                            </strong>
                          </span>
                          <span>·</span>
                          <span>
                            Estimated: <strong>{module.estimated_hours}h</strong>
                          </span>
                        </div>

                        {/* Prerequisite Tags */}
                        {module.prerequisite_names && module.prerequisite_names.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                            <span className="text-slate-500">Prerequisites:</span>
                            {module.prerequisite_names.map((pName, pIdx) => (
                              <span
                                key={pIdx}
                                className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-[#1e293b] font-mono text-[10px]"
                              >
                                {pName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Module Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedModuleId(isExpanded ? null : module.id)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e293b] bg-[#070d18] text-slate-300 text-xs font-mono hover:border-slate-700 hover:text-white transition cursor-pointer"
                      >
                        <BookOpen size={13} className="text-sky-400" />
                        <span>Curated Resources ({module.resources?.length || 0})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartPractice(module)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isMastered
                            ? "bg-[#070d18] border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
                            : "bg-sky-400 text-slate-950 hover:bg-sky-300 glow-cyan"
                        }`}
                      >
                        <Play size={12} fill="currentColor" />
                        <span>{isMastered ? "Re-Test Mastery" : "Practice & Reassess"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Curated Resources Accordion */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 border-t border-[#1e293b] bg-[#070d18]/50 rounded-b-2xl space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-heading font-semibold uppercase tracking-wider text-slate-300">
                          Recommended Study Materials:
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Studying resources prepares for diagnostic reassessment
                        </span>
                      </div>

                      {module.resources && module.resources.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {module.resources.map((res) => (
                            <div
                              key={res.id}
                              className="p-3.5 rounded-xl border border-[#1e293b] bg-[#0b1528] flex flex-col justify-between gap-3 text-xs"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[10px] uppercase font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                                    {res.resource_type}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-400">
                                    ~{res.estimated_hours}h
                                  </span>
                                </div>
                                <h5 className="font-semibold text-white mt-1.5 leading-snug">
                                  {res.title}
                                </h5>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Provider: {res.provider} · Difficulty: {res.difficulty}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]">
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-mono text-[11px]"
                                >
                                  <span>Open Resource</span>
                                  <ExternalLink size={11} />
                                </a>

                                <button
                                  type="button"
                                  disabled={loggingActivity}
                                  onClick={() => handleLogResourceActivity(res, module)}
                                  className="px-2.5 py-1 rounded bg-[#070d18] border border-slate-700 text-slate-300 hover:text-white font-mono text-[10px] cursor-pointer"
                                >
                                  Mark Completed
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-mono py-2">
                          Standard practice problems available via the Practice drill above.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
