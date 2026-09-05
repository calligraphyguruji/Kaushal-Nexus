import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import DiagnosticMCQAssessment from "../components/DiagnosticMCQAssessment";

export default function LearnerAssessmentPage() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-sky-500/20 selection:text-sky-500 dark:bg-slate-950 dark:text-slate-100 font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 px-6 py-3.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/learner"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
            >
              <ArrowLeft size={15} />
              <span>Back to Dashboard</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs dark:bg-sky-600">
                <ShieldCheck size={18} className="text-sky-400 dark:text-white" />
              </div>
              <div>
                <span className="text-sm font-extrabold text-slate-950 dark:text-white">
                  KAUSHAL<span className="text-sky-600 dark:text-sky-400">NEXUS</span>
                </span>
                <span className="ml-2 hidden rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-sky-600 dark:text-sky-400 sm:inline">
                  NSQF DIAGNOSTIC
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {resolvedTheme === "dark" ? (
                <Sun size={15} className="text-amber-400" />
              ) : (
                <Moon size={15} className="text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <DiagnosticMCQAssessment />
      </main>
    </div>
  );
}