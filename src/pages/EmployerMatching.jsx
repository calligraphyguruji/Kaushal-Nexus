import {
  BriefcaseBusiness,
  MapPin,
  Users,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  Building2,
  Sparkles,
  Target,
  BrainCircuit,
  BarChart3,
} from "lucide-react";

import {
  matchingSummary,
  jobMatches,
  employerDemand,
  matchInsights,
} from "../data/employerData";

import StatCard from "../components/StatCard";

export default function EmployerMatching() {
  return (
    <div className="space-y-7">

      {/* Header */}
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
            Employment Intelligence
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            Employer Matching
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Connect job-ready learners with relevant opportunities using
            skills, role requirements and location signals.
          </p>
        </div>

        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-900">
          <Building2 size={16} />
          Employer Network
          <ArrowUpRight size={14} />
        </button>

      </section>


      {/* Matching Stats */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        {matchingSummary.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
        ))}

      </section>


      {/* Main Matching Intelligence */}
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">

        {/* Recommended Opportunities */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">
                AI Matching
              </p>

              <h2 className="mt-1.5 font-bold text-slate-900">
                Recommended Opportunities
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Jobs ranked by learner skill alignment
              </p>
            </div>

            <button className="flex w-fit items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50">
              View all
              <ArrowUpRight size={14} />
            </button>

          </div>


          <div className="space-y-4">

            {jobMatches.map((job) => (
              <div
                key={`${job.company}-${job.role}`}
                className="group rounded-2xl border border-slate-100 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]"
              >

                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                  <div className="flex min-w-0 gap-4">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                      <BriefcaseBusiness size={19} />
                    </div>

                    <div className="min-w-0">

                      <h3 className="text-sm font-bold text-slate-900">
                        {job.role}
                      </h3>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {job.company}
                      </p>

                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">

                        <span className="flex items-center gap-1.5">
                          <MapPin size={13} />
                          {job.location}
                        </span>

                        <span>
                          {job.salary}
                        </span>

                        <span>
                          {job.openings} openings
                        </span>

                      </div>

                    </div>

                  </div>


                  {/* Match Score */}
                  <div className="flex shrink-0 items-center gap-3 sm:block sm:text-right">

                    <div className="text-2xl font-extrabold text-indigo-950">
                      {job.match}%
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Match
                    </p>

                  </div>

                </div>


                {/* Skills */}
                <div className="mt-5 flex flex-wrap gap-2">

                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700"
                    >
                      {skill}
                    </span>
                  ))}

                </div>


                {/* Match Footer */}
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">

                    <CheckCircle2 size={14} />

                    Strong skill alignment

                  </div>

                  <button className="flex w-fit items-center gap-1.5 rounded-lg bg-indigo-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-900">

                    View Match

                    <ArrowUpRight size={13} />

                  </button>

                </div>

              </div>
            ))}

          </div>

        </div>


        {/* Employer Demand */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">
                Employer Signals
              </p>

              <h2 className="mt-1.5 font-bold text-slate-900">
                Employer Skill Demand
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Most requested skills across tracked openings
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <BarChart3 size={17} />
            </div>

          </div>


          <div className="mt-7 space-y-5">

            {employerDemand.map((skill, index) => (
              <div key={skill.skill}>

                <div className="mb-2 flex items-center justify-between">

                  <div className="flex min-w-0 items-center gap-3">

                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="truncate text-sm font-semibold text-slate-700">
                      {skill.skill}
                    </span>

                  </div>

                  <span className="ml-3 text-xs font-extrabold text-indigo-800">
                    {skill.demand}%
                  </span>

                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-indigo-800 transition-all duration-500"
                    style={{
                      width: `${skill.demand}%`,
                    }}
                  />

                </div>

              </div>
            ))}

          </div>


          {/* Demand Insight */}
          <div className="mt-8 rounded-xl border border-amber-100 bg-amber-50/60 p-4">

            <div className="flex items-start gap-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <TrendingUp size={16} />
              </div>

              <div>

                <p className="text-sm font-bold text-amber-950">
                  Demand signal
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-900/70">
                  SQL and Python are currently the strongest requirements
                  across Data Analyst opportunities.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* How Matching Works */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">

        <div className="flex items-start gap-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <Sparkles size={18} />
          </div>

          <div>

            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">
              Matching Engine
            </p>

            <h2 className="mt-1.5 font-bold text-slate-900">
              How KaushalNexus Matches Learners
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Matching considers multiple employment signals
            </p>

          </div>

        </div>


        <div className="mt-6 grid gap-4 md:grid-cols-3">

          {[
            {
              icon: Users,
              title: "Skill Alignment",
              text: "Compare verified learner skills with job requirements.",
            },
            {
              icon: MapPin,
              title: "Location Fit",
              text: "Prioritize opportunities accessible to the learner.",
            },
            {
              icon: TrendingUp,
              title: "Demand Signals",
              text: "Use current employer demand to improve recommendations.",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group rounded-xl border border-slate-100 bg-slate-50 p-5 transition hover:border-indigo-100 hover:bg-indigo-50/40"
              >

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-700 shadow-sm">
                  <Icon size={17} />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.text}
                </p>

              </div>
            );
          })}

        </div>

      </section>


      {/* Matching Insights */}
      <section>

        <div className="mb-5">

          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">
            Employment Ecosystem
          </p>

          <h2 className="mt-1.5 font-bold text-slate-900">
            Matching Insights
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Signals from the current employment ecosystem
          </p>

        </div>


        <div className="grid gap-5 md:grid-cols-3">

          {matchInsights.map((insight) => (
            <div
              key={insight.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
            >

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={17} />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-900">
                {insight.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {insight.description}
              </p>

            </div>
          ))}

        </div>

      </section>


      {/* AI Matching Insight */}
      <section className="rounded-2xl bg-indigo-950 p-6 text-white shadow-sm sm:p-7">

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">

              <BrainCircuit
                size={20}
                className="text-amber-400"
              />

            </div>


            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300">
                AI Matching Insight
              </p>

              <h2 className="mt-1.5 text-lg font-bold">
                Strong matches are emerging for data and full-stack roles.
              </h2>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-indigo-200">
                Current employer demand indicates strong opportunities for
                learners with SQL, Python, React and full-stack development
                skills. Prioritizing these capabilities can improve
                successful employer matching.
              </p>

            </div>

          </div>


          <button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-indigo-950 transition hover:bg-indigo-50">

            View Recommendation

            <ArrowUpRight size={16} />

          </button>

        </div>

      </section>

    </div>
  );
}