import { useState } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getErrorMessage } from "../api/client";

// Pre-seeded Demo Credentials for Institutional Testing (6 Authoritative Backend Roles)
const DEMO_PRESETS = [
  {
    roleName: "MSDE Officer",
    role: "MSDE_OFFICER",
    email: "aman.mishra@msde.gov.in",
    password: "KaushalNexus2026!",
    badge: "MSDE Central",
    desc: "National Policy & Super Admin Bypass",
  },
  {
    roleName: "State Administrator",
    role: "STATE_ADMIN",
    email: "director.upssdm@up.gov.in",
    password: "KaushalNexus2026!",
    badge: "State Mission",
    desc: "State Jurisdiction Monitoring (UP-SDM)",
  },
  {
    roleName: "Training Provider",
    role: "TRAINING_PROVIDER",
    email: "head.varanasi@pmkk-apex.org",
    password: "KaushalNexus2026!",
    badge: "PMKK Center",
    desc: "Candidate Enrollment & Bridge Training",
  },
  {
    roleName: "Corporate Employer",
    role: "EMPLOYER",
    email: "talent@tcs.com",
    password: "KaushalNexus2026!",
    badge: "Industry Partner",
    desc: "Hiring Mandates & Placement Tracking",
  },
  {
    roleName: "Assessment Evaluator",
    role: "EVALUATOR",
    email: "evaluator.up@assessment.gov.in",
    password: "KaushalNexus2026!",
    badge: "Evaluation Body",
    desc: "NCVET Credential & Skill Auditing",
  },
  {
    roleName: "System Administrator",
    role: "SYSTEM_ADMIN",
    email: "sysadmin@kaushalnexus.gov.in",
    password: "KaushalNexus2026!",
    badge: "SysAdmin",
    desc: "Platform Governance & Audit Logs",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [email, setEmail] = useState("aman.mishra@msde.gov.in");
  const [password, setPassword] = useState("KaushalNexus2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // If already authenticated, redirect to /dashboard
  if (!isLoading && isAuthenticated) {
    const destination = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email address and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      localStorage.removeItem("kn_current_learner");
      await login({ email: email.trim(), password });
      window.dispatchEvent(new Event("kn-profile-updated"));
      const destination = location.state?.from?.pathname || "/dashboard";
      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Login attempt failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPreset = (preset) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setError(null);
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-blue-950 dark:selection:text-blue-200">
      {/* Top Ministry Header */}
      <header className="border-b border-slate-200/80 bg-white/90 px-6 py-3.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs dark:bg-blue-600">
              <ShieldCheck size={20} className="text-blue-400 dark:text-white" />
            </div>
            <div>
              <div className="flex items-center tracking-tight">
                <span className="text-sm font-extrabold text-slate-950 dark:text-white">
                  KAUSHAL
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">NEXUS</span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                National Skilling & Longitudinal Employment Platform
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/register"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hidden sm:inline-block"
            >
              Learner Register →
            </Link>

            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 sm:inline-flex dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Official Portal · MSDE
            </span>

            {/* Theme Toggle Button */}
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

      {/* Main Form Center Area */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-12 lg:items-center">
          {/* Left Hero Brand Summary (5 cols on lg) */}
          <div className="space-y-4 lg:col-span-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              <KeyRound size={13} className="text-blue-600 dark:text-blue-400" />
              <span>Institutional Sign In</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              Institutional Access & Governance Portal
            </h1>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Authorized access for Ministry Officials, State Skill Missions (SDM), accredited
              PMKK training centers, and corporate hiring partners.
            </p>

            {/* Feature Checkpoints */}
            <div className="space-y-2.5 border-t border-slate-200/80 pt-4 dark:border-slate-800">
              <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Longitudinal 3M, 6M & 12M EPFO Employment Tracking</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Geospatial Demand vs Supply Skill Gap Intelligence</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Explainable Multi-Signal Employer Matching Engine</span>
              </div>
            </div>
          </div>

          {/* Right Login Card (7 cols on lg) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 lg:col-span-7">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Sign in to your Institutional Account
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Enter your credentials or click a pre-configured demo account below.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Institutional Email / User ID
                </label>
                <div className="relative mt-1.5">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@msde.gov.in"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Security Password
                  </label>
                </div>
                <div className="relative mt-1.5">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 font-semibold text-xs text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate & Access Platform</span>
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                Are you a learner?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                >
                  Create Learner Account
                </Link>{" "}
                ·{" "}
                <Link
                  to="/"
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  ← Back to Home
                </Link>
              </div>
            </form>

            {/* Quick Demo Preset Switcher for Role Evaluation */}
            <div className="mt-6 border-t border-slate-200/80 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pre-Loaded RBAC Demo Roles (Click to Autofill):
                </span>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.roleName}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="flex flex-col items-start rounded-lg border border-slate-200/80 bg-slate-50/80 p-2 text-left transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
                  >
                    <div className="flex w-full items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {preset.roleName}
                      </span>
                      <span className="shrink-0 rounded border border-slate-200/80 bg-slate-200/80 px-1 py-0.5 text-[9px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {preset.badge}
                      </span>
                    </div>
                    <span className="mt-0.5 w-full truncate text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      {preset.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-4 text-center text-xs text-slate-500 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
        <p>
          KaushalNexus · National Skilling Intelligence & Longitudinal Employment Platform · Ministry
          of Skill Development & Entrepreneurship (MSDE)
        </p>
      </footer>
    </div>
  );
}
