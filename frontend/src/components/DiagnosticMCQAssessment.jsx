import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Flag,
  RotateCcw,
  Sparkles,
  BarChart3,
  Check,
  X,
  Compass,
  Loader2,
} from "lucide-react";
import { assessmentsApi } from "../api/assessments";
import { getDomainQuestions, simulateBKTUpdate, ASSESSMENT_DOMAINS } from "../data/assessmentQuestionBank";
import { saveLearnerAssessmentResults } from "../utils/skillGapEvaluator";

export default function DiagnosticMCQAssessment({
  learnerInfo = null,
  targetDomain = "fullstack",
  onCompleted = null,
}) {
  const navigate = useNavigate();

  // Active Learner State
  const activeLearner = useMemo(() => {
    if (learnerInfo) return learnerInfo;
    try {
      const stored = JSON.parse(localStorage.getItem("kn_current_learner") || "{}");
      if (stored.full_name) return stored;
    } catch {
      // Ignore parse errors
    }
    try {
      const u = JSON.parse(localStorage.getItem("kn_user") || "{}");
      if (u.full_name) {
        return {
          id: u.id || "KN-2026-LEARNER",
          full_name: u.full_name,
          email: u.email,
        };
      }
    } catch {
      // Ignore parse errors
    }
    return {
      id: "KN-2026-DEMO",
      full_name: "Candidate Learner",
      email: "learner@kaushalnexus.gov.in",
    };
  }, [learnerInfo]);

  // Selected Domain
  const [selectedDomain, setSelectedDomain] = useState(
    activeLearner.target_domain || targetDomain || "fullstack"
  );

  // Questions and Test State
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);

  // Timer State (default 15 minutes = 900 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState(900);
  const [timerActive, setTimerActive] = useState(true);

  // Load questions for domain
  useEffect(() => {
    let isMounted = true;
    async function loadTest() {
      setLoading(true);
      try {
        // Attempt to fetch from API
        const roleId = `role-${selectedDomain}`;
        const generated = await assessmentsApi.generateForRole(roleId);
        if (isMounted && generated && generated.questions && generated.questions.length > 0) {
          setQuestions(generated.questions);
        } else {
          const fallback = getDomainQuestions(selectedDomain, 10);
          if (isMounted) setQuestions(fallback);
        }
      } catch {
        const fallback = getDomainQuestions(selectedDomain, 10);
        if (isMounted) setQuestions(fallback);
      } finally {
        if (isMounted) {
          setLoading(false);
          setSecondsRemaining(900);
          setAnswers({});
          setFlagged({});
          setCurrentIndex(0);
          setSubmissionResult(null);
        }
      }
    }
    loadTest();
    return () => {
      isMounted = false;
    };
  }, [selectedDomain]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  };

  const handleSelectOption = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const toggleFlag = (questionId) => {
    setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const currentQ = questions[currentIndex];

  const answeredCount = useMemo(() => {
    return Object.keys(answers).length;
  }, [answers]);

  const flaggedCount = useMemo(() => {
    return Object.values(flagged).filter(Boolean).length;
  }, [flagged]);

  const progressPercent = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round((answeredCount / questions.length) * 100);
  }, [answeredCount, questions.length]);

  // Submit test
  const handleSubmitTest = useCallback(async () => {
    try {
      setSubmitting(true);
      setShowConfirmModal(false);
      setTimerActive(false);

      const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        question_id: qId,
        selected_answer: ans,
      }));

      const assessId = `assess-${selectedDomain}-diagnostic`;
      const result = await assessmentsApi.submit(assessId, {
        learner_id: activeLearner.id,
        learner_info: activeLearner,
        answers: formattedAnswers,
      });

      // Augment result with question review data
      const evaluatedQuestions = questions.map((q) => ({
        ...q,
        userAnswer: answers[q.id] || null,
        isCorrect: answers[q.id] === q.correct_answer,
      }));

      const completeResult = {
        ...result,
        questionsWithAnswers: evaluatedQuestions,
        domainInfo: ASSESSMENT_DOMAINS.find((d) => d.id === selectedDomain) || ASSESSMENT_DOMAINS[0],
      };

      setSubmissionResult(completeResult);
      if (onCompleted) onCompleted(completeResult);
    } catch (err) {
      console.error("Submission error:", err);
      // Fallback evaluation in case of unexpected error
      const fallbackResult = simulateBKTUpdate(questions, answers);
      const enrichedFallback = saveLearnerAssessmentResults(fallbackResult, assessId, activeLearner);
      const completeResult = {
        ...enrichedFallback,
        questionsWithAnswers: questions.map((q) => ({
          ...q,
          userAnswer: answers[q.id] || null,
          isCorrect: answers[q.id] === q.correct_answer,
        })),
        domainInfo: ASSESSMENT_DOMAINS.find((d) => d.id === selectedDomain) || ASSESSMENT_DOMAINS[0],
      };
      setSubmissionResult(completeResult);
      if (onCompleted) onCompleted(completeResult);
    } finally {
      setSubmitting(false);
    }
  }, [activeLearner.id, answers, onCompleted, questions, selectedDomain]);

  const handleAutoSubmit = useCallback(() => {
    handleSubmitTest();
  }, [handleSubmitTest]);

  // Countdown timer effect
  useEffect(() => {
    if (!timerActive || submissionResult || loading) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, submissionResult, loading, handleAutoSubmit]);

  const domainObj = useMemo(() => {
    return ASSESSMENT_DOMAINS.find((d) => d.id === selectedDomain) || ASSESSMENT_DOMAINS[0];
  }, [selectedDomain]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
          <BrainCircuit size={28} className="animate-pulse" />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-sky-500" />
          </span>
        </div>
        <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
          Assembling NSQF Diagnostic Assessment...
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Calibrating item difficulties and mapping competency matrices for {domainObj.title}.
        </p>
      </div>
    );
  }

  // =========================================================================
  // VIEW: SCORECARD / RESULT VIEW (AFTER SUBMISSION)
  // =========================================================================
  if (submissionResult) {
    const isPassed = submissionResult.passed;
    const score = submissionResult.score_percentage || 0;
    const readiness = submissionResult.readiness_score || 75;

    return (
      <div className="space-y-6">
        {/* Banner Card */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 ${
            isPassed
              ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 text-slate-900 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-slate-900 dark:to-sky-950/30 dark:text-white"
              : "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-50 text-slate-900 dark:border-amber-900/60 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 dark:text-white"
          }`}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-100/80 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                <Sparkles size={13} />
                <span>Diagnostic Baseline Certified</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Assessment Completed!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Candidate <strong className="text-slate-900 dark:text-white">{activeLearner.full_name}</strong> has
                completed the baseline technical assessment for{" "}
                <strong className="text-sky-600 dark:text-sky-400">{domainObj.title}</strong>.
                Bayesian Knowledge Tracing (BKT) has updated your latent competency vector.
              </p>
            </div>

            {/* Score Badges */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-center shadow-xs dark:border-slate-800 dark:bg-slate-800/80 min-w-[120px]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  MCQ Score
                </span>
                <div className="mt-1 text-3xl font-extrabold text-sky-600 dark:text-sky-400">
                  {score}%
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  {submissionResult.correct_answers} / {submissionResult.total_questions} Correct
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-center shadow-xs dark:border-slate-800 dark:bg-slate-800/80 min-w-[130px]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Readiness Score
                </span>
                <div className="mt-1 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {readiness}
                  <span className="text-sm font-normal text-slate-400">/100</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {readiness >= 80 ? "Tier 1: Job Ready" : readiness >= 65 ? "Tier 2: Near Ready" : "Tier 3: In Training"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BKT Knowledge State Breakdown Grid */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bayesian Knowledge Tracing (BKT) Competency Updates
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Latent probability of mastery updated from prior state $P(L_0)$ to posterior state $P(L_t)$.
              </p>
            </div>
            <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-mono font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              Corbett &amp; Anderson BKT Engine
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {submissionResult.updated_masteries?.map((m, idx) => {
              const postPct = Math.round(m.posterior_mastery * 100);
              const isMastered = m.is_mastered;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {m.competency_code || "NOS-STD"}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {m.skill_name}
                      </h4>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isMastered
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : postPct >= 55
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
                      }`}
                    >
                      {m.status || (isMastered ? "Mastered" : "Developing")}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-500">Mastery Probability:</span>
                      <span className="font-mono text-slate-900 dark:text-white">{postPct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isMastered
                            ? "bg-emerald-500"
                            : postPct >= 55
                            ? "bg-sky-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${postPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Questions: {m.questions_correct} / {m.questions_answered}</span>
                    <span>P(T) = 0.15</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Question Review (Accordion) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setReviewExpanded(!reviewExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Detailed MCQ Answers &amp; Explanations ({submissionResult.questionsWithAnswers?.length || 0} Questions)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Inspect correct options, pedagogical rationale, and your chosen answers.
              </p>
            </div>
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
              {reviewExpanded ? "Hide Review ▲" : "Review All Answers ▼"}
            </span>
          </button>

          {reviewExpanded && (
            <div className="mt-6 space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
              {submissionResult.questionsWithAnswers?.map((item, idx) => {
                const isCorrect = item.isCorrect;
                return (
                  <div key={idx} className="pt-4 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                            isCorrect ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        >
                          {isCorrect ? <Check size={13} /> : <X size={13} />}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Q{idx + 1}. {item.question_text}
                        </span>
                      </div>
                      <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.difficulty}
                      </span>
                    </div>

                    {/* Answers Comparison */}
                    <div className="mt-2.5 ml-8 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                      <div
                        className={`rounded-lg border p-2.5 ${
                          isCorrect
                            ? "border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : "border-rose-200 bg-rose-50/60 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                        }`}
                      >
                        <span className="font-bold">Your Selection: </span>
                        <span>{item.userAnswer || "No answer submitted"}</span>
                      </div>

                      {!isCorrect && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                          <span className="font-bold">Correct Answer: </span>
                          <span>{item.correct_answer}</span>
                        </div>
                      )}
                    </div>

                    {/* Explanation */}
                    {item.explanation && (
                      <div className="mt-2 ml-8 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Rationale:{" "}
                        </span>
                        {item.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              setSubmissionResult(null);
              setSecondsRemaining(900);
              setAnswers({});
              setFlagged({});
              setCurrentIndex(0);
              setTimerActive(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw size={14} />
            <span>Retake Assessment</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/skill-gap")}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 cursor-pointer"
            >
              <BarChart3 size={14} />
              <span>View Skill-Gap Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/learner?tab=remediation")}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300"
            >
              <Compass size={14} />
              <span>View Remedial Learning Plan</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/learner")}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500"
            >
              <span>Go to Learner 360° Dossier</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: ACTIVE TEST TAKING INTERFACE
  // =========================================================================
  return (
    <div className="space-y-5">
      {/* Top Test Header with Domain Selector, Candidate Badge, and Live Timer */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <BrainCircuit size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  NSQF Diagnostic Assessment: {domainObj.title}
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span>Standard: {domainObj.code}</span>
                  <span>•</span>
                  <span>{domainObj.nsqfLevel}</span>
                  <span>•</span>
                  <span>Candidate: {activeLearner.full_name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls: Domain Switcher & Timer */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Domain Switcher */}
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {ASSESSMENT_DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>

            {/* Countdown Timer */}
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-xs font-bold ${
                secondsRemaining <= 180
                  ? "border border-rose-200 bg-rose-50 text-rose-700 animate-pulse dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
                  : "border border-slate-200 bg-slate-100/80 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              <Clock size={14} className={secondsRemaining <= 180 ? "text-rose-600" : "text-sky-600 dark:text-sky-400"} />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-[11px] font-semibold text-slate-500">
            <span>
              Question <strong className="text-slate-900 dark:text-white">{currentIndex + 1}</strong> of{" "}
              {questions.length}
            </span>
            <span>
              {answeredCount} Answered ({progressPercent}%) • {flaggedCount} Flagged
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-sky-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Taking Area with Main Question Card & Sidebar Palette */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Question Card */}
        <div className="lg:col-span-9 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between min-h-[440px]">
          {currentQ ? (
            <div>
              {/* Question Metadata Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    {currentQ.skill_name || "Technical Competency"}
                  </span>
                  {currentQ.competency_code && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {currentQ.competency_code}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-mono font-semibold uppercase ${
                      currentQ.difficulty === "HARD"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : currentQ.difficulty === "MEDIUM"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {currentQ.difficulty || "MEDIUM"}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleFlag(currentQ.id)}
                    className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                      flagged[currentQ.id]
                        ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        : "border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Flag size={12} className={flagged[currentQ.id] ? "fill-amber-500 text-amber-500" : ""} />
                    <span>{flagged[currentQ.id] ? "Flagged" : "Flag"}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="mt-5">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                  Q{currentIndex + 1}. {currentQ.question_text}
                </h3>
              </div>

              {/* Multiple Choice Options */}
              <div className="mt-6 space-y-3">
                {currentQ.options?.map((opt, oIdx) => {
                  const isSelected = answers[currentQ.id] === opt;
                  const optionLetter = String.fromCharCode(65 + oIdx);

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, opt)}
                      className={`group flex w-full items-center gap-3.5 rounded-xl border p-4 text-left text-xs font-medium transition-all ${
                        isSelected
                          ? "border-sky-500 bg-sky-50/80 text-sky-950 shadow-xs ring-1 ring-sky-500/20 dark:bg-sky-950/40 dark:text-sky-100"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-sky-500 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {optionLetter}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No questions found for this domain.
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={14} />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2.5">
              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <span>Next Question</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500"
                >
                  <span>Finish &amp; Submit</span>
                  <CheckCircle2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Question Palette */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Question Palette
            </h4>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Click any question to navigate directly.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isFlagged = flagged[q.id];
              const isCurrent = idx === currentIndex;

              let btnClass = "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
              if (isAnswered) {
                btnClass = "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-950 dark:text-emerald-300";
              }
              if (isFlagged) {
                btnClass = "border-amber-500 bg-amber-50 text-amber-700 font-bold dark:bg-amber-950 dark:text-amber-300";
              }
              if (isCurrent) {
                btnClass += " ring-2 ring-sky-500 ring-offset-1 dark:ring-offset-slate-900";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold transition ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Palette Legend */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-400">Flagged ({flaggedCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-slate-600 dark:text-slate-400">
                Unanswered ({questions.length - answeredCount})
              </span>
            </div>
          </div>

          {/* Submit Test CTA */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="w-full rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-sky-500"
            >
              Submit Assessment ({answeredCount}/{questions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                <BrainCircuit size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Confirm Assessment Submission
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ready to calculate your initial BKT Skill Mastery?
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-bold">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Questions Attempted:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Unattempted Questions:</span>
                <span className={`font-bold ${questions.length - answeredCount > 0 ? "text-amber-600" : ""}`}>
                  {questions.length - answeredCount}
                </span>
              </div>
            </div>

            {questions.length - answeredCount > 0 && (
              <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle size={13} />
                <span>Unanswered questions will be scored as incorrect.</span>
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Return to Test
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitTest}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500"
              >
                {submitting && <Loader2 size={13} className="animate-spin" />}
                <span>Submit &amp; Evaluate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}