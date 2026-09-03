import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  X,
  User,
  MapPin,
  ArrowRight,
  Loader2,
  LogOut,
  Shield,
  ShieldCheck,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { learnersApi } from "../api/learners";
import { regionalApi } from "../api/regional";
import { ROLE_LABELS } from "../utils/permissions";

export default function Topbar({ onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [role, setRole] = useState(
    user?.role ? ROLE_LABELS[user.role] || user.role : "National Policy View (MSDE)"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState({ learners: [], districts: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchContainerRef = useRef(null);
  const profileContainerRef = useRef(null);
  const inputRef = useRef(null);

  function formatRole(r = "") {
    return ROLE_LABELS[r] || r || "MSDE Official";
  }

  const roles = Object.values(ROLE_LABELS);

  // Compute Current Breadcrumb based on URL
  const getBreadcrumb = (pathname) => {
    if (pathname.startsWith("/learner")) return { group: "Intelligence", section: "Learner Intelligence" };
    if (pathname.startsWith("/skill-gap")) return { group: "Intelligence", section: "Skill Gap Matrix" };
    if (pathname.startsWith("/regional")) return { group: "Intelligence", section: "Regional Intelligence" };
    if (pathname.startsWith("/matching")) return { group: "Intelligence", section: "Employer Network" };
    if (pathname.startsWith("/settings")) return { group: "System", section: "Settings" };
    return { group: "Intelligence", section: "Overview & Impact" };
  };

  const breadcrumb = getBreadcrumb(location.pathname);

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

  // Global Keyboard Shortcut "/" to focus search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === "/" &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (profileContainerRef.current && !profileContainerRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live query search suggestions as user types
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions({ learners: [], districts: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [learnersRes, districtsRes] = await Promise.all([
          learnersApi.list({ search: searchQuery.trim(), page_size: 4 }).catch(() => ({ items: [] })),
          regionalApi.getDistricts({ district: searchQuery.trim() }).catch(() => []),
        ]);

        setSuggestions({
          learners: (learnersRes?.items || []).slice(0, 3),
          districts: (districtsRes || []).slice(0, 3),
        });
        setShowDropdown(true);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowDropdown(false);
    navigate(`/learner?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSelectLearner = (learner) => {
    setShowDropdown(false);
    setSearchQuery("");
    if (learner && learner.id) {
      navigate(`/learner/${encodeURIComponent(learner.id)}`);
    }
  };

  const handleSelectDistrict = (district) => {
    setShowDropdown(false);
    setSearchQuery("");
    navigate(`/regional?search=${encodeURIComponent(district.name)}`);
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    logout();
    navigate("/login", { replace: true });
  };

  const hasSuggestions =
    suggestions.learners.length > 0 || suggestions.districts.length > 0;

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "KN";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 dark:border-[#1e293b] bg-white/90 dark:bg-[#070d18]/90 px-4 backdrop-blur-md transition-colors duration-150 sm:px-6 lg:px-8 text-slate-800 dark:text-[#f1f5f9]">
      {/* Left Section: Mobile Menu Toggle, Breadcrumbs, and Role Switcher */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-[#0b1528] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#0f1c33] hover:text-slate-900 dark:hover:text-white lg:hidden"
        >
          <Menu size={18} />
        </button>

        {/* Section Breadcrumb */}
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs">
          <span className="text-slate-400 dark:text-slate-500 uppercase">{breadcrumb.group}</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-900 dark:text-white font-semibold">{breadcrumb.section}</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-[#1e293b]" />

        {/* Role / Institutional Context Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-8 cursor-pointer appearance-none rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-[#0b1528] pl-2.5 pr-7 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:border-slate-400 dark:hover:border-slate-600 focus:border-sky-500 dark:focus:border-sky-400 focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r} value={r} className="bg-white dark:bg-[#0b1528] text-slate-800 dark:text-slate-200">
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            Sandbox Active · NCVET
          </span>
        </div>
      </div>

      {/* Right Section: Global Search, Theme Toggle, Alerts, User Profile */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Global Search Container */}
        <div ref={searchContainerRef} className="relative hidden md:block">
          <form onSubmit={handleSearchSubmit}>
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setShowDropdown(true);
              }}
              placeholder="Search candidate, district..."
              className="h-8 w-52 lg:w-64 rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-[#0b1528] pl-8 pr-7 font-sans text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all focus:border-sky-500 dark:focus:border-sky-400 focus:bg-white dark:focus:bg-[#070d18] focus:outline-none"
            />
            {isSearching ? (
              <Loader2
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-sky-500 dark:text-sky-400"
              />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowDropdown(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 dark:border-[#1e293b] bg-slate-200 dark:bg-[#070d18] px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                /
              </kbd>
            )}
          </form>

          {/* Instant Search Suggestions Dropdown */}
          {showDropdown && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0b1528] p-2.5 shadow-xl dark:shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
              {hasSuggestions ? (
                <div className="space-y-2">
                  {/* Candidates Group */}
                  {suggestions.learners.length > 0 && (
                    <div>
                      <span className="block px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Candidates ({suggestions.learners.length})
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {suggestions.learners.map((learner) => (
                          <button
                            key={learner.id}
                            type="button"
                            onClick={() => handleSelectLearner(learner)}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-[#0f1c33]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <User size={13} className="shrink-0 text-sky-400" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-100">
                                  {learner.full_name}
                                </p>
                                <p className="font-mono text-[10px] text-slate-400">
                                  {learner.id} · {learner.district_name || learner.district_id}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded border border-sky-400/20 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                              {learner.employment_readiness_score}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Districts Group */}
                  {suggestions.districts.length > 0 && (
                    <div className="border-t border-[#1e293b] pt-1.5">
                      <span className="block px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Districts ({suggestions.districts.length})
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {suggestions.districts.map((dist) => (
                          <button
                            key={dist.district_id}
                            type="button"
                            onClick={() => handleSelectDistrict(dist)}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-[#0f1c33]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin size={13} className="shrink-0 text-emerald-400" />
                              <div>
                                <p className="font-semibold text-slate-100">
                                  {dist.name}
                                </p>
                                <p className="font-mono text-[10px] text-slate-400">
                                  {dist.state} ({dist.tier})
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] font-semibold text-slate-400">
                              {dist.placement_rate}% Placed
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search All button */}
                  <div className="border-t border-[#1e293b] pt-1.5">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500/10 border border-sky-400/20 py-1.5 font-mono text-xs font-semibold text-sky-400 transition hover:bg-sky-500/20"
                    >
                      <span>Search for "{searchQuery}" in Registry</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-3 text-center text-xs text-slate-400">
                  <p>No exact candidate or district match.</p>
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="mt-1.5 font-mono text-[11px] font-bold text-sky-400 hover:underline"
                  >
                    Press Enter to search entire registry →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-[#0b1528] text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-[#0f1c33] hover:text-slate-900 dark:hover:text-white"
          >
            <Bell size={14} />
            <span className="absolute right-1.5 top-1.5 flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0b1528] p-3 shadow-xl dark:shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800 dark:text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e293b] pb-2">
                <span className="font-heading text-xs font-bold text-slate-900 dark:text-white">
                  System Alerts
                </span>
                <span className="rounded border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600 dark:text-sky-300">
                  3 Active
                </span>
              </div>

              <div className="mt-2 divide-y divide-slate-100 dark:divide-[#1e293b]">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2 text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400 text-[11px] leading-tight">{n.desc}</p>
                    <span className="mt-1 block font-mono text-[10px] text-slate-400 dark:text-slate-500">{n.time}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="mt-2 w-full rounded-lg bg-slate-100 dark:bg-[#070d18] border border-slate-200 dark:border-[#1e293b] py-1.5 text-center font-mono text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              >
                Acknowledge All Alerts
              </button>
            </div>
          )}
        </div>

        <div className="hidden h-5 w-px bg-slate-200 dark:bg-[#1e293b] sm:block" />

        {/* User Identity / Profile Menu with Logout */}
        <div ref={profileContainerRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-slate-100 dark:hover:bg-[#0b1528]"
            title="Institutional Profile & Settings"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/30 bg-gradient-to-br from-sky-500 to-indigo-600 font-mono text-xs font-bold text-slate-950 shadow-xs">
              {initials}
            </div>

            <div className="hidden text-left xl:block">
              <p className="font-heading text-xs font-bold leading-tight text-slate-900 dark:text-white">
                {user?.full_name || "Aman Mishra"}
              </p>
              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {user?.role ? formatRole(user.role) : "Central Policy Advisor"}
              </p>
            </div>

            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0b1528] p-3 shadow-xl dark:shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800 dark:text-slate-200">
              <div className="border-b border-slate-100 dark:border-[#1e293b] pb-2.5">
                <p className="font-heading text-xs font-bold text-slate-900 dark:text-white">
                  {user?.full_name || "Aman Mishra"}
                </p>
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {user?.email || "aman.mishra@msde.gov.in"}
                </p>
                <span className="mt-1.5 inline-block rounded border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-700 dark:text-sky-300">
                  {user?.role ? formatRole(user.role) : "National MSDE Officer"}
                </span>
              </div>

              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0f1c33] hover:text-slate-900 dark:hover:text-white transition"
                >
                  <Shield size={14} className="text-sky-500 dark:text-sky-400" />
                  <span>Platform Settings</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition"
                >
                  <LogOut size={14} />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
