import { useState } from "react";
import {
  Search,
  MapPin,
  GraduationCap,
  BrainCircuit,
  CheckCircle2,
  Award,
  ShieldCheck,
  UserCheck,
  Clock,
  ArrowUpRight,
} from "lucide-react";

import { learnersList } from "../data/learnerData";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import StatusBadge from "../components/StatusBadge";
import IntelligenceCard from "../components/IntelligenceCard";
import ActionModal from "../components/ActionModal";

export default function LearnerIntelligence() {
  const [selectedLearnerId, setSelectedLearnerId] = useState(learnersList[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);

  const currentLearner =
    learnersList.find((l) => l.id === selectedLearnerId) || learnersList[0];

  const filteredLearners = learnersList.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.program.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <PageHeader
        badge="Beneficiary 360° Intelligence"
        badgeVariant="indigo"
        title="Learner Dossier & Competency Tracker"
        description="Individual-level tracking of verified skills, assessment scores, detected skill gaps, employment readiness, and longitudinal career progression."
        breadcrumbs={["National Platform", "Learner Intelligence"]}
        actions={
          <button
            type="button"
            onClick={() => setIsDossierModalOpen(true)}
            className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <Award size={14} />
            <span>Verify NCVET Credential</span>
            <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        }
      />

      {/* =====================================================
          1. COHORT SELECTOR & QUICK BROWSER
      ====================================================== */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={15} className="text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Select Beneficiary Profile for Inspection:
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search candidate name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Learner Switcher Cards */}
        <div className="mt-3 flex flex-wrap gap-2">
          {filteredLearners.length === 0 ? (
            <div className="w-full py-4 text-center text-xs text-slate-500">
              No beneficiary records found matching "{searchQuery}".
            </div>
          ) : (
            filteredLearners.map((learner) => {
              const isSelected = learner.id === currentLearner.id;

              return (
                <button
                  key={learner.id}
                  type="button"
                  onClick={() => setSelectedLearnerId(learner.id)}
                  className={`flex items-center gap-2.5 rounded-lg border p-2 text-left transition-colors ${
                    isSelected
                      ? "border-slate-900 bg-slate-50 text-slate-950 font-semibold"
                      : "border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white ${learner.avatarBg}`}
                  >
                    {learner.initials}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate max-w-[130px] text-slate-900">
                        {learner.name}
                      </span>
                      <StatusBadge
                        variant={
                          learner.statusTone === "success"
                            ? "success"
                            : learner.statusTone === "warning"
                            ? "warning"
                            : learner.statusTone === "danger"
                            ? "danger"
                            : "info"
                        }
                        size="sm"
                      >
                        {learner.readiness}%
                      </StatusBadge>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate max-w-[170px]">
                      {learner.program}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* =====================================================
          2. SELECTED LEARNER 360° MASTER HEADER CARD
      ====================================================== */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Candidate Info */}
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-xs ${currentLearner.avatarBg}`}
            >
              {currentLearner.initials}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  {currentLearner.name}
                </h2>
                <StatusBadge
                  variant={
                    currentLearner.statusTone === "success"
                      ? "success"
                      : currentLearner.statusTone === "warning"
                      ? "warning"
                      : currentLearner.statusTone === "danger"
                      ? "danger"
                      : "info"
                  }
                  size="sm"
                  dot
                >
                  {currentLearner.status}
                </StatusBadge>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  <ShieldCheck size={12} />
                  Aadhaar & NCVET Verified
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-700">
                  ID: {currentLearner.id}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <GraduationCap size={13} className="text-slate-400" />
                  {currentLearner.education}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <MapPin size={13} className="text-slate-400" />
                  {currentLearner.location}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  {currentLearner.nsqfLevel}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Training Center: <strong className="text-slate-700">{currentLearner.provider}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Readiness & Progress Key Metrics */}
          <div className="flex flex-wrap items-center gap-6 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0">
            <div className="text-center sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Employment Readiness
              </p>
              <div className="mt-0.5 flex items-baseline justify-center sm:justify-end gap-1">
                <span className="text-3xl font-bold tracking-tight text-blue-700 tabular-nums">
                  {currentLearner.readiness}
                </span>
                <span className="text-xs font-semibold text-slate-400">/100</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700">
                Top 15% in Sector Cohort
              </span>
            </div>

            <div className="hidden h-10 w-px bg-slate-200 sm:block" />

            <div className="text-center sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Training Progress
              </p>
              <div className="mt-0.5 flex items-baseline justify-center sm:justify-end gap-1">
                <span className="text-3xl font-bold tracking-tight text-slate-950 tabular-nums">
                  {currentLearner.progress}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                {currentLearner.modulesCompleted} Modules ({currentLearner.trainingHours})
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          3. THREE-COLUMN INTELLIGENCE BREAKDOWN
      ====================================================== */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Verified Skills Dossier */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Verified Competencies"
              subtitle="Skills assessed & authenticated by accredited bodies"
              badge={
                <StatusBadge variant="success" size="sm">
                  {currentLearner.skills.length} Verified
                </StatusBadge>
              }
            />

            <div className="mt-4 divide-y divide-slate-100">
              {currentLearner.skills.map((skill) => (
                <div key={skill.name} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{skill.name}</span>
                    <span className="font-bold text-blue-700 tabular-nums">{skill.score}%</span>
                  </div>

                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-700 transition-all"
                      style={{ width: `${skill.score}%` }}
                    />
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{skill.verifiedBy}</span>
                    <span className="font-semibold text-slate-600">{skill.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>Credential ID: {currentLearner.credentialId}</span>
          </div>
        </div>

        {/* Detected Skill Gaps & Deficits */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Detected Skill Gaps"
              subtitle="Shortages hindering immediate employer match"
              badge={
                <StatusBadge variant="warning" size="sm">
                  {currentLearner.gaps.length} Actionable Gaps
                </StatusBadge>
              }
            />

            <div className="mt-4 divide-y divide-slate-100">
              {currentLearner.gaps.map((gap) => (
                <div key={gap.name} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">{gap.name}</span>
                    <StatusBadge variant="danger" size="sm">
                      {gap.level} Priority
                    </StatusBadge>
                  </div>

                  <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
                    <strong>Impact:</strong> {gap.impact}
                  </p>
                </div>
              ))}

              {currentLearner.gaps.length === 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-center text-xs text-emerald-800">
                  <CheckCircle2 size={22} className="mx-auto mb-1 text-emerald-600" />
                  No critical skill gaps detected. Candidate is fully aligned with market demand.
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsInterventionModalOpen(true)}
            className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <BrainCircuit size={14} className="text-amber-600" />
            <span>Generate Targeted Bridge Module</span>
          </button>
        </div>

        {/* Longitudinal Career Timeline */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Longitudinal Career Journey"
              subtitle="From enrollment to 6-month employment milestone"
            />

            <div className="mt-4 space-y-3">
              {currentLearner.timeline.map((step, idx) => {
                const isCompleted = step.status === "completed";
                const isCurrent = step.status === "current";

                return (
                  <div key={step.title} className="relative flex gap-3">
                    {/* Line Connector */}
                    {idx < currentLearner.timeline.length - 1 && (
                      <div className="absolute left-[11px] top-5 h-full w-px bg-slate-200" />
                    )}

                    <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white">
                      {isCompleted ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={13} />
                        </div>
                      ) : isCurrent ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                          <Clock size={13} />
                        </div>
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-slate-300 bg-white" />
                      )}
                    </div>

                    <div className="min-w-0 pb-1.5">
                      <p className="text-xs font-semibold text-slate-900">{step.title}</p>
                      <p className="text-[10px] text-slate-400">{step.date}</p>
                      {step.note && (
                        <p className="mt-0.5 text-[11px] text-slate-600 leading-tight">
                          {step.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between font-medium">
            <span>Next Verification: 6M Check</span>
            <span className="font-semibold text-slate-700">EPFO Synced</span>
          </div>
        </div>
      </section>

      {/* =====================================================
          4. AI RECOMMENDATION DOSSIER
      ====================================================== */}
      <IntelligenceCard
        category="Targeted Learner Action"
        title={currentLearner.recommendation.action}
        description={`Matching confidence with ${currentLearner.recommendation.targetCompany} increases to 96% upon completing recommended bridge modules. Expected starting CTC: ${currentLearner.recommendation.potentialWage}.`}
        confidence="96.4% Match Probability"
        sampleSize={`Benchmarked against 840 ${currentLearner.role} placements`}
        actionText="Allocate Bridge Credit"
        onAction={() => setIsInterventionModalOpen(true)}
      />

      {/* =====================================================
          ACTION MODALS
      ====================================================== */}
      <ActionModal
        isOpen={isDossierModalOpen}
        onClose={() => setIsDossierModalOpen(false)}
        title="NCVET Credential Verification Certificate"
        subtitle={`Candidate ID: ${currentLearner.id} · NSQF Verified`}
        confirmText="Download Verified PDF Certificate"
        onConfirm={() => {
          alert(`Official NCVET Verification Dossier for ${currentLearner.name} downloaded.`);
        }}
      >
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
            <p className="font-bold text-slate-900">{currentLearner.name}</p>
            <p className="text-slate-600">Program: {currentLearner.program}</p>
            <p className="text-slate-600">Credential ID: {currentLearner.credentialId}</p>
            <p className="text-emerald-700 font-semibold mt-1">Status: Authenticated on National Skills Registry (NSR)</p>
          </div>
        </div>
      </ActionModal>

      <ActionModal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        title="Allocate Individual Bridge Upskilling Module"
        subtitle={`Candidate: ${currentLearner.name}`}
        confirmText="Enroll in Specialization Track"
        onConfirm={() => {
          alert(`Bridge module allocated to ${currentLearner.name} training portal.`);
        }}
      >
        <p className="text-xs text-slate-600">
          This action assigns a 20-hour lab specialization credit to {currentLearner.name} to close the detected competency deficit before candidate submission to partner employers.
        </p>
      </ActionModal>
    </div>
  );
}