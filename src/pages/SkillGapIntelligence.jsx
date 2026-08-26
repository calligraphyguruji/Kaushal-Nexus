import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Search,
  Users,
} from "lucide-react";

import {
  skillGapStats,
  skillGapDistribution,
  prioritySkills,
  interventions,
} from "../data/skillGapData";

const toneStyles = {
  danger: {
    icon: "bg-rose-50 text-rose-600",
    value: "text-rose-700",
  },
  warning: {
    icon: "bg-amber-50 text-amber-600",
    value: "text-amber-700",
  },
  primary: {
    icon: "bg-indigo-50 text-indigo-700",
    value: "text-indigo-900",
  },
  success: {
    icon: "bg-emerald-50 text-emerald-600",
    value: "text-emerald-700",
  },
};

export default function SkillGapIntelligence() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-7">

      {/* Header */}
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
            Workforce Intelligence
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            Skill Gap Intelligence
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Identify emerging workforce skill shortages and prioritize
            interventions across training programs.
          </p>
        </div>

        <div className="relative w-full md:w-72">

          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search skills..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
          />

        </div>

      </section>


      {/* Statistics */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        {skillGapStats.map((stat) => {

          const styles = toneStyles[stat.tone];

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <p
                    className={`mt-2 text-3xl font-extrabold tracking-tight ${styles.value}`}
                  >
                    {stat.value}
                  </p>
                </div>

                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.icon}`}
                >
                  <AlertTriangle size={17} />
                </div>

              </div>

              <div className="mt-4 flex items-center gap-2">

                <span className="text-xs font-bold text-slate-700">
                  {stat.change}
                </span>

                <span className="text-xs text-slate-400">
                  this quarter
                </span>

              </div>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                {stat.description}
              </p>

            </div>
          );
        })}

      </section>


      {/* Distribution + Priority Skills */}
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">

        {/* Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div>
            <h2 className="font-bold text-slate-900">
              Skill Gap Distribution
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Severity of identified workforce gaps
            </p>
          </div>

          <div className="mt-8 space-y-6">

            {skillGapDistribution.map((item) => (

              <div key={item.level}>

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-sm font-semibold text-slate-700">
                    {item.level}
                  </span>

                  <span className="text-xs font-bold text-slate-500">
                    {item.count} skills
                  </span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className={`h-full rounded-full ${
                      item.level === "Critical"
                        ? "bg-rose-500"
                        : item.level === "High"
                        ? "bg-amber-500"
                        : item.level === "Medium"
                        ? "bg-indigo-500"
                        : "bg-slate-400"
                    }`}
                    style={{
                      width: `${item.percentage}%`,
                    }}
                  />

                </div>

                <p className="mt-1.5 text-[11px] text-slate-400">
                  {item.percentage}% of identified gaps
                </p>

              </div>

            ))}

          </div>

        </div>


        {/* Priority Skills */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-start justify-between">

            <div>
              <h2 className="font-bold text-slate-900">
                Priority Skills
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Skills requiring the greatest intervention
              </p>
            </div>

            <button className="hidden items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 sm:flex">
              View all
              <ArrowUpRight size={14} />
            </button>

          </div>


          <div className="mt-6 overflow-x-auto">

            <table className="w-full min-w-[620px]">

              <thead>
                <tr className="border-b border-slate-100 text-left">

                  <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Skill
                  </th>

                  <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Gap
                  </th>

                  <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Severity
                  </th>

                  <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Learners
                  </th>

                </tr>
              </thead>

              <tbody>

                {prioritySkills.map((skill) => (

                  <tr
                    key={skill.name}
                    className="border-b border-slate-100 last:border-0"
                  >

                    <td className="py-4">

                      <div className="flex items-center gap-3">

                        <span className="text-xs font-bold text-slate-300">
                          {skill.rank}
                        </span>

                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {skill.name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {skill.category}
                          </p>
                        </div>

                      </div>

                    </td>

                    <td className="py-4">

                      <div className="flex items-center gap-3">

                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className="h-full rounded-full bg-indigo-700"
                            style={{
                              width: `${skill.gap}%`,
                            }}
                          />

                        </div>

                        <span className="text-xs font-bold text-slate-700">
                          {skill.gap}%
                        </span>

                      </div>

                    </td>

                    <td className="py-4">

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          skill.severity === "Critical"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {skill.severity}
                      </span>

                    </td>

                    <td className="py-4 text-right">

                      <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-600">

                        <Users size={14} className="text-slate-400" />

                        {skill.learners.toLocaleString()}

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      </section>


      {/* AI Intelligence */}
      <section className="rounded-2xl bg-indigo-950 p-6 text-white shadow-sm sm:p-7">

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">

              <BrainCircuit
                size={21}
                className="text-amber-400"
              />

            </div>

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300">
                KaushalNexus Intelligence
              </p>

              <h2 className="mt-1.5 text-lg font-bold">
                3 priority interventions detected
              </h2>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-indigo-200">
                Cloud computing and cybersecurity show the highest
                mismatch between learner capabilities and current
                workforce requirements.
              </p>

            </div>

          </div>

          <div className="flex shrink-0 items-center gap-3">

            <div className="hidden text-right sm:block">

              <p className="text-[10px] uppercase tracking-wider text-indigo-300">
                Potentially affected
              </p>

              <p className="mt-1 text-xl font-bold">
                4,000+
              </p>

            </div>

            <button className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-indigo-950 transition hover:bg-indigo-50">
              Review Actions
              <ArrowUpRight size={16} />
            </button>

          </div>

        </div>

      </section>


      {/* Recommended Interventions */}
      <section>

        <div className="mb-4">

          <h2 className="font-bold text-slate-900">
            Recommended Interventions
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Suggested actions based on detected skill shortages
          </p>

        </div>


        <div className="grid gap-4 lg:grid-cols-3">

          {interventions.map((item) => (

            <div
              key={item.skill}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-sm font-bold text-slate-900">
                    {item.skill}
                  </p>

                  <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                    {item.priority}
                  </span>

                </div>

                <CheckCircle2
                  size={19}
                  className="text-emerald-500"
                />

              </div>

              <p className="mt-5 text-sm leading-6 text-slate-500">
                {item.action}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

                <span className="text-xs text-slate-400">
                  Potential impact
                </span>

                <span className="text-xs font-bold text-slate-700">
                  {item.impact}
                </span>

              </div>

            </div>

          ))}

        </div>

      </section>

    </div>
  );
}