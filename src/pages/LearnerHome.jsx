import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Briefcase,
  Award,
  Sparkles,
  CheckCircle2,
  Target,
  ChevronRight,
  Menu,
  X,
  GraduationCap,
  Building2,
  FileCheck2,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function LearnerHome() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeInteractiveTab, setActiveInteractiveTab] = useState("readiness");
  const [selectedDemoSkill, setSelectedDemoSkill] = useState("powerbi");

  // Key Benefits Data
  const benefits = [
    {
      icon: TrendingUp,
      title: "Track Your Progress",
      tagline: "Monitor your learning journey and readiness.",
      description:
        "Real-time longitudinal milestone tracking from your first day of vocational training through 3-month, 6-month, and 12-month employment retention.",
      highlight: "Longitudinal 3M / 6M / 12M Tracking",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      iconBg: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    },
    {
      icon: BrainCircuit,
      title: "Identify Skill Gaps",
      tagline: "Understand which skills you need to improve.",
      description:
        "AI-driven diagnostic engine compares your current competencies against active industry hiring mandates and provides precision bridge modules.",
      highlight: "Personalized Bridge Modules",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      iconBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    },
    {
      icon: Briefcase,
      title: "Discover Opportunities",
      tagline: "Connect your skills with relevant employment opportunities.",
      description:
        "Explainable multi-signal matching connects your verified qualifications directly with 4,800+ active enterprise and MSME job requirements.",
      highlight: "Direct Employer Dispatch",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    },
    {
      icon: Award,
      title: "Build Career Readiness",
      tagline: "Get insights that help you become job-ready.",
      description:
        "Obtain quantifiable Employment Readiness Index (ERI) scores, NCVET micro-credentials, and verifiable digital portfolios to stand out to recruiters.",
      highlight: "NCVET Digital Credentials",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
      iconBg: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    },
  ];

  // How It Works Steps
  const steps = [
    {
      number: "01",
      title: "Register",
      subtitle: "Create your learner profile.",
      description:
        "Sign up in seconds, link your vocational training center or academic background, and set your target career trajectory.",
      points: [
        "Aadhaar / DigiLocker integration",
        "Target sector & wage preference",
        "PMKK / ITI / University sync",
      ],
      icon: GraduationCap,
    },
    {
      number: "02",
      title: "Build & Assess",
      subtitle: "Track skills, learning progress, and readiness.",
      description:
        "Complete practical lab evaluations, earn verified skill badges, and review real-time feedback on your job readiness score.",
      points: [
        "Diagnostic skill benchmark test",
        "Automatic skill gap identification",
        "Personalized bridge recommendations",
      ],
      icon: Target,
    },
    {
      number: "03",
      title: "Discover Opportunities",
      subtitle: "Identify relevant career and employment opportunities.",
      description:
        "Get automatically matched with verified employer job openings, interview pipelines, and long-term career growth opportunities.",
      points: [
        "Transparent match confidence scores",
        "Direct interview invitations",
        "Longitudinal retention tracking",
      ],
      icon: Briefcase,
    },
  ];

  // Platform Metrics
  const platformStats = [
    { value: "28,450+", label: "Learners Monitored", sub: "Across 42 Districts" },
    { value: "88.4%", label: "3-Month Job Retention", sub: "Verified via EPFO" },
    { value: "4,800+", label: "Live Employer Openings", sub: "Enterprise & MSME" },
    { value: "14 Days", label: "Avg. Placement Cycle", sub: "Post Certification" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 transition-colors duration-150 dark:bg-[#090d16] dark:text-slate-100 dark:selection:bg-blue-950 dark:selection:text-blue-200">
      {/* ========================================================================= */}
      {/* 1. NAVBAR                                                                 */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors duration-150 dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
              title="KaushalNexus Homepage"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs dark:bg-blue-600">
                <ShieldCheck size={20} className="text-blue-400 dark:text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center tracking-tight">
                  <span className="text-base font-extrabold text-slate-950 dark:text-white">
                    KAUSHAL
                  </span>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                    NEXUS
                  </span>
                </div>
                <span className="hidden text-[10px] font-semibold text-slate-500 sm:inline-block dark:text-slate-400">
                  Connecting Skills to Opportunities
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#benefits"
              className="text-xs font-semibold text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              Key Benefits
            </a>
            <a
              href="#how-it-works"
              className="text-xs font-semibold text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              How It Works
            </a>
            <a
              href="#interactive-preview"
              className="text-xs font-semibold text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              Readiness Preview
            </a>
            <a
              href="#impact"
              className="text-xs font-semibold text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              Outcomes
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="group flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.99]"
              >
                <span>Go to Dashboard</span>
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex h-9 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="group flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.99]"
                >
                  <span>Register</span>
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-4 shadow-xl md:hidden dark:border-slate-800 dark:bg-slate-900">
            <nav className="flex flex-col space-y-3">
              <a
                href="#benefits"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              >
                Key Benefits
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              >
                How It Works
              </a>
              <a
                href="#interactive-preview"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              >
                Readiness Preview
              </a>
              <a
                href="#impact"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              >
                Outcomes
              </a>

              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/dashboard");
                    }}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                    >
                      <span>Register</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-blue-50/50 via-slate-50 to-white py-12 sm:py-16 lg:py-20 dark:border-slate-800/80 dark:from-blue-950/20 dark:via-[#090d16] dark:to-[#090d16]">
        {/* Subtle decorative grid lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Content Area (7 columns on lg) */}
            <div className="space-y-6 lg:col-span-7">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-blue-900 shadow-2xs dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
                <span>National Skilling Intelligence & Outcomes Engine</span>
              </div>

              {/* Exact Requested Headline */}
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white">
                Build Your Skills.{" "}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-blue-400">
                  Discover Your Opportunities.
                </span>
              </h1>

              {/* Exact Requested Supporting Text */}
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                KaushalNexus helps learners understand their skill readiness, identify skill
                gaps, track progress, and connect their skills with real employment
                opportunities.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/register"
                  className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-600/15 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 active:scale-[0.99]"
                >
                  <span>Get Started</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  to="/login"
                  className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Login
                </Link>

                <a
                  href="#interactive-preview"
                  className="flex h-11 items-center justify-center gap-1.5 px-4 text-xs font-semibold text-slate-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                >
                  <span>See How It Works</span>
                  <ChevronRight size={14} />
                </a>
              </div>

              {/* Micro Trust Proofs */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-200/80 pt-6 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    <span>NCVET Aligned</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    NSQF Level 4–7 Certified
                  </p>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    <span>EPFO Verified</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Longitudinal Retentions
                  </p>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    <span>Zero Cost</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Free for all Learners
                  </p>
                </div>
              </div>
            </div>

            {/* Right Hero Visual / Abstract Visualization (5 columns on lg) */}
            <div className="lg:col-span-5">
              <div className="relative">
                {/* Subtle outer glow */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20 blur-xl dark:opacity-30" />

                {/* Dashboard-Inspired Abstract Visual Card */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xl transition-all dark:border-slate-800 dark:bg-slate-900">
                  {/* Top Learner Profile Bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 font-bold text-sm text-white shadow-sm">
                        RS
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-950 dark:text-white">
                            Rahul Sharma
                          </h3>
                          <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.2 text-[10px] font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Full Stack Trainee · KN-2026-9812
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Readiness
                      </span>
                      <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                        94%
                      </p>
                    </div>
                  </div>

                  {/* Core Readiness Gauge & Milestone Overview */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Job Fit Score
                        </span>
                        <Target size={13} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                        High Fit (Tier 1)
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-blue-600 dark:bg-blue-400 transition-all duration-1000"
                          style={{ width: "94%" }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Retention Track
                        </span>
                        <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="mt-1 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        3M Confirmed
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                        PF / EPFO Linked
                      </p>
                    </div>
                  </div>

                  {/* Live Skill Breakdown Radar Bar */}
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Assessed Competency Matrix
                      </span>
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                        4 Verified Skills
                      </span>
                    </div>

                    {/* Skill 1 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          React.js & Frontend Architecture
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">96%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: "96%" }}
                        />
                      </div>
                    </div>

                    {/* Skill 2 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Python & API Integrations
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">92%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{ width: "92%" }}
                        />
                      </div>
                    </div>

                    {/* Skill 3 (Bridge Gap) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <span>Docker & Cloud Deployment</span>
                          <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Bridge Recommended
                          </span>
                        </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">72%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: "72%" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Matched Employer Highlight */}
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className="text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Matched: Nexora Technologies
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300">
                            Junior React Engineer · ₹5.2–6.5 LPA
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                        96% Match
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. KEY BENEFITS SECTION                                                   */}
      {/* ========================================================================= */}
      <section id="benefits" className="py-14 sm:py-18 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              Why KaushalNexus
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl dark:text-white">
              Everything You Need to Advance Your Career
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
              Designed to transform vocational and academic learners into in-demand, verified
              professionals equipped for high-growth sectors.
            </p>
          </div>

          {/* 4 Feature Cards */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
                >
                  <div>
                    {/* Icon & Badge */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${benefit.iconBg} transition-transform group-hover:scale-105`}
                      >
                        <Icon size={22} strokeWidth={2.2} />
                      </div>
                    </div>

                    <h3 className="mt-5 text-base font-bold text-slate-950 dark:text-white">
                      {benefit.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {benefit.tagline}
                    </p>
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {benefit.description}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${benefit.badgeColor}`}
                    >
                      {benefit.highlight}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS SECTION                                                   */}
      {/* ========================================================================= */}
      <section
        id="how-it-works"
        className="border-y border-slate-200/80 bg-slate-100/60 py-14 sm:py-18 lg:py-20 dark:border-slate-800/80 dark:bg-slate-900/50"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              Simple 3-Step Process
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl dark:text-white">
              How KaushalNexus Works for You
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
              A transparent, outcome-oriented workflow connecting your learning milestones to
              retained career employment.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7"
                >
                  {/* Step Number & Icon */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-blue-600/30 dark:text-blue-400/30">
                      {step.number}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <Icon size={20} />
                    </div>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
                    {idx + 1}. {step.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {step.subtitle}
                  </p>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>

                  <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {step.points.map((pt) => (
                      <div
                        key={pt}
                        className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        <Check size={14} className="text-emerald-500 shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <span>Begin Step 1: Create Free Account</span>
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE LEARNER READINESS & SIMULATOR SHOWCASE                      */}
      {/* ========================================================================= */}
      <section id="interactive-preview" className="py-14 sm:py-18 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              Interactive Showcase
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl dark:text-white">
              Experience the Learner Intelligence Suite
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
              See how KaushalNexus diagnoses gaps, benchmarks readiness, and generates matched
              interview pipelines in real time.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="mt-8 flex justify-center">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setActiveInteractiveTab("readiness")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  activeInteractiveTab === "readiness"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Target size={14} />
                <span>Skill Gap Simulator</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInteractiveTab("passport")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  activeInteractiveTab === "passport"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <FileCheck2 size={14} />
                <span>Digital Credential Passport</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInteractiveTab("jobs")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  activeInteractiveTab === "jobs"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Briefcase size={14} />
                <span>Live Matching Feed</span>
              </button>
            </div>
          </div>

          {/* Interactive Card Display */}
          <div className="mt-8">
            {activeInteractiveTab === "readiness" && (
              <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                <div className="grid gap-6 md:grid-cols-12 md:items-center">
                  <div className="space-y-4 md:col-span-6">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      <Sparkles size={12} />
                      <span>Interactive Readiness Booster</span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-950 dark:text-white">
                      Target Role: Junior Data Engineer
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Select a bridge upskilling track below to simulate how completing verified
                      coursework elevates your overall Job Readiness Index and opening matches.
                    </p>

                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDemoSkill("powerbi")}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                          selectedDemoSkill === "powerbi"
                            ? "border-blue-500 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/40"
                            : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Power BI & Executive Dashboarding (15 hrs)
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Required in 82% of regional analytics mandates
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          +12% Boost
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDemoSkill("cloud")}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                          selectedDemoSkill === "cloud"
                            ? "border-blue-500 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/40"
                            : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            AWS Cloud & SQL Data Pipelines (20 hrs)
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Preferred in 65% of enterprise roles
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          +18% Boost
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Simulator Outcome Display */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/60 md:col-span-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Projected Readiness
                      </span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                        Tier 1 Recruiter Priority
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                        {selectedDemoSkill === "powerbi" ? "96%" : "98%"}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        (Up from 84% baseline)
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300">
                          Direct Employer Matches Unlocked:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedDemoSkill === "powerbi" ? "8 Openings" : "12 Openings"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300">
                          Projected Starting Wage:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹5.4 – 7.2 LPA
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/register"
                      className="mt-5 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                    >
                      <span>Unlock My Personal Career Path</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {activeInteractiveTab === "passport" && (
              <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-blue-600">
                      <Award size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        NCVET Digital Skill Passport
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Digitally Verified · National QR Verification
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 size={13} />
                    Verified Credential
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Credential ID
                    </span>
                    <p className="mt-0.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      NCVET-2026-89421
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      NSQF Qualification
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">
                      Level 6 · Web Engineering
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Assessment Grade
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Grade A+ (94.2%)
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Shareable directly with LinkedIn, PMKVY portals, and hiring recruiters.
                  </span>
                  <Link
                    to="/register"
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <span>Claim Your Digital Passport</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            )}

            {activeInteractiveTab === "jobs" && (
              <div className="mx-auto max-w-4xl space-y-3">
                {[
                  {
                    title: "Associate Full Stack React Developer",
                    company: "Nexora Technologies",
                    location: "Noida / Hybrid",
                    wage: "₹5.5–6.8 LPA",
                    match: "96% Match",
                    skills: ["React.js", "Tailwind CSS", "Node.js API"],
                  },
                  {
                    title: "Junior Data Analyst & BI Specialist",
                    company: "TechNova Solutions",
                    location: "Gurugram / Onsite",
                    wage: "₹4.8–6.0 LPA",
                    match: "92% Match",
                    skills: ["SQL", "Power BI", "Python"],
                  },
                  {
                    title: "Solar PV Technical Associate",
                    company: "SunGrid Energy Systems",
                    location: "Varanasi / Field",
                    wage: "₹4.2–5.4 LPA",
                    match: "88% Match",
                    skills: ["Grid Systems", "Diagnostics", "SCADA"],
                  },
                ].map((job) => (
                  <div
                    key={job.title}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700 gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-950 dark:text-white">
                          {job.title}
                        </h4>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                          {job.match}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {job.company} · {job.location} · {job.wage}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.skills.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Link
                      to="/register"
                      className="shrink-0 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <span>Apply with Profile</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. NATIONAL IMPACT & STATS BAR                                            */}
      {/* ========================================================================= */}
      <section id="impact" className="border-t border-slate-200/80 bg-slate-900 py-12 text-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {platformStats.map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <p className="font-mono text-3xl font-extrabold text-blue-400 sm:text-4xl tabular-nums">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{stat.label}</p>
                <p className="text-xs text-slate-400">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FINAL PROMINENT CTA                                                     */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-b from-blue-50/80 to-white p-8 shadow-xl sm:p-12 lg:p-16 dark:border-blue-900/40 dark:from-blue-950/40 dark:to-slate-900">
            <span className="inline-block rounded-full border border-blue-200 bg-blue-100/70 px-3 py-1 text-xs font-bold text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Start Your Skilling Journey Today
            </span>

            {/* Exact Requested CTA Headline */}
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl dark:text-white">
              Ready to take the next step in your career?
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
              Join thousands of learners discovering their true potential, closing skill gaps,
              and unlocking verified career opportunities across India.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {/* Exact Requested Button */}
              <Link
                to="/register"
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.99] sm:w-auto"
              >
                <span>Create Learner Account</span>
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>

            {/* Exact Requested Secondary Text */}
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200/80 bg-white py-12 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand column */}
            <div className="space-y-3 lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-blue-600">
                  <ShieldCheck size={18} className="text-blue-400 dark:text-white" />
                </div>
                <div className="flex items-center tracking-tight">
                  <span className="text-sm font-extrabold text-slate-950 dark:text-white">
                    KAUSHAL
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    NEXUS
                  </span>
                </div>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                National Skilling & Longitudinal Employment Platform. Developed under the
                framework of the Ministry of Skill Development & Entrepreneurship (MSDE).
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>NCVET / PMKVY 4.0 / EPFO Longitudinal Data Standards</span>
              </div>
            </div>

            {/* Links 1 */}
            <div className="space-y-2.5">
              <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                For Learners
              </p>
              <ul className="space-y-2">
                <li>
                  <Link to="/register" className="hover:text-blue-600 dark:hover:text-blue-400">
                    Create Free Profile
                  </Link>
                </li>
                <li>
                  <a href="#benefits" className="hover:text-blue-600 dark:hover:text-blue-400">
                    Skill Gap Diagnostic
                  </a>
                </li>
                <li>
                  <a
                    href="#interactive-preview"
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Digital Skill Passport
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-blue-600 dark:hover:text-blue-400">
                    Learner Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Links 2 */}
            <div className="space-y-2.5">
              <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Platform Modules
              </p>
              <ul className="space-y-2">
                <li>
                  <Link to="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">
                    Impact & Outcomes
                  </Link>
                </li>
                <li>
                  <Link to="/learner" className="hover:text-blue-600 dark:hover:text-blue-400">
                    Learner 360° Intelligence
                  </Link>
                </li>
                <li>
                  <Link to="/skill-gap" className="hover:text-blue-600 dark:hover:text-blue-400">
                    Regional Skill Gaps
                  </Link>
                </li>
                <li>
                  <Link to="/matching" className="hover:text-blue-600 dark:hover:text-blue-400">
                    Employer Matching Engine
                  </Link>
                </li>
              </ul>
            </div>

            {/* Links 3 */}
            <div className="space-y-2.5">
              <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Institutional Access
              </p>
              <ul className="space-y-2">
                <li>
                  <Link to="/login" className="hover:text-blue-600 dark:hover:text-blue-400">
                    Ministry (MSDE) Portal
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-blue-600 dark:hover:text-blue-400">
                    State Skill Mission (SDM)
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-blue-600 dark:hover:text-blue-400">
                    PMKK Training Centers
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-blue-600 dark:hover:text-blue-400">
                    Corporate Hiring Mandates
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between border-t border-slate-200/80 pt-6 sm:flex-row dark:border-slate-800">
            <p>© 2026 KaushalNexus · National Skilling & Longitudinal Employment Platform. All rights reserved.</p>
            <p className="mt-2 text-[11px] sm:mt-0">
              Official Platform · Compliant with Digital Personal Data Protection (DPDP) Act
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
