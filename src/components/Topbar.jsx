import { useState } from "react";
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  X,
} from "lucide-react";

export default function Topbar({ onMenuClick }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [role, setRole] = useState("National Policy View (MSDE)");
  const [searchQuery, setSearchQuery] = useState("");

  const roles = [
    "National Policy View (MSDE)",
    "State Skill Mission (UP-SDM)",
    "PMKK Training Partner",
    "Corporate Employer Network",
  ];

  const notifications = [
    {
      id: 1,
      title: "Critical Skill Deficit Flagged",
      desc: "41% deficit in Power BI reported in Eastern UP cluster.",
      time: "10 mins ago",
      type: "warning",
    },
    {
      id: 2,
      title: "Cohort Placement Target Cleared",
      desc: "Noida Full Stack Cohort reached 88.4% 3-month retention.",
      time: "1 hour ago",
      type: "success",
    },
    {
      id: 3,
      title: "New Employer Hiring Mandate",
      desc: "TechNova Solutions posted 8 Data Analyst openings.",
      time: "3 hours ago",
      type: "info",
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Left Section: Mobile toggle and Context / Role Switcher */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:hidden"
        >
          <Menu size={18} />
        </button>

        {/* Role / Institutional Context Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50/80 pl-3 pr-8 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Aadhaar / EPFO Sync Active
          </span>
        </div>
      </div>

      {/* Right Section: Search, Notifications, Admin Profile */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Global Search Input */}
        <div className="relative hidden md:block">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search learner ID, district, skill..."
            className="h-9 w-60 lg:w-72 rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
              /
            </kbd>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <Bell size={15} />
            <span className="absolute right-2 top-2 flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">
                  National System Alerts
                </span>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.2 text-[10px] font-semibold text-blue-700">
                  3 New
                </span>
              </div>

              <div className="mt-2 divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2 text-xs">
                    <p className="font-semibold text-slate-800">{n.title}</p>
                    <p className="mt-0.5 text-slate-500 text-[11px] leading-tight">{n.desc}</p>
                    <span className="mt-1 block text-[10px] text-slate-400">{n.time}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="mt-2 w-full rounded-md bg-slate-50 py-1.5 text-center text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        {/* User Identity / Institutional Officer */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-2xs">
            MS
          </div>

          <div className="hidden text-left xl:block">
            <p className="text-xs font-bold leading-tight text-slate-900">
              Dr. M. S. Varma
            </p>
            <p className="text-[10px] text-slate-400 leading-tight">
              Principal Advisor · MSDE
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}