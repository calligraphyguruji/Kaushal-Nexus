import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  UserRound,
  BrainCircuit,
  Map,
  BriefcaseBusiness,
  Settings,
  Sparkles,
  Network,
  X,
} from "lucide-react";

const navigation = [
  {
    name: "Overview",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Learner Intelligence",
    path: "/learner",
    icon: UserRound,
  },
  {
    name: "Skill Gap",
    path: "/skill-gap",
    icon: BrainCircuit,
  },
  {
    name: "Regional Intelligence",
    path: "/regional",
    icon: Map,
  },
  {
    name: "Employer Network",
    path: "/matching",
    icon: BriefcaseBusiness,
  },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* =====================================================
          MOBILE BACKDROP
      ====================================================== */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* =====================================================
          SIDEBAR
      ====================================================== */}
      <aside
        className={[
          "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col",
          "border-r border-slate-200 bg-white",
          "transition-transform duration-300 ease-in-out",
          "lg:z-40 lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >

        {/* ===================================================
            BRAND
        ==================================================== */}
        <div className="flex h-20 shrink-0 items-center justify-between px-5 lg:px-6">

          <div className="flex items-center gap-3">

            {/* Logo */}
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-indigo-950 shadow-sm">

              <Network
                size={25}
                strokeWidth={1.7}
                className="text-white"
              />

              <span className="absolute h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.7)]" />

            </div>

            {/* Brand */}
            <div>
              <div className="text-sm font-extrabold tracking-[0.18em] text-indigo-950">
                KAUSHAL
              </div>

              <div className="text-[11px] font-semibold tracking-[0.3em] text-slate-400">
                NEXUS
              </div>
            </div>

          </div>


          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X size={19} />
          </button>

        </div>


        {/* ===================================================
            NAVIGATION
        ==================================================== */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Intelligence
          </p>

          <div className="space-y-1">

            {navigation.map((item) => {

              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5",
                      "text-sm transition-all duration-200",

                      isActive
                        ? "bg-indigo-50 font-semibold text-indigo-900"
                        : "font-medium text-slate-500 hover:bg-indigo-50 hover:text-indigo-900",
                    ].join(" ")
                  }
                >

                  {({ isActive }) => (
                    <>
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2 : 1.8}
                        className={
                          isActive
                            ? "text-indigo-900"
                            : "text-slate-400 transition-colors group-hover:text-indigo-700"
                        }
                      />

                      <span>{item.name}</span>

                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                      )}
                    </>
                  )}

                </NavLink>
              );
            })}

          </div>


          {/* Divider */}
          <div className="my-6 border-t border-slate-100" />


          {/* Settings */}
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              [
                "group flex items-center gap-3 rounded-xl px-3 py-2.5",
                "text-sm transition-all duration-200",

                isActive
                  ? "bg-indigo-50 font-semibold text-indigo-900"
                  : "font-medium text-slate-500 hover:bg-indigo-50 hover:text-indigo-900",
              ].join(" ")
            }
          >

            {({ isActive }) => (
              <>
                <Settings
                  size={18}
                  strokeWidth={isActive ? 2 : 1.8}
                  className={
                    isActive
                      ? "text-indigo-900"
                      : "text-slate-400 transition-colors group-hover:text-indigo-700"
                  }
                />

                <span>Settings</span>
              </>
            )}

          </NavLink>

        </nav>


        {/* ===================================================
            AI FOOTER
        ==================================================== */}
        <div className="shrink-0 border-t border-slate-100 p-4">

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">

            <div className="flex items-center gap-2">

              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-900 text-white">
                <Sparkles size={14} />
              </div>

              <p className="text-xs font-bold text-indigo-950">
                KaushalNexus AI
              </p>

            </div>

            <p className="mt-2 text-[11px] leading-4 text-slate-500">
              Employment intelligence platform
            </p>

            <div className="mt-3 flex items-center gap-1.5">

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

              <span className="text-[10px] font-medium text-slate-500">
                Intelligence engine active
              </span>

            </div>

          </div>

        </div>

      </aside>
    </>
  );
}