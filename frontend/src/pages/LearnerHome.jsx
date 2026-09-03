import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  TrendingUp,
  BrainCircuit,
  MapPin,
  Briefcase,
  Award,
  GraduationCap,
  Target,
  Activity,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Menu,
  X,
  ExternalLink,
  Lock,
  FileText,
  Check,
  Cpu,
  Layers,
  Network,
  Database,
  Users,
  BarChart3,
  Quote,
  Clock,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import MetroHero from "@/components/ui/scroll-locked-video-hero";
import InstitutionalBadge from "../components/InstitutionalBadge";
import PipelineVisualizer from "../components/PipelineVisualizer";
import PlatformSuitePreview from "../components/PlatformSuitePreview";
import TechStatCard from "../components/TechStatCard";

export default function LearnerHome() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);

  // Interactive Simulator State (Existing Functional Simulator)
  const [activeInteractiveTab, setActiveInteractiveTab] = useState("readiness");
  const [selectedDemoSkill, setSelectedDemoSkill] = useState("powerbi");

  // Demo Skill Data for Simulator
  const demoSkills = {
    powerbi: {
      name: "Power BI & Data Visualization",
      code: "NOS-IT-9821",
      level: "NSQF Level 5",
      readiness: 94,
      status: "High Fit (Tier 1)",
      missingGap: "DAX Time-Intelligence Functions",
      prescribedBridge: "Advanced DAX & Tabular Modeling (12 Hours)",
      startingSalary: "₹26,000 / mo",
      sixMonthProjection: "₹34,000 / mo",
    },
    python: {
      name: "Python for Data Engineering",
      code: "NOS-CS-4410",
      level: "NSQF Level 6",
      readiness: 88,
      status: "Job Ready (Tier 1)",
      missingGap: "Asyncio & Distributed Task Queues",
      prescribedBridge: "Celery & Async Microservices (16 Hours)",
      startingSalary: "₹32,000 / mo",
      sixMonthProjection: "₹45,000 / mo",
    },
    digital: {
      name: "Performance Marketing Analytics",
      code: "NOS-MK-1205",
      level: "NSQF Level 4",
      readiness: 82,
      status: "Placed / Retained",
      missingGap: "Meta CAPI Server-Side Tracking",
      prescribedBridge: "Conversion API & GTM Server Container (8 Hours)",
      startingSalary: "₹22,500 / mo",
      sixMonthProjection: "₹29,000 / mo",
    },
    cad: {
      name: "AutoCAD & BIM Modeling",
      code: "NOS-ME-7734",
      level: "NSQF Level 5",
      readiness: 91,
      status: "High Fit (Tier 1)",
      missingGap: "Revit Parametric Family Creation",
      prescribedBridge: "Advanced BIM Coordination (14 Hours)",
      startingSalary: "₹24,000 / mo",
      sixMonthProjection: "₹31,500 / mo",
    },
    cnc: {
      name: "CNC Milling & Precision Machining",
      code: "NOS-MF-3390",
      level: "NSQF Level 4",
      readiness: 86,
      status: "Job Ready (Tier 1)",
      missingGap: "Multi-Axis G-Code Optimization",
      prescribedBridge: "Mastercam 5-Axis Toolpath Scripting (20 Hours)",
      startingSalary: "₹21,000 / mo",
      sixMonthProjection: "₹27,500 / mo",
    },
  };

  const currentSkill = demoSkills[selectedDemoSkill] || demoSkills.powerbi;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070d18] text-slate-900 dark:text-[#f1f5f9] selection:bg-sky-500/20 selection:text-sky-500 font-sans antialiased transition-colors duration-150">
      {/* ========================================================================= */}
      {/* 1. FIXED INSTITUTIONAL HEADER NAVIGATION                                  */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 h-20 border-b border-slate-200 dark:border-[#1e293b] bg-white/90 dark:bg-[#070d18]/90 backdrop-blur-md transition-colors duration-150">
        <div className="mx-auto flex h-full max-w-[1728px] items-center justify-between px-6 lg:px-12">
          {/* Brand Emblem & Title */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 p-1 group-hover:border-sky-400 transition-colors glow-cyan">
              <ShieldCheck size={24} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-xl tracking-tight text-slate-900 dark:text-[#f8fafc]">
                  Kaushal<span className="text-sky-600 dark:text-sky-400">Nexus</span>
                </span>
                <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Govt &amp; Enterprise
                </span>
              </div>
              <span className="hidden sm:inline-block font-mono text-[11px] text-slate-500 dark:text-[#94a3b8] tracking-tight">
                National Skill Intelligence Layer // Govt. &amp; Enterprise Interface
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-8 h-full font-sans text-sm">
            <a
              href="#learner-intelligence"
              className="text-slate-600 hover:text-sky-600 dark:text-[#cbd5e1] dark:hover:text-sky-400 font-medium py-7 transition-colors flex items-center gap-1.5"
            >
              <Users size={16} className="text-sky-600 dark:text-sky-400" />
              <span>Learner Intelligence</span>
            </a>
            <a
              href="#skill-gap"
              className="text-slate-600 hover:text-sky-600 dark:text-[#cbd5e1] dark:hover:text-sky-400 font-medium py-7 transition-colors flex items-center gap-1.5"
            >
              <BrainCircuit size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Skill Gap Matrix</span>
            </a>
            <a
              href="#regional"
              className="text-slate-600 hover:text-sky-600 dark:text-[#cbd5e1] dark:hover:text-sky-400 font-medium py-7 transition-colors flex items-center gap-1.5"
            >
              <MapPin size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>Regional Analytics</span>
            </a>
            <a
              href="#employers"
              className="text-slate-600 hover:text-sky-600 dark:text-[#cbd5e1] dark:hover:text-sky-400 font-medium py-7 transition-colors flex items-center gap-1.5"
            >
              <Briefcase size={16} className="text-amber-600 dark:text-amber-400" />
              <span>Employer Network</span>
            </a>
            <a
              href="#architecture"
              className="text-slate-600 hover:text-sky-600 dark:text-[#cbd5e1] dark:hover:text-sky-400 font-medium py-7 transition-colors flex items-center gap-1.5"
            >
              <Cpu size={16} className="text-sky-600 dark:text-sky-400" />
              <span>AI Architecture</span>
            </a>
            <a
              href="#interactive-preview"
              className="text-slate-600 hover:text-sky-600 dark:text-[#cbd5e1] dark:hover:text-sky-400 font-medium py-7 transition-colors flex items-center gap-1.5"
            >
              <Target size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>Diagnostic Sandbox</span>
            </a>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-3 font-sans">
            <ThemeToggle />

            {/* Video Hero Experience Trigger */}
            <button
              type="button"
              onClick={() => setIsExperienceModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-sky-400 hover:text-white px-3 py-2 rounded-lg border border-sky-500/30 bg-sky-950/40 hover:bg-sky-900/60 transition-all cursor-pointer"
            >
              <Sparkles size={13} className="text-sky-400" />
              <span>Cinematic Story</span>
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 px-4 py-2 text-xs font-bold font-sans uppercase tracking-wider transition-all glow-cyan cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <Lock size={13} />
                  <span>Portal Login</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-sky-400 hover:bg-sky-300 text-slate-950 px-4 py-2 rounded-lg shadow-sm transition-all glow-cyan"
                >
                  <span>Explore Platform</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className="xl:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-b border-[#1e293b] bg-[#070d18]/95 px-6 py-5 shadow-2xl backdrop-blur-md">
            <nav className="flex flex-col space-y-3 font-mono text-xs">
              <a
                href="#learner-intelligence"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-1.5 text-slate-300 hover:text-sky-400"
              >
                <Users size={14} className="text-sky-400" />
                <span>Learner Intelligence</span>
              </a>
              <a
                href="#skill-gap"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-1.5 text-slate-300 hover:text-sky-400"
              >
                <BrainCircuit size={14} className="text-indigo-400" />
                <span>Skill Gap Matrix</span>
              </a>
              <a
                href="#regional"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-1.5 text-slate-300 hover:text-sky-400"
              >
                <MapPin size={14} className="text-emerald-400" />
                <span>Regional Analytics</span>
              </a>
              <a
                href="#employers"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-1.5 text-slate-300 hover:text-sky-400"
              >
                <Briefcase size={14} className="text-amber-400" />
                <span>Employer Network</span>
              </a>
              <a
                href="#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-1.5 text-slate-300 hover:text-sky-400"
              >
                <Cpu size={14} className="text-sky-400" />
                <span>AI Architecture</span>
              </a>
              <a
                href="#interactive-preview"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-1.5 text-slate-300 hover:text-sky-400"
              >
                <Target size={14} className="text-emerald-400" />
                <span>Readiness Simulator</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsExperienceModalOpen(true);
                }}
                className="flex items-center gap-2 py-1.5 text-sky-400 font-bold"
              >
                <Sparkles size={14} />
                <span>Interactive Cinematic Story</span>
              </button>

              <div className="border-t border-[#1e293b] pt-4 flex flex-col gap-2">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-10 items-center justify-center rounded-lg bg-sky-400 font-sans font-bold text-slate-950 uppercase tracking-wider text-xs"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-xs uppercase tracking-wider"
                    >
                      Login to Portal
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-10 items-center justify-center rounded-lg bg-sky-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
                    >
                      Create Free Account
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Body */}
      <main className="max-w-[1728px] mx-auto mt-20">
        {/* ========================================================================= */}
        {/* 2. HIGH-IMPACT HERO SECTION                                               */}
        {/* ========================================================================= */}
        <section className="pt-16 pb-20 px-6 lg:px-12 relative overflow-hidden grid-pattern">
          <div className="max-w-[1516px] mx-auto">
            {/* Top Institutional Status Pill */}
            <div className="mb-8">
              <InstitutionalBadge
                label="AI-POWERED WORKFORCE & VOCATIONAL INTELLIGENCE PLATFORM"
                secondaryText="NCVET & NSDC ALIGNED DATA STANDARDS"
                variant="cyan"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12">
              {/* Left Column: Headline & Value Proposition */}
              <div className="lg:col-span-8 space-y-6">
                <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.08]">
                  Bridging Skills to <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 dark:from-sky-400 dark:via-sky-300 dark:to-indigo-400 bg-clip-text text-transparent">
                    National Opportunities
                  </span>
                </h1>

                <p className="font-body text-slate-600 dark:text-slate-300 text-base sm:text-xl max-w-3xl leading-relaxed">
                  KaushalNexus is India's sovereign workforce intelligence platform. We track
                  learners from vocational enrollment through verified 3-month, 6-month, and
                  12-month employment retention, wage progression, and localized skill gap
                  remediation.
                </p>

                {/* Hero CTAs */}
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 px-6 py-3.5 text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all glow-cyan"
                  >
                    <span>Get Started</span>
                    <ArrowRight size={16} />
                  </Link>

                  <a
                    href="#pipeline"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b1528] hover:bg-slate-50 dark:hover:bg-[#0f1c33] text-slate-800 dark:text-white px-6 py-3.5 text-xs sm:text-sm font-heading font-semibold transition-all shadow-xs dark:shadow-none"
                  >
                    <span>Explore Data Pipeline</span>
                    <ChevronRight size={16} className="text-sky-600 dark:text-sky-400" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsExperienceModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-sky-300 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 px-5 py-3.5 text-xs sm:text-sm font-mono font-semibold transition-all cursor-pointer"
                  >
                    <Sparkles size={15} className="text-sky-600 dark:text-sky-400" />
                    <span>Cinematic Story</span>
                  </button>
                </div>

                {/* Micro Trust Proofs */}
                <div className="grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-[#1e293b] pt-6 max-w-2xl">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                      <span>NCVET Aligned</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      NSQF Level 4–7 Standards
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                      <span>EPFO Sandbox</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Retention Tracking
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                      <span>DPDP Ready</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Consent-Governed Data
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: High-Density Candidate Telemetry Card */}
              <div className="lg:col-span-4">
                <div className="relative rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0b1528] p-5 shadow-xl dark:shadow-2xl glow-cyan">
                  {/* Simulation Disclaimer Label */}
                  <div className="mb-3.5 flex items-center justify-between border-b border-slate-200 dark:border-[#1e293b]/80 pb-2.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-400/20 px-2 py-0.5 rounded">
                      SAMPLE CANDIDATE DOSSIER · SIMULATION
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      SYNTHETIC DEMO
                    </span>
                  </div>

                  {/* Top Learner Profile Bar */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e293b] pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 font-mono font-bold text-sm text-slate-950 shadow-sm">
                        RS
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                            Rahul Sharma
                          </h3>
                          <span className="flex items-center gap-1 rounded-full border border-sky-300 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 text-[10px] font-mono text-sky-700 dark:text-sky-300">
                            Sample Profile
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          Data Analytics Trainee · KN-2026-9812
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Readiness
                      </span>
                      <p className="font-mono text-base font-extrabold text-sky-600 dark:text-sky-400">
                        94%
                      </p>
                    </div>
                  </div>

                  {/* Core Readiness Gauge & Milestone Overview */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#070d18] p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                          Job Fit Score
                        </span>
                        <Target size={13} className="text-sky-600 dark:text-sky-400" />
                      </div>
                      <p className="mt-1 font-heading text-sm font-extrabold text-slate-900 dark:text-white">
                        Tier 1 High-Fit
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#1e293b]">
                        <div
                          className="h-full rounded-full bg-sky-500 dark:bg-sky-400"
                          style={{ width: "94%" }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#070d18] p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                          Retention Check
                        </span>
                        <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="mt-1 font-heading text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        3M Confirmed
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        EPFO Sandbox Simulated
                      </p>
                    </div>
                  </div>

                  {/* Skills Snapshot */}
                  <div className="mt-4 space-y-2 border-t border-slate-200 dark:border-[#1e293b] pt-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-600 dark:text-slate-400">Power BI &amp; SQL</span>
                      <span className="text-sky-600 dark:text-sky-400 font-semibold">96% Competency</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-600 dark:text-slate-400">DAX Modeling (Bridge)</span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">Completed</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-600 dark:text-slate-400">Placement Salary</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">₹28,500/mo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. HERO DATA & AI FLOW VISUALIZATION (PipelineVisualizer)                 */}
        {/* ========================================================================= */}
        <section id="pipeline" className="py-16 px-6 lg:px-12 border-t border-[#1e293b] bg-[#060c18] relative">
          <div className="max-w-[1516px] mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <InstitutionalBadge
                label="SOVEREIGN SKILL DATA PIPELINE"
                secondaryText="END-TO-END TELEMETRY ARCHITECTURE"
                variant="cyan"
              />
              <h2 className="mt-4 font-heading text-2xl sm:text-4xl font-extrabold text-[#f8fafc] tracking-tight">
                Live National Skill Intelligence Flow
              </h2>
              <p className="mt-2 font-body text-[#cbd5e1] text-sm sm:text-base">
                Click across the 5 processing phases below to inspect data ingestion protocols,
                ontological alignment, and verifiable outcome auditing.
              </p>
            </div>

            <PipelineVisualizer />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. THE NATIONAL SKILL INTELLIGENCE ARCHITECTURE (How It Works)            */}
        {/* ========================================================================= */}
        <section id="how-it-works" className="py-20 px-6 lg:px-12 border-t border-[#1e293b] bg-[#070d18]">
          <div className="max-w-[1516px] mx-auto">
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 font-mono text-xs text-sky-400 uppercase tracking-wider mb-2">
                <Layers size={14} />
                <span>Architecture Workflow</span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#f8fafc] tracking-tight">
                The National Skill Intelligence Architecture
              </h2>
              <p className="mt-2 text-[#cbd5e1] text-sm sm:text-base max-w-2xl">
                A structured, outcome-oriented workflow connecting raw vocational enrollment records
                to verifiable long-term employment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  step: "01",
                  title: "Learner Ingestion",
                  icon: Database,
                  desc: "Automated ingestion from Skill India Digital (SID), ITIs, polytechnics, and State Missions with DPDP consent masking.",
                  tag: "Federated Ingestion",
                },
                {
                  step: "02",
                  title: "Skill Analysis",
                  icon: Network,
                  desc: "Taxonomy normalization mapping regional curricula directly to NCVET National Occupational Standards (NOS).",
                  tag: "NCVET Alignment",
                },
                {
                  step: "03",
                  title: "Skill Gap Detection",
                  icon: BrainCircuit,
                  desc: "Machine learning models detect localized skill shortages, prescribing tailored bridge modules before placement.",
                  tag: "Bottleneck Analysis",
                },
                {
                  step: "04",
                  title: "Employment Match",
                  icon: Briefcase,
                  desc: "Explainable multi-objective matching routes job-ready candidates to verified corporate & MSME hiring mandates.",
                  tag: "High-Fit Routing",
                },
                {
                  step: "05",
                  title: "Outcome Tracking",
                  icon: ShieldCheck,
                  desc: "Longitudinal 3M, 6M, and 12M employment verification via EPFO/UAN sandbox adapters and wage tracking.",
                  tag: "Longitudinal Check",
                },
              ].map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-5 transition-all hover:border-slate-700 hover:bg-[#0f1c33]"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-2xl font-black text-sky-400/40">
                          {item.step}
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-400/20">
                          <ItemIcon size={16} />
                        </div>
                      </div>

                      <h3 className="font-heading text-base font-bold text-[#f8fafc] mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#cbd5e1] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1e293b]">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-sky-400">
                        {item.tag}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. CORE PLATFORM SUITES (PlatformSuitePreview)                            */}
        {/* ========================================================================= */}
        <section id="learner-intelligence" className="py-20 px-6 lg:px-12 border-t border-[#1e293b] bg-[#060c18]">
          <div className="max-w-[1516px] mx-auto">
            <div className="mb-10">
              <InstitutionalBadge
                label="ENTERPRISE INTELLIGENCE SUITES"
                secondaryText="ACCESSIBLE VIA AUTHORIZED PORTAL"
                variant="cyan"
              />
              <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold text-[#f8fafc] tracking-tight">
                Core Platform Suites
              </h2>
              <p className="mt-2 text-[#cbd5e1] text-sm sm:text-base max-w-2xl">
                Explore dedicated analytical workspaces for government administrators, training
                providers, and enterprise employers.
              </p>
            </div>

            <PlatformSuitePreview onLaunchSuite={(route) => navigate(route)} />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. INTERACTIVE CANDIDATE READINESS & GAP SIMULATOR (Preserved Functional) */}
        {/* ========================================================================= */}
        <section id="interactive-preview" className="py-20 px-6 lg:px-12 border-t border-[#1e293b] bg-[#070d18]">
          <div className="max-w-[1516px] mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <InstitutionalBadge
                label="LIVE INTERACTIVE SIMULATOR"
                secondaryText="TEST CANDIDATE READINESS & GAP DIAGNOSTICS"
                variant="emerald"
              />
              <h2 className="mt-3 font-heading text-2xl sm:text-4xl font-extrabold text-[#f8fafc] tracking-tight">
                Experience the Candidate Diagnostic Engine
              </h2>
              <p className="mt-2 text-[#cbd5e1] text-xs sm:text-sm">
                Select a vocation below to simulate real-time readiness scoring, gap detection,
                prescribed bridge modules, and post-training salary trajectory.
              </p>
            </div>

            {/* Simulator Interactive Box */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0b1528] p-6 lg:p-8 shadow-2xl">
              {/* Domain Switcher Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 pb-6 border-b border-[#1e293b]">
                {Object.entries(demoSkills).map(([key, skill]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDemoSkill(key)}
                    className={`rounded-xl px-3.5 py-2 font-mono text-xs font-semibold transition-all cursor-pointer ${
                      selectedDemoSkill === key
                        ? "bg-sky-400 text-slate-950 shadow-md glow-cyan"
                        : "border border-[#1e293b] bg-[#070d18] text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>

              {/* Simulator Metrics Display */}
              <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-12 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded bg-sky-500/10 border border-sky-400/20 px-2 py-0.5 text-sky-400">
                      {currentSkill.code}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-[#cbd5e1]">{currentSkill.level}</span>
                  </div>

                  <h3 className="font-heading text-2xl font-bold text-[#f8fafc]">
                    {currentSkill.name}
                  </h3>

                  <div className="rounded-xl border border-[#1e293b] bg-[#070d18] p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[#cbd5e1]">Detected Skill Gap:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {currentSkill.missingGap}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[#cbd5e1]">Prescribed Bridge:</span>
                      <span className="font-mono font-bold text-sky-400">
                        {currentSkill.prescribedBridge}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-xl border border-[#1e293b] bg-[#070d18] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase text-[#cbd5e1]">
                      Simulated Readiness Score
                    </span>
                    <span className="font-mono text-lg font-extrabold text-emerald-400">
                      {currentSkill.readiness}%
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#1e293b]">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                      style={{ width: `${currentSkill.readiness}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1e293b]">
                    <div>
                      <span className="font-mono text-[10px] uppercase text-[#94a3b8]">
                        Baseline Placement
                      </span>
                      <p className="font-mono text-sm font-bold text-[#f8fafc]">
                        {currentSkill.startingSalary}
                      </p>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase text-[#94a3b8]">
                        6M Retention Wage
                      </span>
                      <p className="font-mono text-sm font-bold text-emerald-400">
                        {currentSkill.sixMonthProjection}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. AI INTELLIGENCE ARCHITECTURE SECTION                                   */}
        {/* ========================================================================= */}
        <section id="architecture" className="py-20 px-6 lg:px-12 border-t border-[#1e293b] bg-[#060c18]">
          <div className="max-w-[1516px] mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <InstitutionalBadge
                label="SOVEREIGN AI FOUNDATION"
                secondaryText="INFERENCE &amp; CRYPTOGRAPHIC VERIFICATION"
                variant="indigo"
              />
              <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold text-[#f8fafc] tracking-tight">
                How KaushalNexus AI Transforms Raw Data into National Impact
              </h2>
              <p className="mt-2 text-[#cbd5e1] text-sm sm:text-base">
                State-of-the-art representation learning, verifiable cryptography, and real-time
                inference built for sovereign scale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Dynamic Skill Ontology",
                  icon: Network,
                  color: "sky",
                  desc: "Harmonizes regional vocational curricula against NCVET National Occupational Standards (NOS) and Qualification Packs (QP) via vector embeddings.",
                  codeSnippet: "ontology.map(curriculum_id, standards=['NCVET-NOS-2026'])",
                },
                {
                  title: "Predictive Demand Forecasting",
                  icon: BarChart3,
                  color: "emerald",
                  desc: "Ingests live enterprise hiring mandates and regional labor signals to forecast high-demand skills 6 months ahead.",
                  codeSnippet: "demand_forecaster.predict(district_id, horizon_months=6)",
                },
                {
                  title: "Verifiable Credential Cryptography",
                  icon: ShieldCheck,
                  color: "amber",
                  desc: "Issues tamper-proof verifiable digital credentials for completed bridge courses with consent-governed Aadhaar & UAN tokenization.",
                  codeSnippet: "credentials.issue(did_subject, standard='W3C-VC-v2.0')",
                },
              ].map((arch) => {
                const ArchIcon = arch.icon;
                return (
                  <div
                    key={arch.title}
                    className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-6 hover:border-slate-700 hover:bg-[#0f1c33] transition-all"
                  >
                    <div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-400/20 text-sky-400 mb-4">
                        <ArchIcon size={20} />
                      </div>
                      <h3 className="font-heading text-lg font-bold text-[#f8fafc] mb-2">
                        {arch.title}
                      </h3>
                      <p className="text-xs text-[#cbd5e1] leading-relaxed mb-4">
                        {arch.desc}
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#1e293b] bg-[#070d18] p-2.5 font-mono text-[11px] text-sky-400/90 truncate">
                      {arch.codeSnippet}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 8. IMPACT METRICS GRID                                                    */}
        {/* ========================================================================= */}
        <section id="impact" className="py-20 px-6 lg:px-12 border-t border-[#1e293b] bg-[#080e1a]">
          <div className="max-w-[1516px] mx-auto">
            <div className="mb-10">
              <InstitutionalBadge
                label="DATABASE BENCHMARK METRICS"
                secondaryText="POSTGRESQL AUDITED DATASET"
                variant="emerald"
              />
              <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold text-[#f8fafc] tracking-tight">
                Demonstration Cohort Outcomes
              </h2>
              <p className="mt-2 text-[#cbd5e1] text-sm max-w-2xl">
                Real longitudinal indicators tracking post-placement retention, wage growth, and
                verified employment outcomes from the KaushalNexus database.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <TechStatCard
                title="Demonstration Cohort"
                value="1,342"
                subtitle="Synthetic Trainees in Demonstration Dataset"
                trend="+14.2% MoM"
                trendDirection="up"
                icon={Users}
                variant="cyan"
                footerText="Direct SQL Aggregate from PostgreSQL DB"
              />
              <TechStatCard
                title="Milestone Retention"
                value="18.4%"
                subtitle="Longitudinal Retention Tracked (180-Day)"
                trend="81 Verified"
                trendDirection="up"
                icon={ShieldCheck}
                variant="emerald"
                footerText="EPFO Integration Sandbox Adapter"
              />
              <TechStatCard
                title="Active Mandates"
                value="622"
                subtitle="Enterprise & MSME Openings in DB"
                trend="+22% new"
                trendDirection="up"
                icon={Briefcase}
                variant="amber"
                footerText="100% Wage Floor Gated in Matching Engine"
              />
              <TechStatCard
                title="Wage Progression"
                value="+8.0%"
                subtitle="Median Growth Across 308 Placements"
                trend="₹4.47L → ₹4.60L avg"
                trendDirection="up"
                icon={TrendingUp}
                variant="indigo"
                footerText="Longitudinal CTC Delta Audited"
              />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 9. STAKEHOLDER PERSONAS & FEEDBACK SCENARIOS                              */}
        {/* ========================================================================= */}
        <section id="testimonials" className="py-20 px-6 lg:px-12 border-t border-[#1e293b] bg-[#060c18]">
          <div className="max-w-[1516px] mx-auto">
            <div className="mb-10">
              <InstitutionalBadge
                label="DEMONSTRATION USER PERSONAS"
                secondaryText="ILLUSTRATIVE STAKEHOLDER FEEDBACK MODELS"
                variant="outline"
                pulse={false}
              />
              <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold text-[#f8fafc] tracking-tight">
                Stakeholder Feedback &amp; Usage Scenarios
              </h2>
              <p className="mt-2 text-[#cbd5e1] text-sm max-w-2xl">
                Illustrative user feedback models representing government administrators, corporate employers,
                and evaluation officers interacting with KaushalNexus.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote:
                    "KaushalNexus transitioned our mission workflow from measuring single-day batch completions to monitoring sustained 6-month and 12-month employment retention checkpoints.",
                  author: "State Skill Mission Director Persona",
                  scenario: "Feedback Scenario: Monitoring Multi-District Vocational Milestones",
                  tag: "State Governance",
                },
                {
                  quote:
                    "The ontological skill mapping matches candidates based on verified NCVET competencies rather than generic resumes. Shortlist-to-hire turnaround is substantially faster.",
                  author: "Corporate Talent Acquisition Lead Persona",
                  scenario: "Feedback Scenario: Evaluating Pre-Trained NCVET Candidates",
                  tag: "Enterprise Partner",
                },
                {
                  quote:
                    "For the first time, independent assessors have longitudinal visibility into employment outcomes with complete DPDP-compliant privacy safeguards and verifiable audit logs.",
                  author: "Independent Audit & Evaluation Consultant Persona",
                  scenario: "Feedback Scenario: Verifying 3M/6M/12M Employment Retention",
                  tag: "Evaluation Policy",
                },
              ].map((t, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-xl border border-[#1e293b] bg-[#0b1528] p-6 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <span className="font-mono text-[10px] uppercase text-sky-400 bg-sky-500/10 border border-sky-400/20 px-2 py-0.5 rounded">
                      {t.tag}
                    </span>
                    <p className="mt-4 text-xs sm:text-sm text-[#cbd5e1] leading-relaxed italic">
                      "{t.quote}"
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#1e293b]">
                    <div className="font-heading font-bold text-sm text-[#f8fafc]">
                      {t.author}
                    </div>
                    <div className="font-mono text-[11px] text-[#94a3b8] mt-0.5">
                      {t.scenario}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 10. FINAL CALL TO ACTION                                                  */}
        {/* ========================================================================= */}
        <section id="explore" className="py-24 px-6 lg:px-12 border-t border-slate-200 dark:border-[#1e293b] bg-gradient-to-b from-slate-100 via-white to-slate-100 dark:from-[#070d18] dark:via-[#09152b] dark:to-[#070d18] text-center relative overflow-hidden transition-colors duration-150">
          <div className="max-w-4xl mx-auto relative z-10 space-y-6">
            <InstitutionalBadge
              label="SOVEREIGN SCALE • NATIONAL IMPACT"
              variant="cyan"
            />

            <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-[#f8fafc] tracking-tight leading-tight">
              Empowering India's Demographic Dividend. Built for Scale.
            </h2>

            <p className="font-body text-slate-600 dark:text-[#cbd5e1] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Equip your state skill mission, training center, or corporate hiring network with
              sovereign skill analytics, real-time demand matching, and verifiable retention tracking.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 px-8 py-4 rounded-xl font-heading font-bold text-sm transition-all glow-cyan"
              >
                <span>Access National Platform</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-[#0b1528] dark:hover:bg-[#162238] border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-800 dark:text-white px-8 py-4 rounded-xl font-heading font-semibold text-sm transition-all shadow-xs dark:shadow-none"
              >
                <Lock size={16} className="text-sky-600 dark:text-sky-400" />
                <span>Institutional Portal Sign In</span>
              </Link>
            </div>

            <div className="mt-8 font-mono text-xs text-slate-500 dark:text-[#94a3b8] flex items-center justify-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Ready-to-deploy architecture aligned with NCVET &amp; Digital Personal Data Protection Act 2023
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 11. COMPREHENSIVE 6-COLUMN INSTITUTIONAL FOOTER                           */}
        {/* ========================================================================= */}
        <footer className="border-t border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-[#050a12] py-14 px-6 lg:px-12 text-slate-600 dark:text-[#94a3b8] text-xs font-mono transition-colors duration-150">
          <div className="max-w-[1516px] mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
            {/* Col 1: Brand Info */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-400/20 text-sky-600 dark:text-sky-400">
                  <ShieldCheck size={16} />
                </div>
                <span className="font-heading font-bold text-base text-slate-900 dark:text-[#f8fafc]">
                  Kaushal<span className="text-sky-600 dark:text-sky-400">Nexus</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#94a3b8] leading-relaxed font-sans max-w-sm">
                National Skilling &amp; Longitudinal Employment Outcomes Platform. Smart India
                Hackathon (SIH) 2026 Problem Statement 135 Demonstration Prototype.
              </p>
              <div className="text-[10px] text-slate-500 dark:text-[#94a3b8] space-y-0.5">
                <div>Consent Governance: DPDP Act 2023 Sec 4(1)</div>
                <div>Standards Alignment: NCVET QP-NOS Taxonomy</div>
              </div>
            </div>

            {/* Col 2: Core Suites */}
            <div className="space-y-2">
              <span className="text-slate-900 dark:text-[#e2e8f0] font-bold uppercase text-[11px]">Core Suites</span>
              <ul className="space-y-1.5 text-[11px]">
                <li><Link to="/learner" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">Learner 360°</Link></li>
                <li><Link to="/skill-gap" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">Skill Gap Matrix</Link></li>
                <li><Link to="/regional" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">Regional Analytics</Link></li>
                <li><Link to="/matching" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">Employer Matching</Link></li>
                <li><Link to="/dashboard" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">Impact Dashboard</Link></li>
              </ul>
            </div>

            {/* Col 3: Architecture */}
            <div className="space-y-2">
              <span className="text-slate-900 dark:text-[#e2e8f0] font-bold uppercase text-[11px]">Architecture</span>
              <ul className="space-y-1.5 text-[11px]">
                <li><a href="#pipeline" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">5-Stage Pipeline</a></li>
                <li><a href="#architecture" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">Skill Ontology</a></li>
                <li><a href="#architecture" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">Demand Forecasting</a></li>
                <li><a href="#architecture" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">Verifiable Creds</a></li>
                <li><a href="#how-it-works" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">Longitudinal Flow</a></li>
              </ul>
            </div>

            {/* Col 4: Integrations */}
            <div className="space-y-2">
              <span className="text-slate-900 dark:text-[#e2e8f0] font-bold uppercase text-[11px]">Integrations</span>
              <ul className="space-y-1.5 text-[11px]">
                <li><span className="text-slate-600 dark:text-[#94a3b8]">Skill India Digital (SID)</span></li>
                <li><span className="text-slate-600 dark:text-[#94a3b8]">PMKK &amp; ITI Systems</span></li>
                <li><span className="text-slate-600 dark:text-[#94a3b8]">EPFO Sandbox Adapter</span></li>
                <li><span className="text-slate-600 dark:text-[#94a3b8]">DigiLocker Mock Client</span></li>
                <li><span className="text-slate-600 dark:text-[#94a3b8]">Aadhaar Vault / Tokenizer</span></li>
              </ul>
            </div>

            {/* Col 5: Institutional */}
            <div className="space-y-2">
              <span className="text-slate-900 dark:text-[#e2e8f0] font-bold uppercase text-[11px]">Governance</span>
              <ul className="space-y-1.5 text-[11px]">
                <li><Link to="/settings" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">Audit Provenance</Link></li>
                <li><Link to="/settings" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">RBAC Security</Link></li>
                <li><Link to="/login" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">MSDE Officer Login</Link></li>
                <li><Link to="/login" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">State Admin Portal</Link></li>
                <li><a href="/saas-template" className="text-slate-600 hover:text-sky-600 dark:text-[#94a3b8] dark:hover:text-sky-400 transition-colors">21st.dev UI Showcase</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-[#1e293b] pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-[#94a3b8] gap-2">
            <div>© 2026 KaushalNexus · Smart India Hackathon 2026. All rights reserved.</div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
              <span>National Backend Engine Active (FastAPI + PostgreSQL + Celery)</span>
            </div>
          </div>
        </footer>
      </main>

      {/* ========================================================================= */}
      {/* 12. 21st.dev SCROLL-LOCKED VIDEO HERO MODAL                               */}
      {/* ========================================================================= */}
      {isExperienceModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#05070d]">
          <div className="fixed top-5 right-5 z-50">
            <button
              type="button"
              onClick={() => setIsExperienceModalOpen(false)}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-white/20 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <X size={15} />
              <span>Close Experience</span>
            </button>
          </div>
          <MetroHero
            title="KAUSHAL NEXUS"
            tagline="Connecting Verified Skills with National Career Opportunities."
            scrollHint="SCROLL TO SCRUB"
            signature={{ name: "KaushalNexus · SIH 2026", url: "/" }}
            actionLabel="Enter Platform"
            onActionClick={() => setIsExperienceModalOpen(false)}
            unlockOnEnd={false}
          />
        </div>
      )}
    </div>
  );
}
