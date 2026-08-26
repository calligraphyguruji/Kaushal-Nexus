import {
  Search,
  MapPin,
  GraduationCap,
  BriefcaseBusiness,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Award,
} from "lucide-react";

const learner = {
  name: "Aman Kumar Mishra",
  id: "KN-2026-00482",
  program: "Full Stack Development",
  location: "Uttar Pradesh",
  readiness: 82,
  employment: "Seeking",
  progress: 89,
  modules: "18 / 20",
};

const skills = [
  { name: "React", score: 92 },
  { name: "JavaScript", score: 88 },
  { name: "Java", score: 86 },
  { name: "Node.js", score: 81 },
];

const gaps = [
  {
    name: "Cloud Computing",
    level: "High",
    width: "82%",
  },
  {
    name: "AWS",
    level: "Medium",
    width: "58%",
  },
  {
    name: "System Design",
    level: "Medium",
    width: "48%",
  },
];

const timeline = [
  {
    title: "Program Enrolled",
    date: "Jan 2026",
    status: "completed",
  },
  {
    title: "Training Started",
    date: "Feb 2026",
    status: "completed",
  },
  {
    title: "Certification",
    date: "Jul 2026",
    status: "completed",
  },
  {
    title: "Employment",
    date: "In progress",
    status: "current",
  },
];

export default function LearnerIntelligence() {
  return (
    <div className="space-y-7">

      {/* Header */}
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
            Learner Intelligence
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            Learner 360°
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Track individual skill development, training progress,
            readiness and employment outcomes.
          </p>
        </div>

        <div className="relative w-full md:w-72">

          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search learner..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
          />

        </div>

      </section>


      {/* Learner Profile */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">

        <div className="p-6 sm:p-7">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-950 text-lg font-bold text-white">
                AK
              </div>

              <div>

                <div className="flex flex-wrap items-center gap-3">

                  <h2 className="text-xl font-bold text-slate-950">
                    {learner.name}
                  </h2>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Ready to work
                  </span>

                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Learner ID: {learner.id}
                </p>

                <div className="mt-4 flex flex-wrap gap-4">

                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <GraduationCap size={15} />
                    {learner.program}
                  </span>

                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <MapPin size={15} />
                    {learner.location}
                  </span>

                </div>

              </div>

            </div>


            {/* Readiness */}
            <div className="flex items-center gap-7">

              <div className="text-right">

                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Readiness Score
                </p>

                <p className="mt-1 text-3xl font-extrabold text-indigo-950">
                  {learner.readiness}
                  <span className="text-sm font-semibold text-slate-400">
                    /100
                  </span>
                </p>

              </div>

              <div className="h-12 w-px bg-slate-200" />

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Employment
                </p>

                <p className="mt-1 flex items-center gap-2 text-sm font-bold text-amber-700">
                  <BriefcaseBusiness size={16} />
                  {learner.employment}
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* Intelligence Cards */}
      <section className="grid gap-5 lg:grid-cols-3">

        {/* Skills */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">

          <div className="flex items-start justify-between">

            <div>
              <h2 className="font-bold text-slate-900">
                Verified Skills
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Current competency levels
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <BrainCircuit size={17} />
            </div>

          </div>

          <div className="mt-6 space-y-5">

            {skills.map((skill) => (
              <div key={skill.name}>

                <div className="mb-2 flex justify-between">

                  <span className="text-sm font-semibold text-slate-700">
                    {skill.name}
                  </span>

                  <span className="text-xs font-bold text-indigo-800">
                    {skill.score}%
                  </span>

                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-indigo-800"
                    style={{ width: `${skill.score}%` }}
                  />

                </div>

              </div>
            ))}

          </div>

        </div>


        {/* Skill Gaps */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">

          <div className="flex items-start justify-between">

            <div>
              <h2 className="font-bold text-slate-900">
                Skill Gaps
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Areas requiring intervention
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle size={17} />
            </div>

          </div>

          <div className="mt-6 space-y-5">

            {gaps.map((gap) => (
              <div key={gap.name}>

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-sm font-semibold text-slate-700">
                    {gap.name}
                  </span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      gap.level === "High"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {gap.level}
                  </span>

                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: gap.width }}
                  />

                </div>

              </div>
            ))}

          </div>

        </div>


        {/* Training Progress */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">

          <div className="flex items-start justify-between">

            <div>
              <h2 className="font-bold text-slate-900">
                Training Progress
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Program completion
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Award size={17} />
            </div>

          </div>

          <div className="mt-7">

            <div className="flex items-end justify-between">

              <span className="text-4xl font-extrabold text-slate-950">
                {learner.progress}%
              </span>

              <span className="text-xs font-medium text-slate-400">
                {learner.modules} modules
              </span>

            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${learner.progress}%` }}
              />

            </div>

            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-700">

              <CheckCircle2 size={14} />

              On track for completion

            </div>

          </div>

        </div>

      </section>


      {/* Learner Journey */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">

        <div className="flex items-start justify-between">

          <div>
            <h2 className="font-bold text-slate-900">
              Learner Journey
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Progress from enrollment to employment
            </p>
          </div>

          <CalendarDays
            size={18}
            className="text-slate-400"
          />

        </div>


        <div className="mt-9 grid grid-cols-1 gap-7 md:grid-cols-4 md:gap-0">

          {timeline.map((item, index) => {

            const completed = item.status === "completed";
            const current = item.status === "current";

            return (
              <div
                key={item.title}
                className="relative flex gap-4 md:block"
              >

                {/* Connector */}
                {index < timeline.length - 1 && (
                  <div className="absolute left-[15px] top-8 h-full w-px bg-slate-200 md:left-1/2 md:top-[15px] md:h-px md:w-full" />
                )}

                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white md:mx-auto">

                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                      completed
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : current
                        ? "border-amber-500 bg-amber-50 text-amber-600"
                        : "border-slate-300 bg-white text-slate-300"
                    }`}
                  >
                    {completed ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-current" />
                    )}
                  </div>

                </div>

                <div className="md:mt-4 md:text-center">

                  <p className="text-sm font-bold text-slate-800">
                    {item.title}
                  </p>

                  <p
                    className={`mt-1 text-xs ${
                      current
                        ? "font-semibold text-amber-600"
                        : "text-slate-400"
                    }`}
                  >
                    {item.date}
                  </p>

                </div>

              </div>
            );
          })}

        </div>

      </section>


      {/* AI Recommendation */}
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
                AI Recommendation
              </p>

              <h2 className="mt-1.5 text-lg font-bold">
                Prioritize cloud skills before employer matching.
              </h2>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-indigo-200">
                Closing the identified cloud competency gap could
                improve this learner's employment readiness and
                broaden the eligible employer pool.
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