import {
  Map,
  Users,
  TrendingUp,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Target,
  BrainCircuit,
  BarChart3,
  Activity,
} from "lucide-react";

import {
  regionalStats,
  districtPerformance,
  skillDemand,
  priorityDistricts,
} from "../data/regionalData";

import StatCard from "../components/StatCard";

export default function RegionalIntelligence() {
  const getPriorityStyles = (priority) => {
    if (priority === "High") {
      return {
        badge: "bg-rose-50 text-rose-700",
        icon: "text-rose-600",
      };
    }

    if (priority === "Medium") {
      return {
        badge: "bg-amber-50 text-amber-700",
        icon: "text-amber-600",
      };
    }

    return {
      badge: "bg-emerald-50 text-emerald-700",
      icon: "text-emerald-600",
    };
  };

  const getSkillGapStyles = (gap) => {
    if (gap === "High") {
      return "bg-rose-50 text-rose-700";
    }

    if (gap === "Medium") {
      return "bg-amber-50 text-amber-700";
    }

    return "bg-emerald-50 text-emerald-700";
  };

  return (
    <div className="space-y-7">

      {/* Header */}
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
            Regional Skill Intelligence
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            Regional Intelligence
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Identify regional skill gaps, employment patterns and priority
            areas for targeted interventions.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">

          <select
            className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            defaultValue="Uttar Pradesh"
          >
            <option>Uttar Pradesh</option>
            <option>All Regions</option>
          </select>

          <select
            className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            defaultValue="2026"
          >
            <option>2026</option>
            <option>2025</option>
          </select>

        </div>
      </section>


      {/* Regional Stats */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        {regionalStats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
        ))}

      </section>


      {/* Regional Overview */}
      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">

        {/* Employment Map */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">
                Regional Overview
              </p>

              <h2 className="mt-1.5 font-bold text-slate-900">
                Regional Employment Map
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Employment performance across tracked districts
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Map size={17} />
            </div>

          </div>


          {/* Map */}
          <div className="relative mt-6 flex h-[350px] items-center justify-center overflow-hidden rounded-2xl bg-slate-50">

            {/* Background grid */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
                backgroundSize: "42px 42px",
              }}
            />

            {/* Abstract UP map */}
            <div className="relative z-10 h-64 w-80">

              <div className="absolute left-20 top-2 h-24 w-32 rotate-[-8deg] rounded-[55%_45%_40%_60%] bg-indigo-100" />

              <div className="absolute left-7 top-20 h-32 w-32 rotate-[8deg] rounded-[60%_40%_55%_45%] bg-indigo-200" />

              <div className="absolute left-28 top-24 h-28 w-36 rotate-[-4deg] rounded-[40%_60%_45%_55%] bg-indigo-300" />

              <div className="absolute left-40 top-45 h-16 w-28 rotate-[12deg] rounded-[55%_45%_60%_40%] bg-indigo-400" />


              {/* District markers */}
              <div className="group absolute left-24 top-14">

                <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 ring-4 ring-white">
                  <div className="absolute h-7 w-7 animate-pulse rounded-full bg-emerald-400/20" />
                </div>

                <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                  Lucknow · 76%
                </div>

              </div>


              <div className="group absolute left-44 top-26">

                <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 ring-4 ring-white">
                  <div className="absolute h-7 w-7 rounded-full bg-emerald-400/20" />
                </div>

                <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                  Noida · 74%
                </div>

              </div>


              <div className="group absolute left-20 top-36">

                <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 ring-4 ring-white">
                  <div className="absolute h-7 w-7 rounded-full bg-amber-400/20" />
                </div>

                <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                  Kanpur · 69%
                </div>

              </div>


              <div className="group absolute left-40 top-44">

                <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 ring-4 ring-white">
                  <div className="absolute h-8 w-8 rounded-full bg-rose-400/20" />
                </div>

                <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                  Varanasi · 63%
                </div>

              </div>


              <div className="group absolute left-12 top-48">

                <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 ring-4 ring-white">
                  <div className="absolute h-8 w-8 rounded-full bg-rose-400/20" />
                </div>

                <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                  Gorakhpur · 59%
                </div>

              </div>

            </div>


            {/* Map legend */}
            <div className="absolute bottom-4 left-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">

              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Employment signal
              </p>

              <div className="space-y-1.5">

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  Strong
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Moderate
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                  Priority
                </div>

              </div>

            </div>


            {/* District count */}
            <div className="absolute right-4 top-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">

              <div className="flex items-center gap-2">

                <Users size={14} className="text-indigo-700" />

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Tracked
                  </p>

                  <p className="text-sm font-extrabold text-slate-900">
                    42 districts
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>


        {/* Skill Demand */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">
                Employer Signals
              </p>

              <h2 className="mt-1.5 font-bold text-slate-900">
                Regional Skill Demand
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Current employer demand across the region
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <BarChart3 size={17} />
            </div>

          </div>


          <div className="mt-7 space-y-5">

            {skillDemand.map((skill, index) => (
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
          <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">

            <div className="flex items-start gap-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <TrendingUp size={16} />
              </div>

              <div>

                <p className="text-sm font-bold text-indigo-950">
                  Demand signal
                </p>

                <p className="mt-1 text-xs leading-5 text-indigo-900/70">
                  Data Analytics and Full Stack Development are currently
                  the strongest demand categories.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* District Performance */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

          <div>

            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">
              District Analytics
            </p>

            <h2 className="mt-1.5 font-bold text-slate-900">
              District Performance
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Employment and skill-gap indicators by district
            </p>

          </div>

          <button className="flex w-fit items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50">
            View all
            <ArrowUpRight size={14} />
          </button>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[760px] text-left">

            <thead>

              <tr className="border-b border-slate-100">

                <th className="pb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  District
                </th>

                <th className="pb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Learners
                </th>

                <th className="pb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Employment
                </th>

                <th className="pb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Skill Gap
                </th>

                <th className="pb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Priority
                </th>

              </tr>

            </thead>


            <tbody>

              {districtPerformance.map((district) => {

                const priorityStyles = getPriorityStyles(district.priority);

                return (
                  <tr
                    key={district.district}
                    className="group border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                  >

                    <td className="py-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-indigo-50 group-hover:text-indigo-700">
                          <MapPin size={15} />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {district.district}
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Uttar Pradesh
                          </p>
                        </div>

                      </div>

                    </td>


                    <td className="py-4">

                      <div className="flex items-center gap-2">

                        <Users size={14} className="text-slate-400" />

                        <span className="text-sm font-semibold text-slate-600">
                          {district.learners.toLocaleString()}
                        </span>

                      </div>

                    </td>


                    <td className="py-4">

                      <div className="flex items-center gap-3">

                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className={`h-full rounded-full ${
                              district.employment >= 70
                                ? "bg-emerald-600"
                                : district.employment >= 60
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{
                              width: `${district.employment}%`,
                            }}
                          />

                        </div>

                        <span className="text-sm font-bold text-slate-700">
                          {district.employment}%
                        </span>

                      </div>

                    </td>


                    <td className="py-4">

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getSkillGapStyles(
                          district.skillGap
                        )}`}
                      >
                        {district.skillGap}
                      </span>

                    </td>


                    <td className="py-4">

                      <span
                        className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${priorityStyles.badge}`}
                      >

                        {district.priority === "High" ? (
                          <AlertTriangle size={12} />
                        ) : district.priority === "Medium" ? (
                          <Activity size={12} />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}

                        {district.priority}

                      </span>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

      </section>


      {/* Priority Interventions */}
      <section>

        <div className="mb-5">

          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">
            Recommended Actions
          </p>

          <h2 className="mt-1.5 font-bold text-slate-900">
            Priority Interventions
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Recommended actions based on regional employment and skill signals
          </p>

        </div>


        <div className="grid gap-5 md:grid-cols-3">

          {priorityDistricts.map((item) => {

            const priority = item.value === "59%" ? "High" : "Medium";
            const styles = getPriorityStyles(priority);

            return (
              <div
                key={item.district}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
              >

                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                      <MapPin size={17} />
                    </div>

                    <div>

                      <h3 className="text-sm font-bold text-slate-900">
                        {item.district}
                      </h3>

                      <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                        {item.issue}
                      </p>

                    </div>

                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles.badge}`}
                  >
                    {priority}
                  </span>

                </div>


                <div className="mt-5 flex items-end justify-between">

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Signal value
                    </p>

                    <p className="mt-1 text-2xl font-extrabold text-slate-950">
                      {item.value}
                    </p>

                  </div>

                  <Target
                    size={20}
                    className={`${styles.icon} mb-1`}
                  />

                </div>


                <div className="my-5 h-px bg-slate-100" />


                <p className="text-sm leading-6 text-slate-500">
                  {item.recommendation}
                </p>


                <button className="mt-5 flex items-center gap-1.5 text-xs font-bold text-indigo-700 transition hover:text-indigo-950">

                  Create intervention

                  <ArrowUpRight size={14} />

                </button>

              </div>
            );
          })}

        </div>

      </section>


      {/* Regional AI Insight */}
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
                Regional AI Insight
              </p>

              <h2 className="mt-1.5 text-lg font-bold">
                Prioritize interventions in Gorakhpur and Varanasi.
              </h2>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-indigo-200">
                These districts show the strongest combination of low
                employment conversion and elevated skill gaps. Targeted
                employer partnerships and role-specific training could
                improve regional employment outcomes.
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