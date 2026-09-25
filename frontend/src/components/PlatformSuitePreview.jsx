import React, { useState } from "react";
import {
  UserRound,
  BrainCircuit,
  MapPin,
  BriefcaseBusiness,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ExternalLink,
} from "lucide-react";

const DEFAULT_SUITES = [
  {
    id: "learner",
    title: "Learner 360° Intelligence",
    badge: "LONGITUDINAL DOSSIER",
    route: "/learner",
    icon: UserRound,
    accentColor: "sky",
    tagline: "Comprehensive tracking from NCVET training to verified employment.",
    description:
      "Inspect individual candidate transcripts, assessment scores, NCVET QP certifications, bridge course allocations, and verifiable employment checkpoints.",
    keyMetrics: [
      { label: "Demonstration Cohort", value: "1,342" },
      { label: "Avg Readiness Score", value: "72.5%" },
      { label: "Active Consents", value: "100% DPDP" },
    ],
    previewFeatures: [
      "Consent-governed Aadhaar & UAN tokenization",
      "Dynamic candidate readiness scoring (0-100%)",
      "Bridge module prescription for competency bottlenecks",
    ],
  },
  {
    id: "skill-gap",
    title: "Skill Gap Matrix",
    badge: "DIAGNOSTIC ENGINE",
    route: "/skill-gap",
    icon: BrainCircuit,
    accentColor: "indigo",
    tagline: "Real-time demand vs. curriculum supply bottleneck detection.",
    description:
      "Identifies regional and industry-specific skill shortages across 32 state missions, recommending targeted bridge curricula before candidate placement failure.",
    keyMetrics: [
      { label: "Monitored Sectors", value: "14 Domains" },
      { label: "Critical Gaps", value: "8 Resolved" },
      { label: "Bridge Modules", value: "24 Active" },
    ],
    previewFeatures: [
      "NCVET Qualification Pack & NOS discrepancy radar",
      "Curriculum revision feedback loop for training centers",
      "Automated bridge course allocation for placed cohorts",
    ],
  },
  {
    id: "regional",
    title: "Regional Intelligence",
    badge: "SPATIAL SATURATION",
    route: "/regional",
    icon: MapPin,
    accentColor: "emerald",
    tagline: "Geospatial labor mobility and district-level placement analytics.",
    description:
      "Aggregates employment outcome trends, inter-state candidate migration corridors, and training center density heatmaps across India.",
    keyMetrics: [
      { label: "Covered States", value: "28 States" },
      { label: "District Clusters", value: "740 Districts" },
      { label: "Mobility Index", value: "0.64 High" },
    ],
    previewFeatures: [
      "District-wise placement vs. vacancy saturation ratios",
      "Inter-district migration corridor tracking",
      "State Skill Mission (SSDM) executive telemetry",
    ],
  },
  {
    id: "matching",
    title: "Employer Network & Matching",
    badge: "ENTERPRISE GATEWAY",
    route: "/matching",
    icon: BriefcaseBusiness,
    accentColor: "amber",
    tagline: "High-fit corporate hiring mandates with EPFO verification.",
    description:
      "Pairs job-ready candidates with verified corporate mandates, establishing automated retention checkpoints backed by sandbox EPFO adapters.",
    keyMetrics: [
      { label: "Active Mandates", value: "622 Openings" },
      { label: "Avg Starting CTC", value: "₹4.47 LPA" },
      { label: "180D Retention Check", value: "18.4%" },
    ],
    previewFeatures: [
      "Algorithmic candidate-to-vacancy vector fit ranking",
      "EPFO UAN-backed employment retention checks",
      "Wage progression and salary slip audit verification",
    ],
  },
];

/**
 * PlatformSuitePreview
 * High-density preview grid showcasing KaushalNexus core platform intelligence suites.
 */
export default function PlatformSuitePreview({
  suites = DEFAULT_SUITES,
  onLaunchSuite,
  className = "",
}) {
  const [activeSuiteId, setActiveSuiteId] = useState(suites[0]?.id || "learner");
  const currentSuite = suites.find((s) => s.id === activeSuiteId) || suites[0];

  const handleLaunch = (route) => {
    if (onLaunchSuite) {
      onLaunchSuite(route);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Suite Tabs Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {suites.map((suite) => {
          const isActive = suite.id === activeSuiteId;
          const SuiteIcon = suite.icon;

          return (
            <button
              key={suite.id}
              type="button"
              onClick={() => setActiveSuiteId(suite.id)}
              className={`group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? "border-sky-400/80 bg-[#0b1528] shadow-lg shadow-sky-500/10 glow-cyan ring-1 ring-sky-400/30"
                  : "border-[#1e293b] bg-[#070d18] hover:border-slate-700 hover:bg-[#0b1528]/50"
              }`}
            >
              <div className="flex w-full items-center justify-between mb-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isActive
                      ? "bg-sky-400 text-slate-950 font-bold"
                      : "bg-[#0f1c33] text-slate-400 group-hover:text-white"
                  }`}
                >
                  <SuiteIcon size={16} />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  {suite.badge}
                </span>
              </div>

              <div className="font-heading text-sm font-bold text-[#f8fafc] mb-1">
                {suite.title}
              </div>

              <p className="text-xs text-[#cbd5e1] line-clamp-2">
                {suite.tagline}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Suite Detailed Preview Panel */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0b1528] p-6 lg:p-8 relative overflow-hidden">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
          {/* Left Suite Capabilities */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded bg-sky-500/10 border border-sky-400/20 px-2 py-0.5 font-mono text-xs font-semibold text-sky-400">
                {currentSuite.badge}
              </span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-xs text-[#cbd5e1]">
                Live Enterprise Interface
              </span>
            </div>

            <h3 className="font-heading text-2xl font-bold text-[#f8fafc] tracking-tight">
              {currentSuite.title}
            </h3>

            <p className="text-sm leading-relaxed text-[#cbd5e1]">
              {currentSuite.description}
            </p>

            <div className="space-y-2 pt-2">
              {currentSuite.previewFeatures.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-[#cbd5e1]">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {onLaunchSuite && (
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => handleLaunch(currentSuite.route)}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-2.5 text-xs font-bold font-sans uppercase tracking-wider transition-colors glow-cyan cursor-pointer"
                >
                  <span>Launch {currentSuite.title}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Right High-Density Telemetry Card */}
          <div className="lg:col-span-5 rounded-xl border border-[#1e293b] bg-[#070d18] p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <span className="font-mono text-xs font-semibold uppercase text-[#cbd5e1]">
                Key Performance Telemetry
              </span>
              <span className="text-[10px] font-mono text-sky-400 bg-sky-400/10 border border-sky-400/20 px-1.5 py-0.5 rounded">
                NATIONAL DB
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 py-4">
              {currentSuite.keyMetrics.map((km) => (
                <div
                  key={km.label}
                  className="flex items-center justify-between rounded-lg border border-[#1e293b]/80 bg-[#0b1528]/80 p-3"
                >
                  <span className="text-xs text-[#cbd5e1]">{km.label}</span>
                  <span className="font-mono text-sm font-bold text-sky-400">
                    {km.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 text-[11px] font-mono text-[#94a3b8] text-center">
              Real-time synchronization with MSDE &amp; SSDM nodes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
