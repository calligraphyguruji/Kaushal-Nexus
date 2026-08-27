import { useState } from "react";
import {
  BriefcaseBusiness,
  MapPin,
  ArrowUpRight,
  Building2,
  Search,
} from "lucide-react";

import {
  matchingSummary,
  jobMatches,
  employerDemand,
} from "../data/employerData";

import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import IntelligenceCard from "../components/IntelligenceCard";
import ActionModal from "../components/ActionModal";

export default function EmployerMatching() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobModal, setSelectedJobModal] = useState(null);
  const [isEmployerNetworkModalOpen, setIsEmployerNetworkModalOpen] = useState(false);

  const filteredJobs = jobMatches.filter((job) => {
    return (
      job.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <PageHeader
        badge="Employer Alignment Engine"
        badgeVariant="indigo"
        title="Employer Network & Placement Matching"
        description="Matching job-ready certified beneficiaries with verified employer hiring mandates based on skill alignment, location proximity, and readiness scores."
        breadcrumbs={["National Platform", "Employer Matching"]}
        actions={
          <button
            type="button"
            onClick={() => setIsEmployerNetworkModalOpen(true)}
            className="group inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.98]"
          >
            <Building2 size={14} />
            <span>1,420 Partner Organizations</span>
            <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        }
      />

      {/* =====================================================
          1. MATCHING KPI CARDS
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {matchingSummary.map((stat, idx) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            period={stat.period}
            subtitle={stat.subtitle}
            highlight={stat.highlight}
            tone={idx === 2 ? "success" : idx === 1 ? "info" : "neutral"}
          />
        ))}
      </section>

      {/* =====================================================
          2. RECOMMENDED MATCHES & EMPLOYER DEMAND
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Recommended Opportunities List (8 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-8 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Verified Hiring Mandates & Learner Match Alignment"
              subtitle="Algorithmically ranked opportunities matching certified cohort readiness"
              actions={
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search roles or companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-52 rounded-md border border-slate-200 bg-slate-50/80 pl-8 pr-2.5 text-xs text-slate-800 focus:border-blue-400 focus:bg-white focus:outline-none"
                  />
                </div>
              }
            />

            <div className="mt-4 space-y-3">
              {filteredJobs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No verified hiring mandates found matching "{searchQuery}".
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 transition-all hover:border-slate-300"
                  >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 border border-slate-200/80 text-blue-700 font-bold text-sm">
                        <BriefcaseBusiness size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            {job.role}
                          </h3>
                          <StatusBadge variant="neutral" size="sm">
                            {job.openings} Openings
                          </StatusBadge>
                        </div>

                        <p className="mt-0.5 text-xs font-medium text-slate-600">
                          {job.company} · <span className="text-slate-400">{job.companyType}</span>
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            {job.location} ({job.workType})
                          </span>
                          <span>·</span>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {job.salary}
                          </span>
                          <span>·</span>
                          <span className="text-[11px] text-slate-400">
                            Posted {job.postedDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Match Score Indicator */}
                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-blue-700 tabular-nums">
                          {job.match}%
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Match
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700">
                        High Fit ({job.matchBreakdown.skillAlignment}% Skills)
                      </span>
                    </div>
                  </div>

                  {/* Skills Tag Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Verified Skills:
                    </span>
                    {job.matchedSkills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.2 text-[10px] font-semibold text-emerald-800"
                      >
                        ✓ {s}
                      </span>
                    ))}
                    {job.missingSkills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-amber-50 border border-amber-200/80 px-2 py-0.2 text-[10px] font-semibold text-amber-800"
                      >
                        Gap: {s}
                      </span>
                    ))}
                  </div>

                  {/* Rationale & Action Footer */}
                  <div className="mt-3 border-t border-slate-100 pt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] text-slate-600 leading-normal">
                      <strong>Why this match:</strong> {job.rationale}
                    </p>

                    <button
                      type="button"
                      onClick={() => setSelectedJobModal(job)}
                      className="group inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition active:scale-[0.98]"
                    >
                      <span>Match Dossier</span>
                      <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  </div>
                </div>
              )))}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Showing {filteredJobs.length} active high-match openings</span>
            <span className="font-semibold text-blue-700">100% PF & Salary Compliance Verified</span>
          </div>
        </div>

        {/* Employer Skill Demand Rankings (4 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-4 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Employer Demand Index"
              subtitle="Most requested competencies across active hiring mandates"
            />

            <div className="mt-4 divide-y divide-slate-100">
              {employerDemand.map((item, idx) => (
                <div key={item.skill} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        0{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{item.skill}</span>
                    </div>
                    <span className="font-bold text-blue-700 tabular-nums">{item.demand}%</span>
                  </div>

                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-700 transition-all"
                      style={{ width: `${item.demand}%` }}
                    />
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Category: {item.category}</span>
                    <span>High Priority</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50/70 border border-blue-200/80 p-2.5 text-xs text-blue-950 font-medium text-center">
            SQL & Python appear in 91% of data job descriptions.
          </div>
        </div>
      </section>

      {/* =====================================================
          3. HOW THE MATCHING ENGINE OPERATES
      ====================================================== */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <SectionHeader
          title="Multi-Signal Employer Matching Architecture"
          subtitle="How KaushalNexus matches candidate capabilities to verified industry requirements"
        />

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Verified Skill Alignment",
              weight: "50% Weightage",
              desc: "Matches verified assessment scores and NCVET capstones against required role competencies.",
            },
            {
              title: "Geospatial & Commute Proximity",
              weight: "30% Weightage",
              desc: "Prioritizes district and transit accessibility to maximize 6-month employment retention.",
            },
            {
              title: "Readiness & Employer Velocity",
              weight: "20% Weightage",
              desc: "Factors in interview turnaround speed, candidate portfolio quality, and historical cohort placement.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{item.title}</span>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.2 text-[10px] font-semibold text-blue-800">
                  {item.weight}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          4. AI INTELLIGENCE PANEL
      ====================================================== */}
      <IntelligenceCard
        category="Corporate Pipeline Engine"
        title="Immediate Shortlisting for Data Analytics Cohort"
        description="TechNova Solutions & InsightWorks have 14 combined open positions for Junior Data Analysts. 18 candidates in Noida and Lucknow cohorts meet the 90%+ match threshold and are ready for placement dispatch."
        confidence="95.6% Placement Conversion Probability"
        sampleSize="18 Candidates · 2 Enterprise Partners"
        actionText="Dispatch Shortlist"
        onAction={() => alert("Candidate shortlist dispatched to TechNova Solutions and InsightWorks.")}
      />

      {/* =====================================================
          ACTION MODALS
      ====================================================== */}
      <ActionModal
        isOpen={!!selectedJobModal}
        onClose={() => setSelectedJobModal(null)}
        title={selectedJobModal ? `Match Breakdown: ${selectedJobModal.role}` : "Match Dossier"}
        subtitle={selectedJobModal ? `${selectedJobModal.company} · ${selectedJobModal.location}` : ""}
        confirmText="Submit Candidate Batch"
        onConfirm={() => {
          alert(`Candidate batch successfully submitted to ${selectedJobModal?.company}.`);
        }}
      >
        {selectedJobModal && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-slate-500">Skill Alignment</span>
                <p className="text-sm font-bold text-blue-700 tabular-nums">
                  {selectedJobModal.matchBreakdown.skillAlignment}%
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-slate-500">Location Fit</span>
                <p className="text-sm font-bold text-emerald-700 tabular-nums">
                  {selectedJobModal.matchBreakdown.locationFit}%
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-slate-500">Readiness Fit</span>
                <p className="text-sm font-bold text-slate-900 tabular-nums">
                  {selectedJobModal.matchBreakdown.readinessFit}%
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
              <p className="font-semibold text-slate-900">Hiring Manager Contact:</p>
              <p className="text-slate-600">{selectedJobModal.hiringContact}</p>
              <p className="text-slate-600 mt-1">Salary Range: {selectedJobModal.salary} (PF & Medical Included)</p>
            </div>
          </div>
        )}
      </ActionModal>

      <ActionModal
        isOpen={isEmployerNetworkModalOpen}
        onClose={() => setIsEmployerNetworkModalOpen(false)}
        title="National Employer Partner Directory"
        subtitle="1,420 Active Corporate & MSME Hiring Partners"
        confirmText="Download Partner MOU Dossier"
        onConfirm={() => {
          alert("Employer Partner Network Dossier downloaded.");
        }}
      >
        <p className="text-xs text-slate-600">
          The KaushalNexus Employer Network spans 1,420 organizations with active MOUs across IT & ITeS, Automotive Manufacturing, Logistics, Renewable Energy, and Healthcare services.
        </p>
      </ActionModal>
    </div>
  );
}