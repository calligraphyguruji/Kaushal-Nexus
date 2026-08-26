import {
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  BriefcaseBusiness,
  GraduationCap,
  MapPin,
  Sparkles,
} from "lucide-react";

import {
  dashboardStats,
  employmentTrend,
  programPerformance,
  insights,
} from "../data/dashboardData";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ImpactDashboard() {
  return (
    <div className="space-y-8">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>
          <div className="mb-3 flex items-center gap-2">

            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
              <Sparkles
                size={14}
                className="text-indigo-700"
              />
            </span>

            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
              National Skill Intelligence
            </p>

          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Impact Dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor training outcomes, employment performance,
            retention and emerging workforce trends across the
            skilling ecosystem.
          </p>
        </div>

        <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-indigo-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-900 active:scale-[0.98]">

          Generate Report

          <ArrowUpRight size={16} />

        </button>

      </section>


      {/* =====================================================
          KPI CARDS
      ====================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {dashboardStats.map((stat, index) => (
          <div
            key={stat.title}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >

            <div className="flex items-start justify-between">

              <div>

                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {stat.title}
                </p>

                <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
                  {stat.value}
                </div>

              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  index === 0
                    ? "bg-indigo-50 text-indigo-700"
                    : index === 1
                    ? "bg-emerald-50 text-emerald-700"
                    : index === 2
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {index === 0 && <Users size={18} />}
                {index === 1 && <GraduationCap size={18} />}
                {index === 2 && <BriefcaseBusiness size={18} />}
                {index === 3 && <MapPin size={18} />}
              </div>

            </div>

            <div className="mt-4 flex items-center gap-2">

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                <TrendingUp size={12} />
                {stat.change}
              </span>

              <span className="text-[11px] text-slate-400">
                vs previous period
              </span>

            </div>

          </div>
        ))}

      </section>


      {/* =====================================================
          MAIN ANALYTICS
      ====================================================== */}
      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">

        {/* EMPLOYMENT TREND */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">

          <div className="mb-7 flex items-start justify-between">

            <div>

              <div className="flex items-center gap-2">

                <h2 className="text-base font-bold text-slate-900">
                  Employment Trend
                </h2>

                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  +8.4%
                </span>

              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                Employment conversion over the last 7 months
              </p>

            </div>

            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-900">
              2026
            </button>

          </div>


          <div className="h-72">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={employmentTrend}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >

                <CartesianGrid
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "#94A3B8",
                  }}
                  dy={8}
                />

                <YAxis
                  domain={[40, 80]}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "#94A3B8",
                  }}
                  tickFormatter={(value) => `${value}%`}
                />

                <Tooltip
                  contentStyle={{
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    boxShadow:
                      "0 8px 30px rgba(15, 23, 42, 0.08)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${value}%`, "Employment"]}
                />

                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#312E81"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#FFFFFF",
                    stroke: "#312E81",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#F59E0B",
                    stroke: "#FFFFFF",
                    strokeWidth: 2,
                  }}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </div>


        {/* PROGRAM PERFORMANCE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">

          <div className="mb-7">

            <div className="flex items-center justify-between">

              <h2 className="text-base font-bold text-slate-900">
                Program Performance
              </h2>

              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                <GraduationCap
                  size={16}
                  className="text-indigo-700"
                />
              </span>

            </div>

            <p className="mt-1.5 text-xs text-slate-500">
              Employment conversion by training program
            </p>

          </div>


          <div className="space-y-6">

            {programPerformance.map((program, index) => (

              <div key={program.name}>

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-sm font-semibold text-slate-700">
                    {program.name}
                  </span>

                  <span className="text-sm font-bold text-slate-950">
                    {program.employment}%
                  </span>

                </div>


                <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className={`h-full rounded-full transition-all ${
                      index === 0
                        ? "bg-indigo-900"
                        : index === 1
                        ? "bg-indigo-700"
                        : "bg-indigo-500"
                    }`}
                    style={{
                      width: `${program.employment}%`,
                    }}
                  />

                </div>


                <div className="mt-2 flex items-center justify-between">

                  <p className="text-[11px] text-slate-400">
                    {program.learners.toLocaleString()} learners
                  </p>

                  {program.employment >= 70 ? (
                    <span className="text-[10px] font-semibold text-emerald-600">
                      Strong conversion
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600">
                      Needs attention
                    </span>
                  )}

                </div>

              </div>

            ))}

          </div>

        </div>

      </section>


      {/* =====================================================
          INTELLIGENCE SECTION
      ====================================================== */}
      <section>

        <div className="mb-5 flex items-end justify-between">

          <div>

            <h2 className="text-base font-bold text-slate-900">
              Intelligence & Insights
            </h2>

            <p className="mt-1.5 text-xs text-slate-500">
              Signals detected from skilling and employment data
            </p>

          </div>

          <span className="hidden text-xs font-medium text-slate-400 sm:block">
            Updated recently
          </span>

        </div>


        <div className="grid gap-4 md:grid-cols-3">

          {insights.map((insight) => {

            const isWarning = insight.type === "warning";

            return (
              <div
                key={insight.title}
                className={`group rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isWarning
                    ? "border-amber-200 hover:border-amber-300"
                    : "border-slate-200 hover:border-indigo-200"
                }`}
              >

                <div className="flex items-start justify-between">

                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isWarning
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >

                    {isWarning ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}

                  </div>

                  <ArrowUpRight
                    size={16}
                    className="text-slate-300 transition group-hover:text-indigo-500"
                  />

                </div>


                <h3 className="mt-5 text-sm font-bold text-slate-900">
                  {insight.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {insight.description}
                </p>


                <div className="mt-5 border-t border-slate-100 pt-4">

                  <span
                    className={`text-[11px] font-bold ${
                      isWarning
                        ? "text-amber-700"
                        : "text-indigo-700"
                    }`}
                  >
                    {isWarning
                      ? "Intervention recommended"
                      : "Positive signal detected"}
                  </span>

                </div>

              </div>
            );

          })}

        </div>

      </section>


      {/* =====================================================
          BOTTOM AI SIGNAL
      ====================================================== */}
      <section className="overflow-hidden rounded-2xl bg-indigo-950 p-6 text-white shadow-sm sm:p-7">

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Sparkles
                size={20}
                className="text-amber-400"
              />
            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-300">
                KaushalNexus Intelligence Engine
              </p>

              <h2 className="mt-1.5 text-lg font-bold">
                Employment outcomes are trending upward.
              </h2>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-indigo-200">
                Current signals indicate improving conversion from
                training completion to employment across tracked
                programs.
              </p>

            </div>

          </div>


          <button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-indigo-950 transition hover:bg-indigo-50">

            Explore Insights

            <ArrowUpRight size={16} />

          </button>

        </div>

      </section>

    </div>
  );
}