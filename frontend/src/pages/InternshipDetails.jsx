import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Briefcase,
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Check,
  Calendar,
  Users,
  Flame,
  Award,
  GraduationCap,
  Layers,
  Share2,
  Copy,
  ExternalLink,
  ChevronRight,
  BookOpen,
  TrendingUp,
  FileCheck,
  AlertTriangle,
  RotateCcw,
  X,
} from "lucide-react";
import { internshipsApi } from "../api/internships";
import { calculateInternshipMatch, ALL_INTERNSHIPS } from "../data/internshipsData";
import {
  PageTransition,
  AnimatedCard,
  AnimatedButton,
  AnimatedBadge,
  AnimatedModal,
} from "../components/motion/MotionSystem";
import { Skeleton } from "../components/common/Skeletons";
import SEOHead from "../components/SEOHead";

export default function InternshipDetails() {
  const { internshipId } = useParams();
  const navigate = useNavigate();

  // Active Learner Context from localStorage / session
  const [activeLearner, setActiveLearner] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("kn_current_learner") || "{}");
      if (stored.full_name) return stored;
    } catch {
      // Ignore
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
      // Ignore
    }
    return {
      id: "KN-2026-LEARNER",
      full_name: "Candidate Learner",
      email: "learner@kaushalnexus.gov.in",
      target_domain: "fullstack",
      employment_readiness_score: 70,
    };
  });

  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Application submission modal & state
  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(null);
  const [coverNote, setCoverNote] = useState("");
  const [applications, setApplications] = useState([]);

  // Load existing applications
  const refreshApplications = useCallback(() => {
    const apps = internshipsApi.getMyApplications();
    setApplications(apps);
  }, []);

  useEffect(() => {
    refreshApplications();
    window.addEventListener("kn-applications-updated", refreshApplications);
    return () => window.removeEventListener("kn-applications-updated", refreshApplications);
  }, [refreshApplications]);

  // Fetch internship by ID
  const fetchInternshipDetails = useCallback(async () => {
    if (!internshipId) {
      setError("No internship ID specified.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activeGaps = (() => {
        try {
          return JSON.parse(localStorage.getItem("kn_active_gaps") || "[]");
        } catch {
          return [];
        }
      })();

      const data = await internshipsApi.getById(internshipId);
      if (!data) {
        setError(`Internship opportunity "${internshipId}" could not be found.`);
        return;
      }

      // Enrich with candidate match intelligence
      const matchMetrics = calculateInternshipMatch(data, activeLearner, activeGaps);
      setInternship({
        ...data,
        ...matchMetrics,
      });
    } catch (err) {
      console.error("Failed to load internship details:", err);
      setError(err?.message || "Failed to load internship details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [internshipId, activeLearner]);

  useEffect(() => {
    fetchInternshipDetails();
  }, [fetchInternshipDetails]);

  // Is this internship already applied to?
  const existingApplication = useMemo(() => {
    if (!internshipId) return null;
    return applications.find((a) => a.internship_id === internshipId) || null;
  }, [applications, internshipId]);

  // Handle Share / Copy Link
  const handleCopyLink = () => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Handle Application Submit
  const handleApply = async () => {
    if (!internship) return;
    setApplying(true);
    try {
      const res = await internshipsApi.applyToInternship(internship.id, {
        learner_id: activeLearner.id,
        learner_name: activeLearner.full_name,
        learner_email: activeLearner.email,
        cover_note:
          coverNote ||
          "Applied via KaushalNexus Candidate Portal with NSQF Verified Skill Dossier.",
      });

      setApplicationSuccess(res);
      refreshApplications();
      setTimeout(() => {
        setApplicationModalOpen(false);
        setApplicationSuccess(null);
      }, 2000);
    } catch (err) {
      console.error("Application error:", err);
    } finally {
      setApplying(false);
    }
  };

  // Render: Loading skeleton
  if (loading) {
    return (
      <PageTransition className="space-y-6 max-w-6xl mx-auto">
        <SEOHead title="Loading Internship Opportunity | KaushalNexus" noindex={true} />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-[#262320] bg-white dark:bg-[#141210] p-6 space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      </PageTransition>
    );
  }

  // Render: Error / Not Found State
  if (error || !internship) {
    return (
      <PageTransition className="max-w-2xl mx-auto py-12">
        <SEOHead
          title="Internship Not Found | KaushalNexus"
          description="The requested internship opening could not be found or has expired."
          noindex={true}
        />
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
            <AlertTriangle size={28} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            Opportunity Not Available
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {error || "We could not find the internship opening you requested. It may have expired or been filled."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/internships")}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-sky-500 cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Available Internships</span>
            </button>
            <button
              type="button"
              onClick={fetchInternshipDetails}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
            >
              <RotateCcw size={15} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const matchScore = internship.matchScore || 75;
  const isHighMatch = matchScore >= 80;

  const stipendNumeric = parseInt(String(internship.stipend || "").replace(/[^0-9]/g, ""), 10) || 25000;
  const isRemote = (internship.work_mode || "").toLowerCase().includes("remote");

  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": internship.title,
    "description": internship.description || `${internship.title} internship position at ${internship.company}.`,
    "datePosted": "2026-03-01",
    "validThrough": "2026-12-31",
    "employmentType": "INTERN",
    "hiringOrganization": {
      "@type": "Organization",
      "name": internship.company,
      "sameAs": "https://kaushal-nexus.vercel.app"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": internship.location || "India",
        "addressCountry": "IN"
      }
    },
    ...(isRemote ? { "jobLocationType": "TELECOMMUTE" } : {}),
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "INR",
      "value": {
        "@type": "QuantitativeValue",
        "value": stipendNumeric,
        "unitText": "MONTH"
      }
    },
    "skills": (internship.required_skills || []).join(", ")
  };

  return (
    <PageTransition className="space-y-6 max-w-6xl mx-auto">
      <SEOHead
        title={`${internship.title} at ${internship.company} | KaushalNexus`}
        description={
          internship.description?.slice(0, 155) ||
          `Apply for ${internship.title} at ${internship.company}. Verified skill competencies, stipend ${internship.stipend}, located in ${internship.location}.`
        }
        canonicalPath={`/internships/${internship.id}`}
        keywords={`${internship.title}, ${internship.company}, internship, ${internship.location}, ${internship.work_mode}, skill matching, NSQF, KaushalNexus`}
        structuredData={jobPostingSchema}
      />
      {/* 1. TOP BREADCRUMB NAVIGATION */}
      <nav className="flex items-center justify-between">
        <Link
          to="/internships"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white group-hover:border-sky-300 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span>Back to Available Internships</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 shadow-2xs cursor-pointer transition-colors"
            title="Copy shareable link"
          >
            {copiedLink ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={14} />
                <span>Share Opening</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* 2. PRIMARY HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            {/* Company Logo Avatar */}
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg sm:text-xl font-extrabold text-white shadow-xs dark:bg-sky-950 dark:text-sky-300">
              {internship.logoText || "IN"}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300">
                  {internship.company}
                </span>

                {internship.verifiedBadge && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-300">
                    <ShieldCheck size={13} className="text-sky-600 dark:text-sky-400" />
                    <span>MSDE Verified Employer</span>
                  </span>
                )}

                {internship.nsqfLevel && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {internship.nsqfLevel}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                {internship.title}
              </h1>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={15} className="text-slate-400" />
                  <span>{internship.location}</span>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={15} className="text-slate-400" />
                  <span>{internship.workMode}</span>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <Clock size={15} className="text-slate-400" />
                  <span>{internship.duration}</span>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                  <Users size={15} />
                  <span>{internship.openings} Openings Available</span>
                </span>
              </div>
            </div>
          </div>

          {/* CTA & Match Badge */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
            <div className="text-left lg:text-right">
              <AnimatedBadge
                className={`rounded-full px-3.5 py-1 text-sm font-extrabold gap-1.5 ${
                  matchScore >= 80
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                    : matchScore >= 65
                    ? "bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800"
                    : "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                }`}
              >
                <Flame size={16} />
                <span>{matchScore}% Competency Match</span>
              </AnimatedBadge>
              <p className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                {internship.tier || "Skill Match Evaluated"}
              </p>
            </div>

            {existingApplication ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 size={16} />
                <span>Application Submitted ({existingApplication.application_id})</span>
              </div>
            ) : (
              <AnimatedButton
                onClick={() => setApplicationModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-500 cursor-pointer"
              >
                <Send size={15} />
                <span>Quick Apply with Dossier</span>
              </AnimatedButton>
            )}
          </div>
        </div>

        {/* Highlighted Metric strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Monthly Stipend
            </span>
            <div className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{internship.stipendInr?.toLocaleString("en-IN")}
              <span className="text-xs font-normal text-slate-500"> / mo</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Work Mode
            </span>
            <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              {internship.workMode}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Duration
            </span>
            <div className="mt-1 text-base font-bold text-slate-900 dark:text-white font-mono">
              {internship.duration}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Open Positions
            </span>
            <div className="mt-1 text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {internship.openings} Openings
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT: 2-COLUMN SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Full Role Narrative & Requirements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Competency & Skill Gap Alignment Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-sky-600 dark:text-sky-400" />
                <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  Candidate Competency Alignment
                </h2>
              </div>
              <span className="rounded-md bg-sky-50 px-2.5 py-1 text-xs font-mono font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                BKT Evaluation
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Comparison between your verified skill masteries and the competencies mandated by{" "}
              <strong>{internship.company}</strong> for this opportunity.
            </p>

            {/* Matched Skills */}
            <div className="mt-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Verified Skills Matched ({internship.matchedSkills?.length || 0}):
              </span>
              <div className="flex flex-wrap gap-2">
                {internship.matchedSkills?.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Missing / Gap Skills */}
            {internship.missingSkills && internship.missingSkills.length > 0 && (
              <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Recommended Bridge Upskilling:
                  </span>
                </div>
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  You have potential growth in:{" "}
                  <strong>{internship.missingSkills.join(", ")}</strong>. Completing adaptive micro-modules in your learning path will enhance placement readiness for this role.
                </p>
                <div className="pt-1">
                  <Link
                    to="/learner?tab=remediation"
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline dark:text-amber-300"
                  >
                    <span>View Recommended Learning Modules</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Full Role Description */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
              Role Description
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {internship.description}
            </p>
          </div>

          {/* Key Responsibilities */}
          {internship.responsibilities && internship.responsibilities.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                Key Responsibilities
              </h2>
              <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                {internship.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Required & Preferred Skills */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
              Required &amp; Preferred Competencies
            </h2>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mandatory Prerequisites:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {internship.requiredSkills?.map((skill, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {internship.preferredSkills && internship.preferredSkills.length > 0 && (
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Preferred / Nice-to-Have:
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {internship.preferredSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-1 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Perks & Benefits */}
          {internship.perks && internship.perks.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                What You Will Gain / Benefits
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {internship.perks.map((perk, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 text-xs sm:text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200"
                  >
                    <Award size={16} className="text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Application Dossier & Snapshot Card */}
        <div className="space-y-6">
          {/* Quick Apply Action Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              Application Status
            </h3>

            {existingApplication ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Dossier Dispatched</span>
                    <p className="mt-0.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                      Ref: {existingApplication.application_id}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Applied Date:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {new Date(existingApplication.applied_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Partner:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {internship.company}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-bold text-emerald-600">
                      {existingApplication.status || "UNDER REVIEW"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your NSQF-verified credential dossier and BKT skill scores will be securely shared with {internship.company}.
                </p>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Applicant:</span>
                    <strong className="text-slate-900 dark:text-white">{activeLearner.full_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Candidate ID:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{activeLearner.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Match Score:</span>
                    <span className="font-bold text-emerald-600">{matchScore}%</span>
                  </div>
                </div>

                <AnimatedButton
                  onClick={() => setApplicationModalOpen(true)}
                  className="w-full rounded-xl bg-sky-600 py-3 text-sm font-bold text-white shadow-xs hover:bg-sky-500 cursor-pointer"
                  icon={Send}
                  iconPosition="left"
                >
                  Quick Apply
                </AnimatedButton>
              </div>
            )}
          </div>

          {/* Hiring Employer Snapshot */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              Opportunity Metadata
            </h3>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Hiring Partner:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {internship.hiringPartner || "Enterprise Placement Partner"}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Application Deadline:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {internship.deadline || "Open Until Filled"}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Framework Alignment:</span>
                <span className="font-semibold text-sky-600 dark:text-sky-400">
                  {internship.nsqfLevel || "NSQF Level 6"}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Minimum Readiness:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {internship.minReadinessScore || 65}/100
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Verification Authority:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  MSDE &amp; AICTE Certified
                </span>
              </div>
            </div>
          </div>

          {/* Helpful Guidance */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 dark:border-sky-900/50 dark:bg-sky-950/20">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-sky-600 dark:text-sky-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-200">
                Need Skill Preparation?
              </h4>
            </div>
            <p className="mt-2 text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
              If your match score is below 80%, access the personalized remediation modules designed to close key gaps before partner interviews.
            </p>
            <div className="mt-3">
              <Link
                to="/learner?tab=remediation"
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
              >
                <span>Go to Learning Path</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. APPLICATION CONFIRMATION MODAL */}
      <AnimatedModal
        isOpen={applicationModalOpen}
        onClose={() => {
          if (!applying) setApplicationModalOpen(false);
        }}
        maxWidth="max-w-lg"
        className="p-6"
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (!applying) setApplicationModalOpen(false);
            }}
            className="absolute right-0 top-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X size={18} />
          </button>

          {applicationSuccess ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="mt-4 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Application Submitted!
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {applicationSuccess.message}
              </p>
              <div className="mt-3 inline-block rounded bg-slate-100 px-3 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Reference: {applicationSuccess.application_id}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 pr-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Confirm Application Submission
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {internship.title} at <strong>{internship.company}</strong>
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs sm:text-sm space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
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
                  <span className="font-bold text-emerald-600">{matchScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Credentials Attached:</span>
                  <span className="text-sky-600 font-semibold">NSQF Diagnostic Certified</span>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Brief Note to Hiring Team (Optional)
                </label>
                <textarea
                  rows={3}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="E.g. I have evaluated competencies in React & REST APIs and am excited to contribute to your engineering team..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <AnimatedButton
                  type="button"
                  onClick={() => setApplicationModalOpen(false)}
                  disabled={applying}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </AnimatedButton>

                <AnimatedButton
                  type="button"
                  onClick={handleApply}
                  disabled={applying}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-sky-500 disabled:opacity-50 cursor-pointer"
                >
                  {applying ? (
                    <span>Dispatching Dossier...</span>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Submit Application</span>
                    </>
                  )}
                </AnimatedButton>
              </div>
            </div>
          )}
        </div>
      </AnimatedModal>
    </PageTransition>
  );
}
