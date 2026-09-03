import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Sparkles } from "lucide-react";
import SaasTemplate from "@/components/ui/saa-s-template";

export default function SaasTemplatePage() {
  const navigate = useNavigate();
  const [useKaushalNexusTheme, setUseKaushalNexusTheme] = useState(true);

  return (
    <div className="relative min-h-screen bg-black">
      {/* Top Banner Control Bar */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-black/80 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md transition hover:bg-gray-800"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>

        <button
          type="button"
          onClick={() => setUseKaushalNexusTheme(!useKaushalNexusTheme)}
          className="flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-950/70 px-3.5 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-md transition hover:bg-blue-900/80"
        >
          <Sparkles size={13} />
          <span>{useKaushalNexusTheme ? "Show Original 21st.dev Theme" : "Show KaushalNexus Theme"}</span>
        </button>
      </div>

      {useKaushalNexusTheme ? (
        <SaasTemplate
          logo={
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <ShieldCheck size={18} />
              </div>
              <div className="flex items-center tracking-tight text-base font-bold">
                <span className="text-white">KAUSHAL</span>
                <span className="text-blue-400">NEXUS</span>
              </div>
            </Link>
          }
          navLinks={[
            { label: "Impact Dashboard", href: "/dashboard" },
            { label: "Learner Dossiers", href: "/learner" },
            { label: "Skill Gap Matrix", href: "/skill-gap" },
            { label: "Regional Intelligence", href: "/regional" },
          ]}
          announcementText="National Skilling & Longitudinal Employment Intelligence"
          announcementLinkText="Explore AI Diagnostics"
          announcementHref="/dashboard"
          headline={
            <>
              Transform Skilling Outcomes <br />
              Into Measured Career Trajectories
            </>
          }
          subheadline={
            <>
              AI-driven longitudinal tracking beyond binary placement metrics. <br />
              Real-time monitoring across wage progression, retention milestones, and employer matching.
            </>
          }
          ctaText="Access Platform"
          ctaHref="/register"
          signInText="Login"
          signUpText="Register"
          signInHref="/login"
          signUpHref="/register"
        />
      ) : (
        <SaasTemplate />
      )}
    </div>
  );
}
