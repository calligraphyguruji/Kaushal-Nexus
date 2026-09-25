import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Briefcase,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Building2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  FileCheck,
  Send,
  X,
  RotateCcw,
  Check,
  Flame,
  GraduationCap,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { internshipsApi } from "../api/internships";
import { INTERNSHIP_DOMAINS, ALL_INTERNSHIPS } from "../data/internshipsData";
import {
  PageTransition,
  AnimatedCard,
  AnimatedButton,
  AnimatedBadge,
  AnimatedModal,
  StaggerContainer,
  StaggerItem,
} from "../components/motion/MotionSystem";
import { CardSkeleton } from "../components/common/Skeletons";
import EmptyState from "../components/common/EmptyState";

export default function AvailableInternships() {
  const [searchParams, setSearchParams] = useSearchParams();
  const domainParam = searchParams.get("interest");

  // Active Learner Context from localStorage / session
  const [activeLearner, setActiveLearner] = useState(() => {
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
          target_domain: "fullstack",
          employment_readiness_score: 72,
        };
      }
    } catch {
      // Ignore parse errors
    }
    return {
      id: "KN-2026-LEARNER",
      full_name: "Candidate Learner",
      email: "learner@kaushalnexus.gov.in",
      target_domain: "fullstack",
      employment_readiness_score: 70,
    };
  });

  // State: Filter controls
  const [selectedInterest, setSelectedInterest] = useState(
    domainParam || activeLearner.target_domain || "fullstack"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [workMode, setWorkMode] = useState("all");
  const [minStipend, setMinStipend] = useState(0);
  const [sortBy, setSortBy] = useState("match");

  // State: Internships & Applications
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationModal, setApplicationModal] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("directory"); // "directory" | "applications"

  // Load applications
  const refreshApplications = useCallback(() => {
    const apps = internshipsApi.getMyApplications();
    setApplications(apps);
  }, []);

  useEffect(() => {
    refreshApplications();
    window.addEventListener("kn-applications-updated", refreshApplications);
    return () => window.removeEventListener("kn-applications-updated", refreshApplications);
  }, [refreshApplications]);

  // Sync candidate profile if updated
  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("kn_current_learner") || "{}");
        if (stored.full_name) setActiveLearner(stored);
      } catch {
        // Ignore
      }
    };
    window.addEventListener("kn-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("kn-profile-updated", handleProfileUpdate);
  }, []);

  // Fetch internships dynamically
  const fetchInternships = useCallback(async () => {
    setLoading(true);
    try {
      const activeGaps = (() => {
        try {
          return JSON.parse(localStorage.getItem("kn_active_gaps") || "[]");
        } catch {
          return [];
        }
      })();

      const result = await internshipsApi.listInternships(
        {
          interest: selectedInterest,
          search: searchQuery,
          work_mode: workMode,
          min_stipend: minStipend,
          sort_by: sortBy,
        },
        activeLearner,
        activeGaps
      );

      setInternships(result.internships || []);
    } catch (err) {
      console.error("Failed to load internships:", err);
    } finally {
      setLoading(false);
    }
  }, [activeLearner, minStipend, searchQuery, selectedInterest, sortBy, workMode]);

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  // Quick applied map
  const appliedMap = useMemo(() => {
    const map = {};
    applications.forEach((a) => {
      map[a.internship_id] = a;
    });
    return map;
  }, [applications]);

  // Metrics
  const metrics = useMemo(() => {
    const total = internships.length;
    const highMatches = internships.filter((i) => i.matchScore >= 80).length;
    const remoteCount = internships.filter((i) => i.workMode === "Remote").length;
    const avgStipend =
      total > 0
        ? Math.round(
            internships.reduce((acc, curr) => acc + (curr.stipendInr || 0), 0) / total
          )
        : 0;

    return { total, highMatches, remoteCount, avgStipend };
  }, [internships]);

  // Handle Application Submit
  const handleApply = async (internship, coverNote = "") => {
    setApplying(true);
    try {
      const res = await internshipsApi.applyToInternship(internship.id, {
        learner_id: activeLearner.id,
        learner_name: activeLearner.full_name,
        learner_email: activeLearner.email,
        cover_note: coverNote || "Applied via KaushalNexus Candidate Portal with NSQF Verified Skill Dossier.",
      });

      setApplicationSuccess(res);
      refreshApplications();
      setTimeout(() => {
        setApplicationModal(null);
        setApplicationSuccess(null);
      }, 1800);
    } catch (err) {
      console.error("Application error:", err);
    } finally {
      setApplying(false);
    }
  };

  const domainObj = useMemo(() => {
    return INTERNSHIP_DOMAINS.find((d) => d.id === selectedInterest) || null;
  }, [selectedInterest]);

  return (
    <PageTransition className="space-y-6">
      {/* 1. TOP CANDIDATE INTELLIGENCE BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/80 via-white to-indigo-50/40 p-6 shadow-xs dark:border-sky-900/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-sky-950/30">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-100/90 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-300">
              <Sparkles size={14} className="text-sky-600 dark:text-sky-400" />
              <span>AI Multi-Signal Competency Matching Engine</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Skill-Matched Internship Opportunities
            </h1>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Personalized for candidate{" "}
              <strong className="text-slate-950 dark:text-white">
                {activeLearner.full_name || "Learner"}
              </strong>{" "}
              ({activeLearner.id || "KN-2026"}). Matches are dynamically computed based on your
              Bayesian Knowledge Tracing (BKT) assessment masteries, verified skill credentials, and
              career interest track.
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:items-center">
            <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-800/80 min-w-[100px]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Matched Roles
              </span>
              <div className="mt-0.5 text-2xl font-extrabold text-sky-600 dark:text-sky-400">
                {metrics.total}
              </div>
              <span className="text-[10px] text-slate-500">Live Vacancies</span>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 text-center shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/40 min-w-[105px]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                High Match (80%+)
              </span>
              <div className="mt-0.5 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {metrics.highMatches}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Ready to Apply</span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-800/80 min-w-[110px]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Avg. Stipend
              </span>
              <div className="mt-0.5 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                ₹{(metrics.avgStipend / 1000).toFixed(0)}k
              </div>
              <span className="text-[10px] text-slate-500">Per Month</span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-800/80 min-w-[100px]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Applied
              </span>
              <div className="mt-0.5 text-2xl font-extrabold text-violet-600 dark:text-violet-400">
                {applications.length}
              </div>
              <span className="text-[10px] text-slate-500">Submitted</span>
            </div>
          </div>
        </div>

        {/* Diagnostic readiness pill */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <GraduationCap size={15} className="text-sky-600 dark:text-sky-400" />
            <span>
              Primary Interest Track:{" "}
              <strong className="text-slate-900 dark:text-white">
                {domainObj?.label || selectedInterest}
              </strong>
            </span>
            <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              {domainObj?.nsqfLevel || "NSQF Level 6"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/assessment"
              className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              <RotateCcw size={13} />
              <span>Retake Diagnostic Assessment</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <Link
              to="/learner?tab=remediation"
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <span>Recommended Learning Path</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS (Directory vs My Applications) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 border-b-2 pb-3 text-xs font-bold transition-all ${
              activeTab === "directory"
                ? "border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Briefcase size={15} />
            <span>Available Openings ({internships.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("applications")}
            className={`flex items-center gap-2 border-b-2 pb-3 text-xs font-bold transition-all ${
              activeTab === "applications"
                ? "border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FileCheck size={15} />
            <span>My Applications ({applications.length})</span>
            {applications.length > 0 && (
              <span className="rounded-full bg-sky-100 px-1.5 py-0.2 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                {applications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "directory" ? (
        <>
          {/* 3. DYNAMIC DOMAIN INTEREST TRACK SELECTOR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Domain Interest Track (At least 10+ internships per track):
              </span>
              <button
                type="button"
                onClick={() => setSelectedInterest("all")}
                className={`text-xs font-semibold ${
                  selectedInterest === "all"
                    ? "text-sky-600 underline dark:text-sky-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                View All Tracks (90+ Total)
              </button>
            </div>

            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
              {INTERNSHIP_DOMAINS.map((domain) => {
                const isSelected = selectedInterest === domain.id;
                const isPrimary = activeLearner.target_domain === domain.id;

                return (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => {
                      setSelectedInterest(domain.id);
                      setSearchParams({ interest: domain.id });
                    }}
                    className={`group relative flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                      isSelected
                        ? "border-sky-600 bg-sky-600 text-white shadow-xs dark:border-sky-500 dark:bg-sky-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <span>{domain.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {domain.badge}
                    </span>
                    {isPrimary && (
                      <span
                        className={`rounded px-1 text-[9px] font-mono font-bold uppercase ${
                          isSelected ? "bg-amber-400 text-slate-950" : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                        }`}
                        title="Your assessed primary track"
                      >
                        Tested
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. SEARCH & FILTER CONTROLS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Search input */}
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search role, company, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 transition focus:border-sky-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/50 dark:text-white dark:focus:border-sky-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Work Mode */}
              <div>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-700 transition focus:border-sky-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200"
                >
                  <option value="all">All Work Modes (Any)</option>
                  <option value="Remote">Remote Only</option>
                  <option value="Hybrid">Hybrid (Office + Remote)</option>
                  <option value="On-site">On-site / Campus</option>
                </select>
              </div>

              {/* Min Stipend Filter */}
              <div>
                <select
                  value={minStipend}
                  onChange={(e) => setMinStipend(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-700 transition focus:border-sky-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200"
                >
                  <option value={0}>All Stipend Levels</option>
                  <option value={20000}>Min. ₹20,000 / month</option>
                  <option value={25000}>Min. ₹25,000 / month</option>
                  <option value={30000}>Min. ₹30,000 / month</option>
                  <option value={40000}>Min. ₹40,000 / month</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-700 transition focus:border-sky-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200"
                >
                  <option value="match">Sort by: Best Skill Match %</option>
                  <option value="stipend">Sort by: Highest Stipend</option>
                  <option value="openings">Sort by: Most Openings</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5. INTERNSHIP CARDS GRID */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <CardSkeleton key={idx} rows={3} />
              ))}
            </div>
          ) : internships.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No internships found matching your filters"
              message="No opportunities matched your active criteria. Try adjusting your search query, reducing the minimum stipend, or selecting another career track."
              actionLabel="Reset All Filters"
              onAction={() => {
                setSearchQuery("");
                setWorkMode("all");
                setMinStipend(0);
                setSelectedInterest("fullstack");
              }}
            />
          ) : (
            <StaggerContainer
              staggerDelay={0.03}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {internships.map((internship) => {
                const isApplied = !!appliedMap[internship.id];
                const matchScore = internship.matchScore || 70;
                const isPrimary = internship.isPrimaryInterest;

                return (
                  <StaggerItem key={internship.id}>
                    <AnimatedCard
                      hoverable={true}
                      className={`relative flex flex-col justify-between h-full rounded-2xl border p-5 transition-shadow ${
                        isPrimary
                          ? "border-sky-300 bg-gradient-to-b from-sky-50/40 via-white to-white dark:border-sky-900/60 dark:from-sky-950/20 dark:via-slate-900 dark:to-slate-900"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      }`}
                    >
                      <div>
                        {/* Top Header: Company Avatar + Match Score Pill */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-extrabold text-white dark:bg-sky-950 dark:text-sky-300 shadow-2xs">
                              {internship.logoText || "IN"}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {internship.company}
                                </span>
                                {internship.verifiedBadge && (
                                  <ShieldCheck
                                    size={13}
                                    className="text-sky-600 dark:text-sky-400 shrink-0"
                                    title="MSDE Verified Employer Mandate"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <MapPin size={11} className="shrink-0" />
                                <span className="truncate max-w-[140px]">{internship.location}</span>
                              </div>
                            </div>
                          </div>

                          {/* Match Score Badge */}
                          <div className="text-right shrink-0">
                            <AnimatedBadge
                              className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold gap-1 ${
                                matchScore >= 80
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/50"
                                  : matchScore >= 65
                                  ? "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300/50"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50"
                              }`}
                            >
                              <Flame size={12} />
                              <span>{matchScore}% Match</span>
                            </AnimatedBadge>
                            <div className="mt-0.5 text-[9px] font-mono text-slate-400">
                              {internship.tier || "Skill Match"}
                            </div>
                          </div>
                        </div>

                        {/* Role Title */}
                        <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {internship.title}
                        </h3>

                        {/* Quick Details Chips */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800 font-mono">
                            ₹{internship.stipendInr?.toLocaleString("en-IN")}/mo
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                            {internship.workMode}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                            {internship.duration}
                          </span>
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {internship.openings} Openings
                          </span>
                        </div>

                        {/* Competency Alignment */}
                        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Competencies &amp; Skill Verification
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {internship.requiredSkills?.map((skill, idx) => {
                              const isMatched = internship.matchedSkills?.includes(skill);
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                    isMatched
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300"
                                      : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300"
                                  }`}
                                >
                                  {isMatched ? (
                                    <Check size={10} className="text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <AlertCircle size={10} className="text-amber-600 dark:text-amber-400" />
                                  )}
                                  <span>{skill}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Brief description snippet */}
                        <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                          {internship.description}
                        </p>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSelectedInternship(internship)}
                          className="text-xs font-semibold text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 cursor-pointer transition-colors"
                        >
                          View Details
                        </button>

                        {isApplied ? (
                          <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 size={13} />
                            <span>Applied</span>
                          </div>
                        ) : (
                          <AnimatedButton
                            onClick={() => setApplicationModal(internship)}
                            className="rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-sky-500"
                            icon={Send}
                            iconPosition="left"
                          >
                            Quick Apply
                          </AnimatedButton>
                        )}
                      </div>
                    </AnimatedCard>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </>
      ) : (
        /* 6. MY APPLICATIONS VIEW */
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Application Tracker ({applications.length} Submissions)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Track candidate dossier dispatch, hiring partner review, and interview invitations.
            </p>

            {applications.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400">
                <FileCheck size={32} className="mb-2 text-slate-300 dark:text-slate-600" />
                <p>You have not submitted applications yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("directory")}
                  className="mt-3 text-xs font-bold text-sky-600 hover:underline dark:text-sky-400"
                >
                  Browse skill-matched internships →
                </button>
              </div>
            ) : (
              <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                {applications.map((app, idx) => (
                  <div key={idx} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {app.role_title}
                        </span>
                        <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                          {app.company_name}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Application Ref: {app.application_id}</span>
                        <span>•</span>
                        <span>Applied on {new Date(app.applied_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 size={12} />
                        <span>{app.status || "SUBMITTED"}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          const item = ALL_INTERNSHIPS.find((i) => i.id === app.internship_id);
                          if (item) setSelectedInternship(item);
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        View Role
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. INTERNSHIP DETAILS MODAL */}
      <AnimatedModal
        isOpen={Boolean(selectedInternship)}
        onClose={() => setSelectedInternship(null)}
        maxWidth="max-w-2xl"
        className="max-h-[90vh] overflow-y-auto p-6"
      >
        {selectedInternship && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSelectedInternship(null)}
              className="absolute right-0 top-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-4 pr-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-extrabold text-white dark:bg-sky-950 dark:text-sky-300">
                {selectedInternship.logoText || "IN"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {selectedInternship.company}
                  </span>
                  <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    {selectedInternship.nsqfLevel || "NSQF Level 6"}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {selectedInternship.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{selectedInternship.location}</span>
                  <span>•</span>
                  <span>{selectedInternship.workMode}</span>
                  <span>•</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{selectedInternship.stipendInr?.toLocaleString("en-IN")}/mo
                  </span>
                </div>
              </div>
            </div>

            {/* Match Score & Gap Analysis */}
            <div className="mt-5 rounded-xl border border-slate-200/90 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Candidate Competency Alignment Score:
                  </span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {selectedInternship.matchScore || 75}% Match
                </span>
              </div>

              {selectedInternship.missingSkills && selectedInternship.missingSkills.length > 0 && (
                <div className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-bold">Bridge Opportunities: </span>
                  <span>
                    Completing recommended bridge modules for{" "}
                    <strong>{selectedInternship.missingSkills.join(", ")}</strong> will increase your match score to 95%+.
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mt-5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Role Description
              </h4>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {selectedInternship.description}
              </p>
            </div>

            {/* Responsibilities */}
            {selectedInternship.responsibilities && (
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Key Learning Responsibilities
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {selectedInternship.responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-sky-500">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Perks */}
            {selectedInternship.perks && (
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Perks &amp; Incentives
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedInternship.perks.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <AnimatedButton
                type="button"
                onClick={() => setSelectedInternship(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </AnimatedButton>

              {appliedMap[selectedInternship.id] ? (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 size={14} />
                  <span>Application Submitted</span>
                </div>
              ) : (
                <AnimatedButton
                  type="button"
                  onClick={() => {
                    const int = selectedInternship;
                    setSelectedInternship(null);
                    setApplicationModal(int);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500"
                >
                  <Send size={13} />
                  <span>Apply with Verified Dossier</span>
                </AnimatedButton>
              )}
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* 8. APPLICATION CONFIRMATION MODAL */}
      <AnimatedModal
        isOpen={Boolean(applicationModal)}
        onClose={() => {
          if (!applying) setApplicationModal(null);
        }}
        maxWidth="max-w-lg"
        className="p-6"
      >
        {applicationModal && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (!applying) setApplicationModal(null);
              }}
              className="absolute right-0 top-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>

            {applicationSuccess ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  Application Submitted!
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {applicationSuccess.message}
                </p>
                <div className="mt-3 inline-block rounded bg-slate-100 px-3 py-1 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Reference: {applicationSuccess.application_id}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 pr-8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                    <Send size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Confirm Application Submission
                    </h3>
                    <p className="text-xs text-slate-500">
                      {applicationModal.title} at <strong>{applicationModal.company}</strong>
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Applicant:</span>
                    <strong className="text-slate-900 dark:text-white">{activeLearner.full_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Candidate ID:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{activeLearner.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Evaluated Match:</span>
                    <span className="font-bold text-emerald-600">{applicationModal.matchScore || 75}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Credentials Attached:</span>
                    <span className="text-sky-600 font-semibold">NSQF Diagnostic Certified</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Brief Note to Hiring Team (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="E.g. I have evaluated competencies in React & REST APIs and am excited to contribute to your engineering team..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    id="applicant-cover-note"
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <AnimatedButton
                    type="button"
                    onClick={() => setApplicationModal(null)}
                    disabled={applying}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </AnimatedButton>

                  <AnimatedButton
                    type="button"
                    onClick={() => {
                      const noteEl = document.getElementById("applicant-cover-note");
                      handleApply(applicationModal, noteEl ? noteEl.value : "");
                    }}
                    disabled={applying}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500 disabled:opacity-50"
                  >
                    {applying ? (
                      <span>Dispatching Dossier...</span>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Submit Application</span>
                      </>
                    )}
                  </AnimatedButton>
                </div>
              </div>
            )}
          </div>
        )}
      </AnimatedModal>
    </PageTransition>
  );
}
