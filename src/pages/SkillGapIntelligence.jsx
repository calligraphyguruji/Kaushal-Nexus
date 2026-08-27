import { useState } from "react";
import {
  BrainCircuit,
  Search,
  ArrowUpRight,
} from "lucide-react";

import {
  skillGapStats,
  skillGapDistribution,
  prioritySkills,
  interventions,
} from "../data/skillGapData";

import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import IntelligenceCard from "../components/IntelligenceCard";
import ActionModal from "../components/ActionModal";

export default function SkillGapIntelligence() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [selectedSkillAction, setSelectedSkillAction] = useState(null);

  const filteredSkills = prioritySkills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity =
      selectedSeverity === "All" || s.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <PageHeader
        badge="Workforce Gap Engine"
        badgeVariant="danger"
        title="Skill Gap Intelligence & Shortage Engine"
        description="Identifying structural mismatches between employer hiring mandates and training curriculum outputs across all active sectors."
        breadcrumbs={["National Platform", "Skill Gap Intelligence"]}
        actions={
          <button
            type="button"
            onClick={() => setIsInterventionModalOpen(true)}
            className="group inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 active:scale-[0.98]"
          >
            <BrainCircuit size={14} />
            <span>Launch National Bridge Program</span>
            <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        }
      />

      {/* =====================================================
          1. SKILL GAP STATS
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {skillGapStats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            period={stat.period}
            subtitle={stat.subtitle}
            highlight={stat.highlight}
            tone={stat.tone}
          />
        ))}
      </section>

      {/* =====================================================
          2. DEMAND VS SUPPLY GAP MATRIX & DISTRIBUTION
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-12">
        {/* Priority Skill Shortage Matrix (8 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-8 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Priority Skill Shortages — Demand vs. Supply Delta"
              subtitle="Comparing active employer mandate demand against certified candidate availability"
              actions={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Filter skills..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 w-44 rounded-md border border-slate-200 bg-slate-50/80 pl-8 pr-2.5 text-xs text-slate-800 focus:border-blue-400 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="h-8 rounded-md border border-slate-200 bg-slate-50/80 px-2 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none"
                  >
                    <option value="All">All Severity</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                  </select>
                </div>
              }
            />

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3">Skill / Sector</th>
                    <th className="pb-3">Employer Demand</th>
                    <th className="pb-3">Trained Supply</th>
                    <th className="pb-3 text-right">Shortage Gap</th>
                    <th className="pb-3 text-right">Affected</th>
                    <th className="pb-3 text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSkills.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                        No skill shortages found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSkills.map((skill) => (
                      <tr
                        key={skill.name}
                        onClick={() => {
                          setSelectedSkillAction(skill);
                          setIsInterventionModalOpen(true);
                        }}
                        className="cursor-pointer hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-400 font-bold">
                              #{skill.rank}
                            </span>
                            <div>
                              <div>{skill.name}</div>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {skill.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Employer Demand Bar */}
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-700 transition-all"
                                style={{ width: `${skill.employerDemand}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-900 tabular-nums">
                              {skill.employerDemand}%
                            </span>
                          </div>
                        </td>

                        {/* Workforce Supply Bar */}
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-400 transition-all"
                                style={{ width: `${skill.workforceSupply}%` }}
                              />
                            </div>
                            <span className="font-semibold text-slate-600 tabular-nums">
                              {skill.workforceSupply}%
                            </span>
                          </div>
                        </td>

                        {/* Gap % */}
                        <td className="py-3 text-right font-bold text-rose-700 tabular-nums">
                          -{skill.gap}%
                        </td>

                        {/* Affected count */}
                        <td className="py-3 text-right font-semibold text-slate-700 tabular-nums">
                          {skill.learnersAffected.toLocaleString()}
                        </td>

                        {/* Severity */}
                        <td className="py-3 text-right">
                          <StatusBadge
                            variant={skill.severity === "Critical" ? "danger" : "warning"}
                            size="sm"
                          >
                            {skill.severity}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Click any row to review curriculum intervention protocol</span>
            <span className="font-semibold text-blue-700">{filteredSkills.length} Shortages Tracked</span>
          </div>
        </div>

        {/* Severity Distribution & Impact (4 Cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 xl:col-span-4 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Skill Shortage Severity Tiers"
              subtitle="Distribution of identified workforce deficits"
            />

            <div className="mt-4 divide-y divide-slate-100">
              {skillGapDistribution.map((item) => (
                <div
                  key={item.level}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className={item.textTone}>{item.level}</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {item.count} Skills ({item.percentage}%)
                    </span>
                  </div>

                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.barColor}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>

                  <p className="mt-1 text-[11px] text-slate-500">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-rose-50/70 border border-rose-200/80 p-2.5 text-xs text-rose-900 font-medium text-center">
            14 Critical shortages cause 64% of total placement delays.
          </div>
        </div>
      </section>

      {/* =====================================================
          3. TARGETED CURRICULUM INTERVENTIONS
      ====================================================== */}
      <section className="space-y-4">
        <SectionHeader
          title="Approved Curriculum Bridge Interventions"
          subtitle="Mandated short-term specialization modules designed to eliminate critical shortages"
          badge={
            <StatusBadge variant="indigo" size="sm">
              3 Active Interventions
            </StatusBadge>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          {interventions.map((item) => (
            <div
              key={item.skill}
              className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge variant="warning" size="sm" dot>
                    {item.priority}
                  </StatusBadge>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    {item.duration}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900 tracking-tight">
                  {item.skill}
                </h3>

                <p className="mt-1 text-xs text-slate-500 font-semibold">
                  Target Sectors: {item.targetSectors}
                </p>

                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {item.action}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">
                    Projected Impact
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {item.impact}
                  </span>
                </div>

                <StatusBadge variant="success" size="sm">
                  {item.status}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          4. AI INTELLIGENCE & POLICY ENGINE
      ====================================================== */}
      <IntelligenceCard
        category="Predictive Shortage Engine"
        title="Immediate Cloud & Analytics Intervention Mandate"
        description="Demand models indicate a widening deficit in Cloud Infrastructure (AWS/Azure) and Power BI. Deploying the 40-hour bridge curriculum across 24 PMKK centers will close the supply gap for 2,840 learners before Q4 campus placements."
        confidence="99.1% Model Accuracy"
        sampleSize="1,420 Active Job Postings Analyzed"
        actionText="Review Bridge Curriculum"
        onAction={() => setIsInterventionModalOpen(true)}
      />

      {/* =====================================================
          ACTION MODALS
      ====================================================== */}
      <ActionModal
        isOpen={isInterventionModalOpen}
        onClose={() => {
          setIsInterventionModalOpen(false);
          setSelectedSkillAction(null);
        }}
        title={
          selectedSkillAction
            ? `Curriculum Action: ${selectedSkillAction.name}`
            : "Deploy National Skill Bridge Package"
        }
        subtitle="Mandate 30–50 hour specialization modules across accredited training centers"
        confirmText="Authorize Curriculum Update"
        onConfirm={() => {
          alert("Curriculum update authorized and dispatched to National Qualification Register (NQR).");
        }}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Authorizing this action will:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
            <li>Update syllabus with industry-aligned lab credits in PMKK centers</li>
            <li>Allocate cloud sandbox credits to 2,840 registered beneficiaries</li>
            <li>Notify 180 hiring partners of upcoming certified cohort availability</li>
          </ul>
        </div>
      </ActionModal>
    </div>
  );
}