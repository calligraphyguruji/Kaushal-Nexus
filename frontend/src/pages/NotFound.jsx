import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Briefcase, Search, Home } from "lucide-react";
import SEOHead from "../components/SEOHead";
import { PageTransition } from "../components/motion/MotionSystem";

export default function NotFound() {
  return (
    <PageTransition className="min-h-screen bg-slate-50 dark:bg-[#070d18] text-slate-900 dark:text-[#f1f5f9] flex flex-col justify-between selection:bg-sky-500/20 selection:text-sky-500 font-sans antialiased">
      <SEOHead
        title="Page Not Found (404) | KaushalNexus"
        description="The page or resource you requested could not be found on KaushalNexus. Explore verified internships and skilling pathways."
        canonicalPath="/404"
        noindex={true}
      />

      {/* Header Bar */}
      <header className="h-20 border-b border-slate-200 dark:border-[#1e293b] bg-white/80 dark:bg-[#070d18]/80 backdrop-blur-md px-6 lg:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 p-1 group-hover:border-sky-400 transition-colors glow-cyan">
            <ShieldCheck size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
              Kaushal<span className="text-sky-600 dark:text-sky-400">Nexus</span>
            </span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              National Skilling &amp; Employment Platform
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          <Home size={15} />
          <span>Home</span>
        </Link>
      </header>

      {/* Main 404 Center Content */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1 text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
            <span>HTTP 404 · Resource Not Found</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-heading text-slate-950 dark:text-white">
            Page Not Found
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
            The page, internship, or registry profile you were looking for doesn&apos;t exist or has moved. Browse our verified opportunities or return home.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/internships"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-5 py-3 text-sm transition-all shadow-md shadow-sky-500/20 active:scale-98 cursor-pointer"
            >
              <Briefcase size={17} />
              <span>Explore Available Internships</span>
            </Link>

            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b1528] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold px-5 py-3 text-sm transition-all active:scale-98 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Return to Homepage</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200 dark:border-[#1e293b] py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>
          KaushalNexus · National Skilling Intelligence &amp; Longitudinal Employment Platform · Ministry of Skill Development &amp; Entrepreneurship (MSDE)
        </p>
      </footer>
    </PageTransition>
  );
}
