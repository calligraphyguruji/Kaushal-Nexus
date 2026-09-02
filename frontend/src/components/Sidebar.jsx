import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  BrainCircuit,
  MapPin,
  BriefcaseBusiness,
  Settings,
  Network,
  X,
} from "lucide-react";
import { useSidebarStats } from "../hooks/useSidebarStats";
import { usePermissions } from "../hooks/usePermissions";

export default function Sidebar({ open, onClose }) {
  const { stats } = useSidebarStats();
  const permissions = usePermissions();

  const navigation = [
    {
      name: "Overview & Impact",
      path: "/dashboard",
      icon: LayoutDashboard,
      badge: stats.overview.badge,
      badgeTone: stats.overview.tone,
    },
    {
      name: "Learner 360° Intelligence",
      path: "/learner",
      icon: UserRound,
      badge: stats.learner360.badge,
      badgeTone: stats.learner360.tone,
    },
    {
      name: "Skill Gap Intelligence",
      path: "/skill-gap",
      icon: BrainCircuit,
      badge: stats.skillGaps.badge,
      badgeTone: stats.skillGaps.tone,
    },
    {
      name: "Regional Intelligence",
      path: "/regional",
      icon: MapPin,
      badge: stats.regional.badge,
      badgeTone: stats.regional.tone,
    },
    {
      name: "Employer Network & Matches",
      path: "/matching",
      icon: BriefcaseBusiness,
      badge: stats.matching.badge,
      badgeTone: stats.matching.tone,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Aside */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:z-40 lg:w-64 lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs dark:bg-slate-800 dark:border dark:border-slate-700">
              <Network size={19} strokeWidth={2.2} className="text-blue-400" />
            </div>

            <div>
              <div className="flex items-center tracking-tight">
                <span className="text-sm font-extrabold text-slate-950 dark:text-white">
                  KAUSHAL
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  NEXUS
                </span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Skilling Intelligence Platform
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Intelligence Modules
          </div>

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-950 font-semibold dark:bg-slate-800 dark:text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Icon
                        size={16}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"}
                      />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.2 text-[10px] font-semibold tabular-nums border ${
                          item.badgeTone === "danger"
                            ? "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/70"
                            : item.badgeTone === "warning"
                            ? "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70"
                            : item.badgeTone === "info"
                            ? "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/70"
                            : isActive
                            ? "bg-white text-slate-900 border-slate-200 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                            : "bg-slate-100 text-slate-500 border-transparent dark:bg-slate-800/80 dark:text-slate-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Administration
          </div>

          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors ${
                isActive
                  ? "bg-slate-100 text-slate-950 font-semibold dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Settings
                  size={16}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"}
                />
                <span>Platform Settings</span>
              </>
            )}
          </NavLink>

          {permissions.canViewAuditLogs && (
            <NavLink
              to="/settings?tab=audit"
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-950 font-semibold dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Network
                  size={16}
                  strokeWidth={1.8}
                  className="text-indigo-600 dark:text-indigo-400"
                />
                <span>Compliance Audit Logs</span>
              </div>
              <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300">
                P0
              </span>
            </NavLink>
          )}
        </nav>

        {/* System & Verification Status Footer */}
        <div className="shrink-0 border-t border-slate-100 p-3.5 dark:border-slate-800">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  National Engine
                </span>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800/80 dark:text-emerald-300">
                LIVE
              </span>
            </div>

            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {stats.footerSummary}
            </p>

            <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
              <span>Sync: UIDAI / NCVET</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">v2.4</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}