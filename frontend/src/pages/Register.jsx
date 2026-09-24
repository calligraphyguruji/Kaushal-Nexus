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
  Phone,
  GraduationCap,
  Target,
  MapPin,
  BrainCircuit,
  BookOpen,
  Send,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/auth";
import { learnerPipelineApi } from "../api/learnerPipeline";
import { getErrorMessage } from "../api/client";
import { UserRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from "../utils/permissions";
import { ASSESSMENT_DOMAINS } from "../data/assessmentQuestionBank";
import DiagnosticMCQAssessment from "../components/DiagnosticMCQAssessment";
import { upsertCandidateInRegistry } from "../utils/candidateRegistry";

const FORM_INPUT_CLASSES =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:bg-white focus:text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-800 dark:focus:text-white";

const FORM_PASSWORD_CLASSES =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:bg-white focus:text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-800 dark:focus:text-white";

const FORM_SELECT_CLASSES =
  "h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-8 text-xs text-slate-900 transition-colors focus:border-sky-500 focus:bg-white focus:text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-800 dark:focus:text-white";

export default function Register() {
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { login } = useAuth();

  // Registration Mode: 'learner' (default) vs 'institutional'
  const [accountType, setAccountType] = useState("learner");

  // Registration Flow Step: 'form' vs 'assessment'
  const [registrationStep, setRegistrationStep] = useState("form");
  const [registeredLearner, setRegisteredLearner] = useState(null);

  // Common Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Institutional Specific
  const [role, setRole] = useState(UserRole.STATE_ADMIN);

  // Learner Profile Specific Fields
  const [phone, setPhone] = useState("");
  const [educationLevel, setEducationLevel] = useState("B.Tech / BE (Information Technology)");
  const [institution, setInstitution] = useState("PMKK Skilling Center of Excellence");
  const [targetDomain, setTargetDomain] = useState("fullstack");
  const [district, setDistrict] = useState("Lucknow, Uttar Pradesh");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);

  // Handle Registration Submit
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const targetRole = accountType === "learner" ? UserRole.LEARNER : role;

      const registerData = {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        full_name: fullName.trim(),
        role: targetRole,
        phone: phone.trim() || undefined,
      };

      // 1. Register with backend RBAC API (which generates token & sends verification link)
      await authApi.register(registerData);

      // If registered as LEARNER: Prepare draft dossier locally
      if (accountType === "learner") {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        const learnerId = `KN-${new Date().getFullYear()}-${randNum}`;

        const learnerProfile = {
          id: learnerId,
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          education_level: educationLevel,
          institution: institution.trim(),
          district_id: district.trim(),
          target_domain: targetDomain,
          employment_readiness_score: 55,
          overall_progress: 10,
          status: "In Training",
          created_at: new Date().toISOString(),
        };

        // Persist candidate profile in national candidate registry
        const registered = upsertCandidateInRegistry(learnerProfile);
        localStorage.setItem("kn_current_learner", JSON.stringify(registered || learnerProfile));
        setRegisteredLearner(registered || learnerProfile);
      }

      setSuccess(true);
      // Explicitly stop here and require email verification before assessment
      setRegistrationStep("email_sent");
    } catch (err) {
      console.error("Registration error:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // If in email_sent step, render the Verification Email Sent screen
  if (registrationStep === "email_sent") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-12 selection:bg-sky-500 selection:text-white font-sans">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-sky-600/10 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 h-[350px] w-[500px] rounded-full bg-indigo-600/10 blur-[100px]" />
        </div>

        {/* Top Header */}
        <header className="absolute top-0 z-20 flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-md shadow-sky-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-sm font-bold tracking-tight text-white">
                Kaushal<span className="text-sky-400">Nexus</span>
              </span>
              <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                National Skilling Registry
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/80 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        {/* Verification Card */}
        <main className="relative z-10 w-full max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/85 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-500/20">
                <Mail className="h-8 w-8 text-sky-400" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-sky-500" />
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verification Link Dispatched</span>
              </div>

              <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-white">
                ✉️ Verification Email Sent!
              </h1>

              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs font-mono text-sky-300 break-all">
                {email}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                We have sent a secure 24-hour verification link to your email address. 
                <strong className="text-white block mt-1.5">
                  Please verify your email before taking the diagnostic assessment.
                </strong>
              </p>

              {/* 3 Step Instruction Guide */}
              <div className="mt-6 w-full rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 text-left">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Next Steps to Access Your Assessment:
                </h4>
                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-[10px] font-bold text-sky-400">1</span>
                    <span>Open your email inbox (also check Spam or Junk folder).</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-[10px] font-bold text-sky-400">2</span>
                    <span>Click the blue <strong className="text-white">"Verify Email Address"</strong> button.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-[10px] font-bold text-sky-400">3</span>
                    <span>Sign in to unlock your <strong className="text-white">10-Question NSQF MCQ Assessment</strong> and view 10+ dynamic internships!</span>
                  </div>
                </div>
              </div>

              {/* Resend Status Alert */}
              {resendMessage && (
                <div
                  className={`mt-4 w-full rounded-lg p-2.5 text-[11px] leading-relaxed text-left ${
                    resendMessage.type === "success"
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {resendMessage.text}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex w-full flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate("/login", { state: { registeredEmail: email } })}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 text-xs font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-400 hover:to-indigo-500 hover:shadow-sky-500/35 focus:outline-none"
                >
                  <span>Already Verified? Proceed to Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={isResending}
                  onClick={async () => {
                    setIsResending(true);
                    setResendMessage(null);
                    try {
                      const resp = await authApi.resendVerification(email.trim().toLowerCase());
                      setResendMessage({
                        type: "success",
                        text: resp.message || "A fresh verification link has been sent to your inbox.",
                      });
                    } catch (rErr) {
                      setResendMessage({
                        type: "error",
                        text: getErrorMessage(rErr, "Failed to send verification email. Please try again."),
                      });
                    } finally {
                      setIsResending(false);
                    }
                  }}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-50"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending new link...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If in assessment step, render full MCQ Diagnostic Assessment
  if (registrationStep === "assessment") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-sky-500/20 selection:text-sky-500 dark:bg-slate-950 dark:text-slate-100 font-sans">
        {/* Assessment View Header */}
        <header className="border-b border-slate-200/80 bg-white/90 px-6 py-3.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 sticky top-0 z-30">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs dark:bg-sky-600">
                <ShieldCheck size={20} className="text-sky-400 dark:text-white" />
              </div>
              <div>
                <div className="flex items-center tracking-tight">
                  <span className="text-sm font-extrabold text-slate-950 dark:text-white">
                    KAUSHAL<span className="text-sky-600 dark:text-sky-400">NEXUS</span>
                  </span>
                  <span className="ml-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    PROFILE ONBOARDED
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Step 2 of 2: Baseline NSQF Diagnostic MCQ Assessment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/learner")}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
              >
                <span>Skip to Dashboard</span>
                <ArrowRight size={14} />
              </button>
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

        {/* Post-Registration Welcome Ribbon */}
        <div className="border-b border-emerald-200 bg-emerald-50/80 px-6 py-2.5 text-center text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <span className="font-bold">Profile successfully registered!</span> Complete this 10-question MCQ diagnostic to evaluate your competencies and unlock 10+ dynamically matched internships.
        </div>

        {/* Main Assessment Container */}
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <DiagnosticMCQAssessment
            learnerInfo={registeredLearner}
            targetDomain={targetDomain}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900 selection:bg-sky-500/20 selection:text-sky-600 dark:bg-slate-950 dark:text-slate-100 font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 px-6 py-3.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs dark:bg-sky-600">
              <ShieldCheck size={20} className="text-sky-400 dark:text-white" />
            </div>
            <div>
              <div className="flex items-center tracking-tight">
                <span className="text-sm font-extrabold text-slate-950 dark:text-white">
                  KAUSHAL<span className="text-sky-600 dark:text-sky-400">NEXUS</span>
                </span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                National Skilling &amp; Intelligence Registry
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
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
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Highlights */}
          <div className="space-y-5 lg:col-span-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1 text-xs font-semibold text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
              <Sparkles size={13} className="text-sky-600 dark:text-sky-400" />
              <span>Vocational Intelligence Pipeline</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                {accountType === "learner"
                  ? "Register Learner Profile & Take MCQ Diagnostic"
                  : "Institutional Stakeholder Registration"}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {accountType === "learner"
                  ? "Register your candidate profile in the National Skilling Network. You will immediately take a 10-question baseline diagnostic assessment to evaluate competencies, initialize your Bayesian Knowledge Tracing (BKT) vector, and benchmark employment readiness."
                  : "Join the unified national skilling and longitudinal intelligence network. Register institutional credentials to access scoped regional telemetry, employer mandates, and longitudinal retention audits."}
              </p>
            </div>

            {/* Feature Points */}
            <div className="space-y-3 border-t border-slate-200/80 pt-5 dark:border-slate-800">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/70 p-3 text-xs text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300">
                <BrainCircuit size={16} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Immediate Diagnostic MCQ Assessment:
                  </span>{" "}
                  Take domain-specific MCQs directly after registration to measure your baseline readiness score.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/70 p-3 text-xs text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Bayesian Knowledge Tracing (BKT):
                  </span>{" "}
                  Scientific latent mastery estimation across national competency standards.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/70 p-3 text-xs text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300">
                <Target size={16} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Target Role &amp; Employer Alignment:
                  </span>{" "}
                  Connect with verified employer requirements and personalized bridge curriculum.
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 lg:col-span-7">
            {/* Account Type Toggle Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 mb-5">
              <button
                type="button"
                onClick={() => {
                  setAccountType("learner");
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                  accountType === "learner"
                    ? "bg-white text-sky-600 shadow-xs dark:bg-slate-900 dark:text-sky-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                🎓 Candidate / Learner Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountType("institutional");
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                  accountType === "institutional"
                    ? "bg-white text-sky-600 shadow-xs dark:bg-slate-900 dark:text-sky-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                🏛️ Institutional Stakeholder
              </button>
            </div>

            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {accountType === "learner"
                  ? "Step 1: Register Learner Profile"
                  : "Register Institutional Stakeholder"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {accountType === "learner"
                  ? "Enter your candidate information. You will proceed to the MCQ test immediately upon registration."
                  : "Enter your credentials and select your authoritative stakeholder role."}
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
                <span>
                  {accountType === "learner"
                    ? "Profile registered! Transitioning to your MCQ diagnostic assessment..."
                    : "Registration successful! Redirecting to login..."}
                </span>
              </div>
            )}

            <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
              {/* Full Legal Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Legal Name *
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
                    placeholder="e.g. Rahul Sharma"
                    className={FORM_INPUT_CLASSES}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {accountType === "learner" ? "Email Address *" : "Institutional Email Address *"}
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
                    placeholder={accountType === "learner" ? "e.g. rahul.sharma@example.com" : "e.g. officer@msde.gov.in"}
                    className={FORM_INPUT_CLASSES}
                  />
                </div>
              </div>

              {/* Password */}
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
                    placeholder="Min 8 characters"
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

              {/* LEARNER SPECIFIC FIELDS */}
              {accountType === "learner" && (
                <>
                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mobile / WhatsApp Number
                    </label>
                    <div className="relative mt-1">
                      <Phone
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                      />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className={FORM_INPUT_CLASSES}
                      />
                    </div>
                  </div>

                  {/* Target Skill Track / Assessment Domain */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Target Skill Track &amp; Diagnostic Domain *
                    </label>
                    <div className="relative mt-1">
                      <Target
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                      />
                      <select
                        value={targetDomain}
                        onChange={(e) => setTargetDomain(e.target.value)}
                        className={FORM_SELECT_CLASSES}
                      >
                        {ASSESSMENT_DOMAINS.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title} ({d.sector} • {d.nsqfLevel})
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-sky-600 dark:text-sky-400">
                      Your diagnostic MCQ assessment will evaluate competencies for this track.
                    </p>
                  </div>

                  {/* Highest Education Level */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Education Attainment
                      </label>
                      <div className="relative mt-1">
                        <GraduationCap
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                        />
                        <select
                          value={educationLevel}
                          onChange={(e) => setEducationLevel(e.target.value)}
                          className={FORM_SELECT_CLASSES}
                        >
                          <option value="B.Tech / BE (Information Technology)">B.Tech / BE (Engineering)</option>
                          <option value="Diploma / Polytechnic (3 Years)">Diploma / Polytechnic</option>
                          <option value="ITI Vocational Certificate">ITI Vocational Certificate</option>
                          <option value="B.Sc / BCA / Graduate">B.Sc / BCA / Graduate</option>
                          <option value="Higher Secondary (10+2)">Higher Secondary (10+2)</option>
                          <option value="Post Graduate (M.Tech / MCA / M.Sc)">Post Graduate</option>
                        </select>
                        <ChevronDown
                          size={14}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        District &amp; State
                      </label>
                      <div className="relative mt-1">
                        <MapPin
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                        />
                        <input
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="e.g. Lucknow, Uttar Pradesh"
                          className={FORM_INPUT_CLASSES}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Institution */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      College / Training Provider / PMKK Center
                    </label>
                    <div className="relative mt-1">
                      <BookOpen
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                      />
                      <input
                        type="text"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="e.g. UPSDM CoE Lucknow / PMKK Center"
                        className={FORM_INPUT_CLASSES}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* INSTITUTIONAL SPECIFIC FIELDS */}
              {accountType === "institutional" && (
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
              )}

              <div className="pt-2">
                <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span>
                    I agree to the National Data Governance Framework and Verification Standards.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !agreeTerms}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-sky-500 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>
                      {accountType === "learner"
                        ? "Registering Profile & Launching Assessment..."
                        : "Provisioning Institutional Account..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {accountType === "learner"
                        ? "Register Profile & Start MCQ Assessment"
                        : "Create Institutional Account"}
                    </span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-200/80 pt-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-sky-600 hover:underline dark:text-sky-400">
                Sign In
              </Link>
              {" · "}
              <Link to="/otp-login" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                Sign in with Mobile OTP →
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-4 text-center text-xs text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-400">
        © 2026 Ministry of Skill Development &amp; Entrepreneurship (MSDE). KaushalNexus Skilling Intelligence Platform.
      </footer>
    </div>
  );
}

