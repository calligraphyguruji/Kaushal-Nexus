import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Building,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { UserRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from "../utils/permissions";

const FORM_INPUT_CLASSES =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-800 dark:focus:text-white";

const FORM_PASSWORD_CLASSES =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-800 dark:focus:text-white";

const FORM_SELECT_CLASSES =
  "h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-8 text-xs text-slate-900 transition-colors focus:border-blue-500 focus:bg-white focus:text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:bg-slate-800 dark:focus:text-white";

export default function Register() {
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(UserRole.STATE_ADMIN);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Register with authoritative backend RBAC API
      const registerData = {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        full_name: fullName.trim(),
        role: role,
      };

      await authApi.register(registerData);

      setSuccess(true);
      setTimeout(() => {
        navigate("/login", {
          state: { registeredEmail: email.trim().toLowerCase() },
          replace: true,
        });
      }, 1200);
    } catch (err) {
      console.error("Registration error:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-blue-950 dark:selection:text-blue-200">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 px-6 py-3.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
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
                Institutional User Onboarding Portal
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
            >
              Sign In to Existing Account →
            </Link>

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
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-12 lg:items-center">
          {/* Left Highlights */}
          <div className="space-y-5 lg:col-span-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              <Sparkles size={13} className="text-blue-600 dark:text-blue-400" />
              <span>Authoritative Role-Based Access Control</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                Institutional Stakeholder Registration
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Join the unified national skilling and longitudinal intelligence network. Register
                your institutional account to access scoped telemetry, candidate dossiers, bridge interventions,
                and employer hiring mandates.
              </p>
            </div>

            {/* Feature Points */}
            <div className="space-y-3.5 border-t border-slate-200/80 pt-5 dark:border-slate-800">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/70 p-3 text-xs text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Institutional Jurisdictional Scoping:
                  </span>{" "}
                  Data access is deterministically scoped to your state, training center, or hiring pipeline.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/70 p-3 text-xs text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    PII Data Redaction:
                  </span>{" "}
                  Beneficiary contact details are automatically masked in compliance with digital privacy standards.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/70 p-3 text-xs text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Compliance & Security Audit Logging:
                  </span>{" "}
                  Security and administrative events are recorded with correlation IDs for authorized compliance review.
                </div>
              </div>
            </div>
          </div>

          {/* Right Form */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 lg:col-span-7">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Register Institutional User
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Enter your credentials and select your authoritative stakeholder role.
              </p>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                <span>Registration successful! Redirecting to institutional login...</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name *
                </label>
                <div className="relative mt-1">
                  <User
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Varma"
                    className={FORM_INPUT_CLASSES}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Institutional Email Address *
                </label>
                <div className="relative mt-1">
                  <Mail
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. officer@msde.gov.in"
                    className={FORM_INPUT_CLASSES}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Authoritative Institutional Role *
                </label>
                <div className="relative mt-1">
                  <Building
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={FORM_SELECT_CLASSES}
                  >
                    <option value={UserRole.MSDE_OFFICER}>
                      MSDE_OFFICER — {ROLE_LABELS[UserRole.MSDE_OFFICER]}
                    </option>
                    <option value={UserRole.STATE_ADMIN}>
                      STATE_ADMIN — {ROLE_LABELS[UserRole.STATE_ADMIN]}
                    </option>
                    <option value={UserRole.TRAINING_PROVIDER}>
                      TRAINING_PROVIDER — {ROLE_LABELS[UserRole.TRAINING_PROVIDER]}
                    </option>
                    <option value={UserRole.EMPLOYER}>
                      EMPLOYER — {ROLE_LABELS[UserRole.EMPLOYER]}
                    </option>
                    <option value={UserRole.EVALUATOR}>
                      EVALUATOR — {ROLE_LABELS[UserRole.EVALUATOR]}
                    </option>
                    <option value={UserRole.SYSTEM_ADMIN}>
                      SYSTEM_ADMIN — {ROLE_LABELS[UserRole.SYSTEM_ADMIN]}
                    </option>
                    <option value={UserRole.LEARNER}>
                      LEARNER — {ROLE_LABELS[UserRole.LEARNER]}
                    </option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password *
                </label>
                <div className="relative mt-1">
                  <Lock
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters with letters & numbers"
                    className={FORM_PASSWORD_CLASSES}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span>
                    I agree to the National Data Governance Framework and Institutional Confidentiality Terms.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !agreeTerms}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Provisioning Institutional Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Institutional Account</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-200/80 pt-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Already hold verified institutional credentials?{" "}
              <Link to="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-4 text-center text-xs text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-400">
        © 2026 Ministry of Skill Development & Entrepreneurship (MSDE). KaushalNexus Skilling Intelligence Platform.
      </footer>
    </div>
  );
}
