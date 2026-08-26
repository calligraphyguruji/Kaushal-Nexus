import {
  Search,
  Bell,
  Menu,
} from "lucide-react";

export default function Topbar({ onMenuClick }) {

  const currentHour = new Date().getHours();

  const greeting =
    currentHour >= 4 && currentHour < 12
      ? "Good morning"
      : currentHour >= 12 && currentHour < 17
      ? "Good afternoon"
      : currentHour >= 17 && currentHour < 21
      ? "Good evening"
      : "Good night";

  const today = new Date();

  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">

      {/* Left Section */}
      <div className="flex min-w-0 items-center gap-3">

        {/* Mobile Menu */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 lg:hidden"
        >
          <Menu size={20} />
        </button>


        {/* Greeting */}
        <div className="min-w-0">

          <p className="hidden text-xs font-medium text-slate-400 sm:block">
            {formattedDate}
          </p>

          <h2 className="truncate text-base font-bold tracking-tight text-slate-900 sm:mt-0.5 sm:text-xl">
            {greeting}, Admin
          </h2>

        </div>

      </div>


      {/* Right Controls */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">

        {/* Search */}
        <div className="relative hidden md:block">

          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search..."
            className="h-10 w-56 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          />

        </div>


        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
        >

          <Bell size={18} />

          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />

        </button>


        {/* Divider */}
        <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />


        {/* Administrator */}
        <div className="flex items-center gap-2 sm:gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-900 sm:h-10 sm:w-10">
            A
          </div>

          <div className="hidden sm:block">

            <p className="text-sm font-semibold text-slate-800">
              Administrator
            </p>

            <p className="text-[11px] text-slate-400">
              Government Portal
            </p>

          </div>

        </div>

      </div>

    </header>
  );
}