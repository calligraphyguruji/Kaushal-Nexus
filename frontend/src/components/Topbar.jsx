import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  X,
  User,
  MapPin,
  Sparkles,
  ArrowRight,
  Loader2,
  LogOut,
  Shield,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { learnersApi } from "../api/learners";
import { regionalApi } from "../api/regional";

import { UserRole, ROLE_LABELS } from "../utils/permissions";

export default function Topbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [role, setRole] = useState(
    user?.role ? (ROLE_LABELS[user.role] || user.role) : "National Policy View (MSDE)"
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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close search and profile suggestions when clicking outside
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

  // Handle Form Submission
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
    : "AM";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md transition-colors duration-150 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/95">
      {/* Left Section: Mobile toggle and Context / Role Switcher */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu size={18} />
        </button>

        {/* Role / Institutional Context Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50/80 pl-3 pr-8 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-slate-600 dark:focus:bg-slate-800"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
          </div>

          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 md:inline-flex dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sandbox Adapters Active (Demo)
          </span>
        </div>
      </div>

      {/* Right Section: Global Search Bar, Theme Toggle, Notifications, Admin Profile */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Global Search Container */}
        <div ref={searchContainerRef} className="relative hidden md:block">
          <form onSubmit={handleSearchSubmit}>
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setShowDropdown(true);
              }}
              placeholder="Search candidate, district, skill..."
              className="h-9 w-60 lg:w-72 rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-800"
            />
            {isSearching ? (
              <Loader2
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-blue-600 dark:text-blue-400"
              />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowDropdown(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-mono text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                /
              </kbd>
            )}
          </form>

          {/* Instant Search Suggestions Dropdown */}
          {showDropdown && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/80">
              {hasSuggestions ? (
                <div className="space-y-2">
                  {/* Candidates Group */}
                  {suggestions.learners.length > 0 && (
                    <div>
                      <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Candidates ({suggestions.learners.length})
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {suggestions.learners.map((learner) => (
                          <button
                            key={learner.id}
                            type="button"
                            onClick={() => handleSelectLearner(learner)}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <User size={13} className="shrink-0 text-blue-600 dark:text-blue-400" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                  {learner.full_name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {learner.id} · {learner.district_name || learner.district_id}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                              {learner.employment_readiness_score}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Districts Group */}
                  {suggestions.districts.length > 0 && (
                    <div className="border-t border-slate-100 pt-1.5 dark:border-slate-800">
                      <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Districts ({suggestions.districts.length})
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {suggestions.districts.map((dist) => (
                          <button
                            key={dist.district_id}
                            type="button"
                            onClick={() => handleSelectDistrict(dist)}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  {dist.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {dist.state} ({dist.tier})
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {dist.placement_rate}% Placed
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search All button */}
                  <div className="border-t border-slate-100 pt-1.5 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
                    >
                      <span>Search for "{searchQuery}" in Registry</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  <p>No exact candidate or district match.</p>
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="mt-1.5 text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
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
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Bell size={15} />
            <span className="absolute right-2 top-2 flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/60">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  National System Alerts
                </span>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.2 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300">
                  3 New
                </span>
              </div>

              <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2 text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                    <p className="mt-0.5 text-slate-500 text-[11px] leading-tight dark:text-slate-400">{n.desc}</p>
                    <span className="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">{n.time}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="mt-2 w-full rounded-md bg-slate-50 py-1.5 text-center text-xs font-semibold text-slate-600 hover:bg-slate-100 transition dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>

        <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-800" />

        {/* User Identity / Profile Menu with Logout */}
        <div ref={profileContainerRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Institutional Profile & Settings"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-2xs dark:bg-blue-600">
              {initials}
            </div>

            <div className="hidden text-left xl:block">
              <p className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100">
                {user?.full_name || "Aman Mishra"}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight dark:text-slate-500">
                {user?.role ? formatRole(user.role) : "Central Advisor · MSDE"}
              </p>
            </div>

            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/80">
              <div className="border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {user?.full_name || "Aman Mishra"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {user?.email || "aman.mishra@msde.gov.in"}
                </p>
                <span className="mt-1.5 inline-block rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
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
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Shield size={14} className="text-slate-400" />
                  <span>Platform Settings</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition dark:text-rose-400 dark:hover:bg-rose-950/40"
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