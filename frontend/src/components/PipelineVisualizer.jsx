import React, { useState } from "react";
import {
  Database,
  Network,
  BrainCircuit,
  Briefcase,
  ShieldCheck,
  ChevronRight,
  Activity,
  ArrowRight,
  Layers,
  Cpu,
} from "lucide-react";

const DEFAULT_STAGES = [
  {
    id: "intake",
    step: "01",
    title: "Raw Candidate Intake",
    shortLabel: "Intake",
    icon: Database,
    status: "Active Ingestion",
    tagline: "SID, PMKK, ITI & Polytechnic Registry Streams",
    description:
      "Federated API connectors ingest verified trainee records from Skill India Digital (SID) and State Skill Missions under DPDP 2023 consent protocols.",
    metrics: [
      { label: "Daily Ingestion Rate", value: "24,500+ records" },
      { label: "Data Validation", value: "99.8% Schema Pass" },
      { label: "PII Encryption", value: "AES-256 at Rest" },
    ],
    technicalStandards: ["SID REST API v2", "OAuth 2.0 / DPDP Consent", "UAN Tokenization"],
  },
  {
    id: "ontology",
    step: "02",
    title: "Skill Ontological Mapping",
    shortLabel: "Ontology",
    icon: Network,
    status: "Semantic Engine",
    tagline: "NCVET NOS & Qualification Pack Normalization",
    description:
      "Unstructured vocational curricula and candidate competencies are mapped to official NCVET National Occupational Standards (NOS) taxonomy.",
    metrics: [
      { label: "Mapped QP Standards", value: "840+ Qualifications" },
      { label: "Semantic Similarity", value: "Cosine > 0.89" },
      { label: "Latency", value: "14ms / dossier" },
    ],
    technicalStandards: ["NCVET QP-NOS Taxonomy", "Domain Graph Embeddings", "Vector Projections"],
  },
  {
    id: "gap",
    step: "03",
    title: "Skill Gap Bottleneck Detection",
    shortLabel: "Gap Detection",
    icon: BrainCircuit,
    status: "ML Diagnostic",
    tagline: "Real-Time Employer Demand vs. Candidate Readiness Delta",
    description:
      "Automated gap analysis detects missing high-value micro-credentials per district, prescribing bridge learning modules before candidate placement.",
    metrics: [
      { label: "Gap Detection Accuracy", value: "92.4% ROC-AUC" },
      { label: "Bridge Course Recommender", value: "Active" },
      { label: "Regional Bottlenecks", value: "32 District Clusters" },
    ],
    technicalStandards: ["Random Forest / XGBoost", "Regional Labor Signals", "Curriculum Feedback Loop"],
  },
  {
    id: "matching",
    step: "04",
    title: "Employment Matching Engine",
    shortLabel: "Matching",
    icon: Briefcase,
    status: "Vector Match",
    tagline: "High-Fit Hiring Mandate Routing & Employer Shortlists",
    description:
      "Multi-objective matching algorithm pairs job seekers with verified MSME & enterprise vacancies based on skill mastery, commute proximity, and wage floors.",
    metrics: [
      { label: "Interview Conversion", value: "78.4% Shortlist-to-Offer" },
      { label: "Wage Floor Adherence", value: "100% Minimum Wage Gate" },
      { label: "Employer Coverage", value: "12,400+ Verified Units" },
    ],
    technicalStandards: ["FAISS Approximate Nearest Neighbor", "Geospatial Distance Scoring", "Wage Parity Index"],
  },
  {
    id: "retention",
    step: "05",
    title: "Longitudinal Retention Verification",
    shortLabel: "Outcomes",
    icon: ShieldCheck,
    status: "Outcome Sentinel",
    tagline: "3-Month, 6-Month & 12-Month EPFO/UAN Longitudinal Checks",
    description:
      "Cryptographic and verifiable milestone tracking confirms sustained wage progression and employment retention checkpoints rather than single-day placements.",
    metrics: [
      { label: "3M Retention Baseline", value: "84.2% Sustained" },
      { label: "6M Retention Baseline", value: "76.8% Verified" },
      { label: "Avg. Wage Progression", value: "+22.4% at 12M" },
    ],
    technicalStandards: ["EPFO Sandbox Mock Adapter", "Automated Retention Checkpoints", "Audit-Logged Provenance"],
  },
];

/**
 * PipelineVisualizer
 * High-density interactive console illustrating the National Skill Intelligence architecture flow.
 */
export default function PipelineVisualizer({
  stages = DEFAULT_STAGES,
  initialStageIndex = 0,
  onStageSelect,
  className = "",
}) {
  const [selectedIndex, setSelectedIndex] = useState(initialStageIndex);
  const activeStage = stages[selectedIndex] || stages[0];

  const handleSelect = (index) => {
    setSelectedIndex(index);
    if (onStageSelect) {
      onStageSelect(stages[index], index);
    }
  };

  return (
    <div
      className={`kn-card p-5 sm:p-6 lg:p-8 ${className}`}
    >
      {/* Visualizer Top Bar */}
      <div className="flex flex-col gap-3 pb-5 border-b border-[var(--border-subtle)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-400/30 text-sky-500 dark:text-sky-400">
            <Cpu size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                SOVEREIGN PIPELINE ARCHITECTURE
              </span>
              <span className="rounded bg-sky-500/10 border border-sky-400/20 px-1.5 py-0.5 text-[10px] font-mono text-sky-600 dark:text-sky-400">
                TARGET BENCHMARKS &amp; PROTOCOLS
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Raw Candidate Intake &gt; Algorithmic Alignment &gt; Verified Longitudinal Retention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
          <Activity size={14} className="text-emerald-500 dark:text-emerald-400" />
          <span>Stage {selectedIndex + 1} of {stages.length} Selected</span>
        </div>
      </div>

      {/* Stage Stepper Tabs */}
      <div className="grid grid-cols-2 gap-2 pt-6 sm:grid-cols-3 lg:grid-cols-5">
        {stages.map((stage, idx) => {
          const isSelected = selectedIndex === idx;
          const StageIcon = stage.icon;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => handleSelect(idx)}
              className={`group relative flex flex-col items-start rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                isSelected
                  ? "border-sky-500/50 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-400/40"
                  : "border-[var(--border-subtle)] bg-transparent hover:bg-slate-50 dark:hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex w-full items-center justify-between mb-2">
                <span
                  className={`font-mono text-[11px] font-bold ${
                    isSelected ? "text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {stage.step}
                </span>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                    isSelected
                      ? "bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-950 font-bold"
                      : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                  }`}
                >
                  <StageIcon size={14} />
                </div>
              </div>

              <div className="font-heading text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {stage.shortLabel || stage.title}
              </div>

              <span className="mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate w-full">
                {stage.status}
              </span>

              {/* Progress Connector Indicator */}
              <div
                className={`mt-2.5 h-0.5 w-full rounded-full transition-colors ${
                  isSelected ? "bg-sky-500 dark:bg-sky-400" : "bg-[var(--border-subtle)]"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Stage Deep Dive Console Panel */}
      <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Summary & Description */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-sky-600 dark:text-sky-400 font-bold tracking-wider">
                PHASE // {activeStage.step}
              </span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                {activeStage.title}
              </h3>
            </div>

            <p className="text-xs font-mono text-amber-700 dark:text-amber-300 font-medium">
              {activeStage.tagline}
            </p>

            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {activeStage.description}
            </p>

            {/* Technical Standard Tags */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Protocols &amp; Data Standards
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeStage.technicalStandards.map((std) => (
                  <span
                    key={std}
                    className="rounded border border-[var(--border-subtle)] bg-transparent px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-300"
                  >
                    {std}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Metrics Grid - Clean column layout with no nested box */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-lg border border-[var(--border-subtle)] p-4 bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <span className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                Benchmark Targets
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-600 dark:text-sky-400">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
                <span>BENCHMARK PROFILE</span>
              </div>
            </div>

            <div className="space-y-2 py-3">
              {activeStage.metrics.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-subtle)] last:border-none"
                >
                  <span className="text-slate-600 dark:text-slate-400">{m.label}</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {m.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500">
              <span>Simulated Sandbox Flow</span>
              <span>DPDP Section 4(1) Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
