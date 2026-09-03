import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import MetroHero from "@/components/ui/scroll-locked-video-hero";

export default function Experience() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#05070d]">
      {/* Floating Exit / Navigation Bar */}
      <div className="fixed top-5 left-5 z-50 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Scroll-Locked Video Hero */}
      <MetroHero
        title="KAUSHAL NEXUS"
        tagline="Connecting Verified Skills with National Career Opportunities."
        scrollHint="SCROLL TO EXPLORE"
        signature={{ name: "KaushalNexus", url: "/" }}
        actionLabel="Explore Platform Features"
        onActionClick={() => navigate("/#benefits")}
        unlockOnEnd={true}
      />
    </div>
  );
}
