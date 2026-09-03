import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  BrainCircuit,
  MapPin,
  BriefcaseBusiness,
  Settings,
  ShieldCheck,
  Shield,
  X,
  Activity,
} from "lucide-react";
import { useSidebarStats } from "../hooks/useSidebarStats";
import { usePermissions } from "../hooks/usePermissions";

export default function Sidebar({ open, onClose }) {
  const { stats } = useSidebarStats();
  const permissions = usePermissions();

  const intelligenceNav = [
    {
      name: "Overview & Impact",
      path: "/dashboard",
      icon: LayoutDashboard,
      badge: stats.overview.badge,
      badgeTone: stats.overview.tone,
    },
    {
      name: "Learner Intelligence",
      path: "/learner",
      icon: UserRound,
      badge: stats.learner360.badge,
      badgeTone: stats.learner360.tone,
    },
    {
      name: "Skill Gap Matrix",
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
      name: "Employer Network",
      path: "/matching",
      icon: BriefcaseBusiness,
      badge: stats.matching.badge,
      badgeTone: stats.matching.tone,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/60 dark:bg-[#040810]/70 backdrop-blur-xs transition-opacity duration-200 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#070d18] text-slate-800 dark:text-[#f1f5f9] transition-transform duration-200 ease-in-out lg:z-40 lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-[#1e293b] px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-xs glow-cyan">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center tracking-tight">
                <span className="font-heading text-sm font-extrabold text-slate-900 dark:text-white">
                  KAUSHAL
                </span>
                <span className="font-heading text-sm font-bold text-sky-600 dark:text-sky-400">
                  NEXUS
                </span>
              </div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                AI SKILL &amp; EMPLOYMENT INTELLIGENCE
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#0b1528] dark:hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {/* Intelligence Group */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400/80">
              Intelligence
            </div>

            {intelligenceNav.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-sans transition-all duration-150 ${
                      isActive
                        ? "bg-sky-50 dark:bg-[#0b1528] text-sky-900 dark:text-white font-semibold border-l-2 border-sky-500 dark:border-sky-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0b1528]/60 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon
                          size={16}
                          strokeWidth={isActive ? 2.2 : 1.8}
                          className={
                            isActive
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                          }
                        />
                        <span>{item.name}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-mono tabular-nums border ${
                            item.badgeTone === "danger"
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/70"
                              : item.badgeTone === "warning"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70"
                              : item.badgeTone === "info"
                              ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/70"
                              : isActive
                              ? "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-400/30 font-bold"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#0b1528] dark:text-slate-400 dark:border-[#1e293b]"
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
          </div>

          {/* System Group */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              System
            </div>

            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-sans transition-all duration-150 ${
                  isActive
                    ? "bg-sky-50 dark:bg-[#0b1528] text-sky-900 dark:text-white font-semibold border-l-2 border-sky-500 dark:border-sky-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0b1528]/60 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Settings
                    size={16}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={
                      isActive
                        ? "text-sky-600 dark:text-sky-400"
                        : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                    }
                  />
                  <span>Settings</span>
                </>
              )}
            </NavLink>

            {permissions.canViewAuditLogs && (
              <NavLink
                to="/settings?tab=audit"
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-sans transition-all duration-150 ${
                    isActive
                      ? "bg-indigo-50 dark:bg-[#0b1528] text-indigo-900 dark:text-white font-semibold border-l-2 border-indigo-500 dark:border-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0b1528]/60 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Shield
                    size={16}
                    strokeWidth={1.8}
                    className="text-indigo-500 dark:text-indigo-400"
                  />
                  <span>Compliance Audit Logs</span>
                </div>
                <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800 px-1.5 py-0.5 text-[9px] font-mono font-bold dark:text-indigo-300">
                  P0
                </span>
              </NavLink>
            )}
          </div>
        </nav>

        {/* System Telemetry & Verification Footer */}
        <div className="shrink-0 border-t border-slate-200 dark:border-[#1e293b] p-3.5">
          <div className="rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b1528] p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-heading text-[11px] font-bold text-slate-900 dark:text-white">
                  National Engine
                </span>
              </div>
              <span className="rounded border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 px-1.5 py-0.5 font-mono text-[9px] font-bold dark:text-emerald-300">
                ACTIVE
              </span>
            </div>

            <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              {stats.footerSummary}
            </p>

            <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 dark:border-[#1e293b] pt-2 font-mono text-[10px] text-slate-500">
              <span>Sync: UIDAI / NCVET</span>
              <span className="text-sky-600 dark:text-sky-400/80">Sandbox Active</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
