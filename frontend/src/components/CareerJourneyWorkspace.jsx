import React, { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Plus,
  ChevronRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Award,
  FileText,
  Database,
  Code2,
  ExternalLink,
  Filter,
  Download,
  RefreshCw,
  FolderGit2,
  Layers,
  Send,
  UserCheck,
  TrendingUp,
  Compass,
} from "lucide-react";

import { learnerPipelineApi } from "../api/learnerPipeline";
import { getErrorMessage } from "../api/client";
import AIPlacementPredictionCard from "./AIPlacementPredictionCard";
import CareerIntelligenceCenter from "./CareerIntelligenceCenter";

export default function CareerJourneyWorkspace({ onJourneyUpdated }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Core Data States
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [activeTab, setActiveTab] = useState("timeline"); // 'timeline', 'applications', 'projects', 'outcomes', 'ml_snapshots'

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
  const [latestSnapshot, setLatestSnapshot] = useState(null);

  // Event Form State
  const [eventForm, setEventForm] = useState({
    event_type: "APPLICATION_SUBMITTED",
    organization_name: "",
    event_date: new Date().toISOString().slice(0, 10),
    source: "SELF_REPORTED",
    notes: "",
  });

  // Application Form State
  const [appForm, setAppForm] = useState({
    organization_name: "",
    job_title: "",
    status: "SUBMITTED",
    notes: "",
  });

  // Project Form State
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    skills: "Python, FastAPI, PostgreSQL",
    technologies: "FastAPI, React, Docker",
    github_url: "",
    live_url: "",
    completed_at: new Date().toISOString().slice(0, 10),
    verification_status: "SELF_REPORTED",
  });

  // Outcome Form State
  const [outcomeForm, setOutcomeForm] = useState({
    outcome_type: "INTERNSHIP_ACCEPTED",
    outcome_value: 1.0,
    source: "SELF_REPORTED",
    status: "PENDING",
    notes: "",
  });

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewData, eventsData, appsData, projsData, outcomesData] = await Promise.all([
        learnerPipelineApi.getCareerJourneyOverview().catch(() => null),
        learnerPipelineApi.listCareerEvents().catch(() => []),
        learnerPipelineApi.listCareerApplications().catch(() => []),
        learnerPipelineApi.listProjects().catch(() => []),
        learnerPipelineApi.getMyOutcomes().catch(() => []),
      ]);

      setOverview(overviewData);
      setEvents(eventsData || []);
      setApplications(appsData || []);
      setProjects(projsData || []);
      setOutcomes(outcomesData || []);
    } catch (err) {
      console.error("Career journey load error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Event Submit
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await learnerPipelineApi.recordCareerEvent({
        ...eventForm,
        event_date: new Date(eventForm.event_date).toISOString(),
      });
      showNotification("Career event successfully documented on your timeline.");
      setIsEventModalOpen(false);
      setEventForm({
        event_type: "APPLICATION_SUBMITTED",
        organization_name: "",
        event_date: new Date().toISOString().slice(0, 10),
        source: "SELF_REPORTED",
        notes: "",
      });
      await loadData();
      onJourneyUpdated?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle Application Submit
  const handleCreateApplication = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await learnerPipelineApi.createCareerApplication(appForm);
      showNotification("Application logged. Timeline automatically updated.");
      setIsAppModalOpen(false);
      setAppForm({ organization_name: "", job_title: "", status: "SUBMITTED", notes: "" });
      await loadData();
      onJourneyUpdated?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle Application Status Update
  const handleUpdateAppStatus = async (appId, newStatus) => {
    try {
      await learnerPipelineApi.updateCareerApplication(appId, { status: newStatus });
      showNotification(`Application updated to ${newStatus}. Milestone event recorded.`);
      await loadData();
      onJourneyUpdated?.();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Handle Project Submit
  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const skillsArray = projectForm.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const techArray = projectForm.technologies
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await learnerPipelineApi.createProject({
        ...projectForm,
        skills: skillsArray,
        technologies: techArray,
        completed_at: new Date(projectForm.completed_at).toISOString(),
      });
      showNotification("Project evidence logged in your verified portfolio.");
      setIsProjectModalOpen(false);
      setProjectForm({
        title: "",
        description: "",
        skills: "Python, FastAPI, PostgreSQL",
        technologies: "FastAPI, React, Docker",
        github_url: "",
        live_url: "",
        completed_at: new Date().toISOString().slice(0, 10),
        verification_status: "SELF_REPORTED",
      });
      await loadData();
      onJourneyUpdated?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle Outcome Submit
  const handleCreateOutcome = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await learnerPipelineApi.recordOutcome(outcomeForm);
      showNotification("Career outcome recorded. Awaiting institutional audit.");
      setIsOutcomeModalOpen(false);
      setOutcomeForm({
        outcome_type: "INTERNSHIP_ACCEPTED",
        outcome_value: 1.0,
        source: "SELF_REPORTED",
        status: "PENDING",
        notes: "",
      });
      await loadData();
      onJourneyUpdated?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Handle ML Snapshot Generation (Frozen at Cutoff T)
  const handleGenerateSnapshot = async () => {
    try {
      setIsSnapshotLoading(true);
      const snap = await learnerPipelineApi.createFeatureSnapshot({
        prediction_cutoff: new Date().toISOString(),
        feature_version: "v1",
      });
      setLatestSnapshot(snap);
      showNotification("Historical point-in-time feature snapshot successfully frozen at cutoff T.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSnapshotLoading(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        <span className="text-xs font-mono text-slate-400">
          Loading Career Journey & Outcome Dossier...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          1. CAREER OUTCOME DASHBOARD METRIC SUMMARY
      ========================================================================== */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                PHASE 4
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Career Journey & Longitudinal Outcome Tracking
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Auditable record of learning milestones, technical projects, job applications, interview pipelines, and verified employment outcomes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Plus size={14} />
              <span>Log Event</span>
            </button>
            <button
              onClick={() => setIsAppModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Briefcase size={14} />
              <span>New Application</span>
            </button>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Code2 size={14} />
              <span>Add Project</span>
            </button>
            <button
              onClick={() => setIsOutcomeModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500 transition-all cursor-pointer"
            >
              <Award size={14} />
              <span>Record Outcome</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Target Role</span>
            <span className="mt-1 block truncate text-xs font-bold text-slate-800 dark:text-slate-200">
              {overview?.target_role_title || "Not Selected"}
            </span>
            <span className="mt-0.5 block font-mono text-[11px] text-sky-600 dark:text-sky-400">
              {overview?.role_match_score || 0}% Match
            </span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Mastered Skills</span>
            <span className="mt-1 block text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {overview?.mastered_skills_count || 0}
            </span>
            <span className="block text-[10px] text-slate-400">
              {overview?.critical_gaps_count || 0} critical gaps
            </span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Projects</span>
            <span className="mt-1 block text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {projects.length}
            </span>
            <span className="block text-[10px] text-slate-400">Practical evidence</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Applications</span>
            <span className="mt-1 block text-lg font-black text-sky-600 dark:text-sky-400 font-mono">
              {applications.length}
            </span>
            <span className="block text-[10px] text-slate-400">Active pipelines</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Interviews</span>
            <span className="mt-1 block text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
              {overview?.interviews_count || 0}
            </span>
            <span className="block text-[10px] text-slate-400">Attended / Invited</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <span className="block text-[10px] font-mono uppercase text-slate-400">Career Outcome</span>
            <span className="mt-1 block truncate text-xs font-bold text-slate-900 dark:text-white">
              {overview?.employment_status || "SEEKING"}
            </span>
            <span className="mt-0.5 inline-block rounded bg-sky-100 px-1.5 py-0.2 text-[9px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              {overview?.internship_status || "NOT_STARTED"}
            </span>
          </div>
        </div>

        {/* Disclaimers & Zero-Leakage Notice */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-50/80 px-3.5 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
          <ShieldCheck size={14} className="shrink-0 text-sky-500" />
          <span>
            <strong>Historical Ground Truth Barrier:</strong> All outcomes and milestones reflect observed, timestamped reality. Machine Learning (XGBoost) predictions are calibrated from historical pre-cutoff snapshots.
          </span>
        </div>
      </section>

      {/* =========================================================================
          1.5. PHASE 5 CALIBRATED XGBOOST PLACEMENT FORECAST
      ========================================================================== */}
      <AIPlacementPredictionCard />

      {/* =========================================================================
          2. WORKSPACE TAB NAVIGATION
      ========================================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap">
        <button
          onClick={() => setActiveTab("intelligence")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "intelligence"
              ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Compass size={14} />
          <span>Career Intelligence &amp; Actions</span>
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "timeline"
              ? "bg-sky-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Clock size={14} />
          <span>Career Journey Timeline ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("applications")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "applications"
              ? "bg-sky-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Briefcase size={14} />
          <span>Application Tracker ({applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "projects"
              ? "bg-sky-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Code2 size={14} />
          <span>Practical Projects ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("outcomes")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "outcomes"
              ? "bg-sky-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Award size={14} />
          <span>Ground Truth Outcomes ({outcomes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ml_snapshots")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "ml_snapshots"
              ? "bg-sky-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Database size={14} />
          <span>ML Feature Snapshots (Cutoff T)</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 0: PHASE 6 PRODUCTION CAREER INTELLIGENCE & NEXT-BEST ACTIONS
      ========================================================================== */}
      {activeTab === "intelligence" && (
        <section>
          <CareerIntelligenceCenter
            onNavigateAction={(action) => {
              if (action.action_type === "APPLY_TO_ROLE" || action.action_type === "PREPARE_INTERVIEW") {
                setActiveTab("applications");
              } else if (action.action_type === "COMPLETE_PROJECT" || action.action_type === "IMPROVE_PROJECT") {
                setActiveTab("projects");
              } else {
                setActiveTab("timeline");
              }
            }}
          />
        </section>
      )}

      {/* =========================================================================
          TAB 1: CAREER JOURNEY TIMELINE
      ========================================================================== */}
      {activeTab === "timeline" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Chronological Career Events
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Timestamped log of candidate actions, skill advancements, and career steps.
              </p>
            </div>
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300"
            >
              <Plus size={13} />
              <span>Record Event</span>
            </button>
          </div>

          {events.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No career events logged yet. Use "Record Event" or apply for roles to start your journey.
            </div>
          ) : (
            <div className="mt-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 space-y-6">
              {events.map((ev) => (
                <div key={ev.id} className="relative group">
                  <div className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-500 ring-2 ring-sky-100 dark:border-slate-900 dark:ring-sky-950" />
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-slate-50 dark:border-slate-800/80 dark:bg-slate-800/30">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {ev.event_type.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            ev.source === "EMPLOYER_VERIFIED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : ev.source === "INSTITUTION_VERIFIED"
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {ev.source}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(ev.event_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {ev.organization_name && (
                      <div className="mt-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                        {ev.organization_name}
                      </div>
                    )}

                    {ev.notes && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {ev.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 2: APPLICATION TRACKER
      ========================================================================== */}
      {activeTab === "applications" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Job & Internship Applications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage concurrent applications across companies. Status updates automatically trigger verifiable career events.
              </p>
            </div>
            <button
              onClick={() => setIsAppModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300"
            >
              <Plus size={13} />
              <span>Log Application</span>
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No applications tracked yet. Click "Log Application" to start monitoring your recruitment pipeline.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {app.job_title || "General Application"}
                      </span>
                      <span className="font-mono text-xs text-slate-500">·</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {app.organization_name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                      <span>
                        Applied: {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                      {app.salary_offered && (
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹{app.salary_offered} LPA
                        </span>
                      )}
                    </div>
                    {app.notes && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {app.notes}
                      </p>
                    )}
                  </div>

                  {/* Status Dropdown Switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Stage:</span>
                    <select
                      value={app.status}
                      onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="SUBMITTED">Submitted</option>
                      <option value="SCREENING">Screening</option>
                      <option value="INTERVIEW">Interview</option>
                      <option value="OFFERED">Offered</option>
                      <option value="ACCEPTED">Accepted</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="WITHDRAWN">Withdrawn</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 3: PRACTICAL PROJECTS EVIDENCE
      ========================================================================== */}
      {activeTab === "projects" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Technical Portfolio Projects
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Practical engineering evidence demonstrating real-world technical execution. Does not inflate BKT knowledge scores directly.
              </p>
            </div>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300"
            >
              <Plus size={13} />
              <span>Add Project</span>
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No portfolio projects recorded. Log your technical projects with GitHub repositories and live demo links.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {proj.title}
                    </h4>
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {proj.verification_status}
                    </span>
                  </div>

                  {proj.description && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {proj.description}
                    </p>
                  )}

                  {/* Tech stack badges */}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {proj.technologies.map((t, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-slate-700/60 dark:text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-400 font-mono">
                      Completed: {new Date(proj.completed_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-3">
                      {proj.github_url && (
                        <a
                          href={proj.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sky-600 hover:underline dark:text-sky-400"
                        >
                          <FolderGit2 size={12} />
                          <span>Code</span>
                        </a>
                      )}
                      {proj.live_url && (
                        <a
                          href={proj.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          <ExternalLink size={12} />
                          <span>Demo</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 4: GROUND TRUTH CAREER OUTCOMES
      ========================================================================== */}
      {activeTab === "outcomes" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Historical Ground-Truth Career Outcomes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official milestone outcomes (internships, full-time offers, retention). Strictly separate from predictive features.
              </p>
            </div>
            <button
              onClick={() => setIsOutcomeModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-sky-500"
            >
              <Plus size={13} />
              <span>Record Outcome</span>
            </button>
          </div>

          {outcomes.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No formal career outcomes recorded yet. Record your accepted offers or verified placements here.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Milestone</th>
                    <th className="py-2.5 px-3">Target Role</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Source Attribution</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3 text-right">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {outcomes.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {o.outcome_type.replace(/_/g, " ")}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {o.role_title || "General"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {new Date(o.outcome_date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {o.source}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-sky-600 dark:text-sky-400">
                        {(o.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            o.status === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : o.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {o.status || "VERIFIED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 5: ML FEATURE SNAPSHOTS (POINT-IN-TIME AT CUTOFF T)
      ========================================================================== */}
      {activeTab === "ml_snapshots" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ML Historical Feature Snapshots (Cutoff T)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Frozen tabular feature vectors constructed with a strict temporal barrier. Zero future data is permitted to prevent model leakage.
              </p>
            </div>
            <button
              onClick={handleGenerateSnapshot}
              disabled={isSnapshotLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 cursor-pointer disabled:opacity-50"
            >
              {isSnapshotLoading ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              <span>Freeze Snapshot (Cutoff = Now)</span>
            </button>
          </div>

          {latestSnapshot ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <div className="flex items-center justify-between font-mono text-[11px] text-indigo-900 dark:text-indigo-200">
                  <span>SNAPSHOT ID: {latestSnapshot.id}</span>
                  <span>VERSION: {latestSnapshot.feature_version}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
                  PREDICTION CUTOFF T: {latestSnapshot.prediction_cutoff}
                </div>
              </div>

              {/* JSON Vector Display */}
              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-slate-100 font-mono text-xs overflow-x-auto max-h-96">
                <pre>{JSON.stringify(latestSnapshot.features_json, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Click "Freeze Snapshot" above to generate a point-in-time tabular vector for this candidate.
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          MODALS
      ========================================================================== */}
      {/* Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Log Career Journey Event
            </h3>
            <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Event Type
                </label>
                <select
                  value={eventForm.event_type}
                  onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="APPLICATION_SUBMITTED">Application Submitted</option>
                  <option value="INTERVIEW_INVITED">Interview Invited</option>
                  <option value="INTERVIEW_ATTENDED">Interview Attended</option>
                  <option value="INTERNSHIP_OFFERED">Internship Offered</option>
                  <option value="INTERNSHIP_ACCEPTED">Internship Accepted</option>
                  <option value="INTERNSHIP_COMPLETED">Internship Completed</option>
                  <option value="EMPLOYMENT_OFFERED">Employment Offered</option>
                  <option value="EMPLOYMENT_ACCEPTED">Employment Accepted</option>
                  <option value="PLACED">Placed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Company or Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g. Infosys, TCS, Wipro..."
                  value={eventForm.organization_name}
                  onChange={(e) => setEventForm({ ...eventForm, organization_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Event Occurrence Date
                </label>
                <input
                  type="date"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or interview round info..."
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {isAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Log Job / Internship Application
            </h3>
            <form onSubmit={handleCreateApplication} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Technologies"
                  value={appForm.organization_name}
                  onChange={(e) => setAppForm({ ...appForm, organization_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Backend Developer Intern"
                  value={appForm.job_title}
                  onChange={(e) => setAppForm({ ...appForm, job_title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Current Stage
                </label>
                <select
                  value={appForm.status}
                  onChange={(e) => setAppForm({ ...appForm, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="SUBMITTED">Submitted</option>
                  <option value="SCREENING">Screening</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="OFFERED">Offered</option>
                  <option value="ACCEPTED">Accepted</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Application portal, referral, or notes..."
                  value={appForm.notes}
                  onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAppModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Add Portfolio Project
            </h3>
            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Task Queue"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Technologies (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. FastAPI, Celery, Redis"
                  value={projectForm.technologies}
                  onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GitHub Repository Link
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={projectForm.github_url}
                  onChange={(e) => setProjectForm({ ...projectForm, github_url: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="What architecture or problem does this project solve?"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outcome Modal */}
      {isOutcomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Record Official Career Outcome
            </h3>
            <form onSubmit={handleCreateOutcome} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Outcome Type
                </label>
                <select
                  value={outcomeForm.outcome_type}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome_type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="INTERNSHIP_ACCEPTED">Internship Accepted</option>
                  <option value="EMPLOYMENT_OFFERED">Employment Offered</option>
                  <option value="EMPLOYMENT_ACCEPTED">Employment Accepted</option>
                  <option value="PLACED">Placed & Verified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Source Attribution
                </label>
                <select
                  value={outcomeForm.source}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, source: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="SELF_REPORTED">Self Reported (Confidence: 60%)</option>
                  <option value="INSTITUTION_VERIFIED">Institution Verified (Confidence: 90%)</option>
                  <option value="EMPLOYER_VERIFIED">Employer Verified (Confidence: 100%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Offer details, joining date, or verification documents..."
                  value={outcomeForm.notes}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOutcomeModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500"
                >
                  Submit Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
