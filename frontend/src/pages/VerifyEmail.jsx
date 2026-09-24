import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  Mail,
  Send,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();

  const token = searchParams.get("token");

  // State: "loading" | "success" | "already_verified" | "error" | "missing_token"
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [errorCode, setErrorCode] = useState("");

  // Resend Form State
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null); // { type: 'success' | 'error', text: '' }

  useEffect(() => {
    if (!token) {
      setStatus("missing_token");
      setMessage("Verification token is missing or incomplete. Please click the full link in your verification email.");
      return;
    }

    let isMounted = true;

    async function performVerification() {
      try {
        const response = await authApi.verifyEmail(token);
        if (!isMounted) return;

        if (response.message?.toLowerCase().includes("already verified")) {
          setStatus("already_verified");
          setMessage(response.message || "Your email is already verified.");
        } else {
          setStatus("success");
          setMessage(response.message || "Email address verified successfully.");
        }
      } catch (err) {
        if (!isMounted) return;

        const serverError = err.response?.data?.error;
        const code = serverError?.code || "VERIFICATION_FAILED";
        const msg = serverError?.message || getErrorMessage(err, "We could not verify your email.");

        setErrorCode(code);
        setStatus("error");
        setMessage(msg);
      }
    }

    performVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail || !resendEmail.trim()) {
      setResendStatus({
        type: "error",
        text: "Please enter your registered email address.",
      });
      return;
    }

    setIsResending(true);
    setResendStatus(null);

    try {
      const response = await authApi.resendVerification(resendEmail.trim());
      setResendStatus({
        type: "success",
        text: response.message || "A new verification link has been sent to your email.",
      });
    } catch (err) {
      setResendStatus({
        type: "error",
        text: getErrorMessage(err, "Failed to send verification email. Please try again later."),
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-12 selection:bg-sky-500 selection:text-white">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-sky-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[350px] w-[500px] rounded-full bg-indigo-600/10 blur-[100px]" />
      </div>

      {/* Top Header Bar */}
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

      {/* Main Card */}
      <main className="relative z-10 w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {/* 1. Loading State */}
          {status === "loading" && (
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-500/10">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h1 className="font-heading text-xl font-bold tracking-tight text-white">
                Verifying Email
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Validating your cryptographic verification link with the National Skilling Registry...
              </p>
            </div>
          )}

          {/* 2. Success State */}
          {(status === "success" || status === "already_verified") && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Identity Verified</span>
              </div>
              <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight text-white">
                {status === "already_verified" ? "Already Verified!" : "Email Verified!"}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {message || "Your KaushalNexus account is fully activated. You can now sign in to access your skills dashboard and opportunities."}
              </p>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 text-xs font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-400 hover:to-indigo-500 hover:shadow-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* 3. Error or Expired Token State */}
          {(status === "error" || status === "missing_token") && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-lg shadow-rose-500/20">
                {errorCode === "VERIFICATION_TOKEN_EXPIRED" ? (
                  <Clock className="h-9 w-9 text-amber-400" />
                ) : (
                  <AlertCircle className="h-9 w-9 text-rose-400" />
                )}
              </div>

              <h1 className="font-heading text-xl font-bold tracking-tight text-white">
                {errorCode === "VERIFICATION_TOKEN_EXPIRED"
                  ? "Verification Link Expired"
                  : "Verification Failed"}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {message}
              </p>

              {/* Resend Verification Form */}
              <div className="mt-6 w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Mail className="h-4 w-4 text-sky-400" />
                  <span>Request a New Verification Link</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Enter your email address below to receive a fresh verification link.
                </p>

                <form onSubmit={handleResend} className="mt-3 space-y-2.5">
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="h-9 w-full rounded-lg border border-slate-700 bg-slate-800/90 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  {resendStatus && (
                    <div
                      className={`rounded-lg p-2.5 text-[11px] leading-relaxed ${
                        resendStatus.type === "success"
                          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {resendStatus.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isResending}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <Link
                to="/login"
                className="mt-5 text-xs font-medium text-slate-400 transition hover:text-sky-400"
              >
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
