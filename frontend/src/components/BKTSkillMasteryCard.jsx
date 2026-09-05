import React, { useState, useEffect, useCallback } from "react";
import {
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Award,
  Layers,
  HelpCircle,
  PlayCircle,
  X,
  Loader2,
} from "lucide-react";

import { learnersApi } from "../api/learners";
import { assessmentsApi } from "../api/assessments";
import { getErrorMessage } from "../api/client";
import SectionHeader from "./SectionHeader";
import StatusBadge from "./StatusBadge";

const BENCHMARK_ROLES = [
  "Python Developer Intern",
  "Full Stack Web Developer",
  "Data Analyst Intern",
  "Software Engineer Trainee",
];

export default function BKTSkillMasteryCard({ learnerId, learnerName }) {
  const [selectedRole, setSelectedRole] = useState("Python Developer Intern");
  const [skillsData, setSkillsData] = useState([]);
  const [gapsData, setGapsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assessment taking modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assessmentsList, setAssessmentsList] = useState([]);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [answersMap, setAnswersMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  const fetchBktData = useCallback(async () => {
    if (!learnerId) return;
    try {
      setLoading(true);
      setError(null);

      const [skillsRes, gapsRes] = await Promise.all([
        learnersApi.getSkills(learnerId),
        learnersApi.getSkillGaps(learnerId, selectedRole),
      ]);

      setSkillsData(skillsRes?.skills || []);
      setGapsData(gapsRes || null);
    } catch (err) {
      console.error("Failed to load BKT data:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [learnerId, selectedRole]);

  useEffect(() => {
    fetchBktData();
  }, [fetchBktData]);

  // Handle opening assessment modal
  const handleOpenAssessment = async () => {
    try {
      setIsModalOpen(true);
      setSubmissionResult(null);
      setAnswersMap({});
      const list = await assessmentsApi.list();
      setAssessmentsList(list);
      if (list.length > 0) {
        const detail = await assessmentsApi.getById(list[0].id);
        setActiveAssessment(detail);
      }
    } catch (err) {
      console.error("Failed to load assessment questions:", err);
    }
  };

  const handleSelectOption = (questionId, option) => {
    setAnswersMap((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmitAssessment = async () => {
    if (!activeAssessment || !learnerId) return;
    try {
      setSubmitting(true);
      const answers = Object.entries(answersMap).map(([qId, ans]) => ({
        question_id: qId,
        selected_answer: ans,
      }));

      if (answers.length === 0) {
        alert("Please answer at least one question before submitting.");
        setSubmitting(false);
        return;
      }

      const res = await assessmentsApi.submit(activeAssessment.id, {
        learner_id: learnerId,
        answers,
      });

      setSubmissionResult(res);
      // Refresh current BKT state
      await fetchBktData();
    } catch (err) {
      alert("Submission failed: " + getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "mastered":
        return {
          bar: "bg-emerald-500",
          text: "text-emerald-400",
          badge: "success",
        };
      case "proficient":
        return {
          bar: "bg-sky-500",
          text: "text-sky-400",
          badge: "info",
        };
      case "developing":
        return {
          bar: "bg-amber-500",
          text: "text-amber-400",
          badge: "warning",
        };
      default:
        return {
          bar: "bg-rose-500",
          text: "text-rose-400",
          badge: "danger",
        };
    }
  };

  const getPriorityBadgeVariant = (priority) => {
    if (priority === "high") return "danger";
    if (priority === "medium") return "warning";
    return "neutral";
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-[#0b1528] p-5 sm:p-7 shadow-sm transition-all">
      {/* Background Decorative Accent */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-500/5 blur-3xl" />

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
              <Brain size={16} />
            </div>
            <h3 className="font-heading text-base font-bold tracking-tight text-white">
              Bayesian Knowledge Tracing (BKT) Skill Mastery
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-950/60 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-300">
              <Sparkles size={11} className="text-sky-400" />
              P(L_t) Latent Probability Model
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400 max-w-2xl leading-relaxed">
            Estimates the true mathematical probability that{" "}
            <strong className="text-slate-200">{learnerName || "this learner"}</strong> has
            mastered individual competencies conditioned on assessment response sequences, rather
            than a simple raw test percentage.
          </p>
        </div>

        {/* Role Selector & Take Assessment Button */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#070d18] px-2 py-1">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
              Role:
            </span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-transparent font-mono text-xs font-semibold text-sky-400 outline-none cursor-pointer"
            >
              {BENCHMARK_ROLES.map((r) => (
                <option key={r} value={r} className="bg-[#0b1528] text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleOpenAssessment}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 font-mono text-xs font-semibold text-white shadow-xs hover:bg-sky-500 transition cursor-pointer"
          >
            <PlayCircle size={14} />
            Diagnostic Quiz
          </button>
        </div>
      </div>

      {/* Main Grid: Skills Mastery Bars vs Target Role Gaps */}
      {loading ? (
        <div className="flex h-48 items-center justify-center font-mono text-xs text-slate-400">
          <Loader2 size={18} className="animate-spin text-sky-400 mr-2" />
          Calculating Bayesian knowledge states...
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
          {error}
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Column 1: Skill Mastery Breakdown (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <span className="font-heading text-xs font-bold uppercase tracking-wider text-slate-400">
                Skill Mastery (Estimated Latent Probability)
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                NCVET Verified Standard
              </span>
            </div>

            <div className="space-y-3.5">
              {skillsData.map((item) => {
                const colors = getStatusColor(item.status);
                const pct = Math.round(item.mastery_probability * 100);

                return (
                  <div
                    key={item.skill_id || item.skill}
                    className="rounded-lg border border-[#1e293b] bg-[#070d18] p-3 transition hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-white">
                          {item.skill}
                        </span>
                        <StatusBadge variant={colors.badge} size="sm">
                          {item.status}
                        </StatusBadge>
                      </div>

                      <div className="flex items-baseline gap-1.5 font-mono">
                        <span className={`text-sm font-extrabold tabular-nums ${colors.text}`}>
                          {pct}%
                        </span>
                        <span className="text-[10px] text-slate-500">
                          (P: {item.mastery_probability.toFixed(2)})
                        </span>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#0b1528] border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-slate-500">
                      <span>{item.questions_attempted} questions attempted</span>
                      <span>
                        {item.correct_answers} correct · {item.incorrect_answers} incorrect
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Skill Gaps against Benchmark Role (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#070d18] p-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <div>
                  <span className="font-heading text-xs font-bold text-white">
                    Skill Gaps for {gapsData?.role || selectedRole}
                  </span>
                  <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                    Deficit: Required Mastery − Learner Mastery
                  </p>
                </div>
                {gapsData?.overall_alignment !== undefined && (
                  <span className="font-mono text-xs font-bold text-sky-400">
                    {Math.round(gapsData.overall_alignment * 100)}% Fit
                  </span>
                )}
              </div>

              {/* Gaps List */}
              <div className="mt-3 space-y-2.5">
                {(!gapsData?.skill_gaps || gapsData.skill_gaps.length === 0) ? (
                  <div className="py-6 text-center text-xs font-mono text-emerald-400">
                    <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-400" />
                    All competency benchmarks achieved for this role!
                  </div>
                ) : (
                  gapsData.skill_gaps.map((gap, idx) => (
                    <div
                      key={gap.skill}
                      className="flex items-center justify-between rounded-lg border border-[#1e293b] bg-[#0b1528] p-2.5 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-slate-400">
                            {idx + 1}.
                          </span>
                          <span className="font-heading font-semibold text-slate-200 truncate">
                            {gap.skill}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-slate-500">
                          <span>
                            Has:{" "}
                            <strong className="text-slate-300">
                              {Math.round(gap.current_mastery * 100)}%
                            </strong>
                          </span>
                          <span>·</span>
                          <span>
                            Needs:{" "}
                            <strong className="text-slate-300">
                              {Math.round(gap.required_mastery * 100)}%
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <StatusBadge
                          variant={getPriorityBadgeVariant(gap.priority)}
                          size="sm"
                        >
                          {gap.priority.toUpperCase()} GAP (+{Math.round(gap.gap * 100)}%)
                        </StatusBadge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Model Architecture Footer Note */}
            <div className="mt-4 border-t border-[#1e293b] pt-2.5 font-mono text-[10px] text-slate-500 flex items-center justify-between">
              <span>BKT: P(L0)=0.30, P(T)=0.10</span>
              <span className="text-sky-400">XGBoost ML-Ready</span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          DIAGNOSTIC TEST MODAL (Interactive Assessment Flow)
      ====================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl border border-sky-500/30 bg-[#070d18] p-6 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div>
                <h4 className="font-heading text-base font-bold text-white">
                  {activeAssessment?.title || "Diagnostic Knowledge Tracing Quiz"}
                </h4>
                <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                  Candidate: {learnerName || learnerId} · Real-Time BKT Update
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {submissionResult ? (
                /* Results Screen */
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-1" />
                    <h5 className="font-heading text-base font-bold text-white">
                      Assessment Evaluated via Bayesian Knowledge Tracing!
                    </h5>
                    <p className="font-mono text-xs text-slate-300 mt-1">
                      Test Score:{" "}
                      <strong className="text-emerald-300 font-bold">
                        {submissionResult.score_percentage}%
                      </strong>{" "}
                      ({submissionResult.correct_count} / {submissionResult.total_questions} correct)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-slate-400 uppercase">
                      Skill Mastery Transitions (Before → After BKT Update):
                    </span>
                    {submissionResult.results.map((r, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-3 text-xs ${
                          r.is_correct
                            ? "border-emerald-500/30 bg-emerald-950/20"
                            : "border-rose-500/30 bg-rose-950/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-heading font-bold text-white">
                            {r.skill_name}
                          </span>
                          <span
                            className={`font-mono text-[11px] font-bold ${
                              r.is_correct ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {r.is_correct ? "✓ Correct" : "✗ Incorrect"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-400">
                            Mastery:{" "}
                            <span className="text-slate-300">
                              {(r.previous_mastery * 100).toFixed(0)}%
                            </span>{" "}
                            →{" "}
                            <span
                              className={`font-bold ${
                                r.new_mastery >= r.previous_mastery
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {(r.new_mastery * 100).toFixed(0)}%
                            </span>{" "}
                            ({r.mastery_status})
                          </span>
                        </div>
                        {r.explanation && (
                          <p className="mt-1 text-[11px] text-slate-400 font-sans">
                            {r.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeAssessment ? (
                /* Question Items */
                activeAssessment.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-[#1e293b] bg-[#0b1528] p-4 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-sky-950 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-400 border border-sky-800/40">
                        {q.skill_name} · {q.difficulty}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Q{idx + 1} of {activeAssessment.questions.length}
                      </span>
                    </div>

                    <p className="font-medium text-slate-100 text-sm leading-snug">
                      {q.question_text}
                    </p>

                    {/* Options */}
                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt) => {
                        const isSelected = answersMap[q.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt)}
                            className={`w-full text-left rounded-lg p-2.5 font-mono text-xs transition border cursor-pointer ${
                              isSelected
                                ? "border-sky-500 bg-sky-950/60 text-white font-semibold"
                                : "border-[#1e293b] bg-[#070d18] text-slate-300 hover:border-slate-600 hover:text-white"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 font-mono text-xs text-slate-500">
                  Loading assessment questions...
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#1e293b] pt-3 flex items-center justify-between">
              {submissionResult ? (
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionResult(null);
                    setAnswersMap({});
                  }}
                  className="rounded-lg border border-[#1e293b] bg-[#0b1528] px-3 py-1.5 font-mono text-xs text-slate-300 hover:bg-[#0f1c33] cursor-pointer"
                >
                  Retake Assessment
                </button>
              ) : (
                <span className="font-mono text-xs text-slate-400">
                  Answered {Object.keys(answersMap).length} /{" "}
                  {activeAssessment?.questions?.length || 0}
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-3 py-1.5 font-mono text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                {!submissionResult && (
                  <button
                    type="button"
                    disabled={submitting || Object.keys(answersMap).length === 0}
                    onClick={handleSubmitAssessment}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 font-mono text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition cursor-pointer"
                  >
                    {submitting && <Loader2 size={13} className="animate-spin" />}
                    Submit Answers
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
