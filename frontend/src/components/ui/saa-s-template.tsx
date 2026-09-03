"use client";

import React, { useState, memo } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "./button";

export interface SaasNavigationProps {
  logo?: React.ReactNode;
  navLinks?: Array<{ label: string; href: string }>;
  signInText?: string;
  signUpText?: string;
  onSignIn?: () => void;
  onSignUp?: () => void;
  signInHref?: string;
  signUpHref?: string;
}

export const SaasNavigation = memo(
  ({
    logo = "Logo",
    navLinks = [
      { label: "Getting started", href: "#getting-started" },
      { label: "Components", href: "#components" },
      { label: "Documentation", href: "#documentation" },
    ],
    signInText = "Sign in",
    signUpText = "Sign Up",
    onSignIn,
    onSignUp,
    signInHref = "/login",
    signUpHref = "/register",
  }: SaasNavigationProps) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
      <header className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-black/80 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              {typeof logo === "string" ? <span>{logo}</span> : logo}
            </div>

            {/* Desktop Center Links */}
            <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSignIn}
                asChild={!!signInHref && !onSignIn}
              >
                {signInHref && !onSignIn ? (
                  <a href={signInHref}>{signInText}</a>
                ) : (
                  signInText
                )}
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onSignUp}
                asChild={!!signUpHref && !onSignUp}
              >
                {signUpHref && !onSignUp ? (
                  <a href={signUpHref}>{signUpText}</a>
                ) : (
                  signUpText
                )}
              </Button>
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="md:hidden text-white p-1 hover:text-gray-300 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800/50">
            <div className="px-6 py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-white/60 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-800/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onSignIn) onSignIn();
                  }}
                  asChild={!!signInHref && !onSignIn}
                >
                  {signInHref && !onSignIn ? (
                    <a href={signInHref}>{signInText}</a>
                  ) : (
                    signInText
                  )}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onSignUp) onSignUp();
                  }}
                  asChild={!!signUpHref && !onSignUp}
                >
                  {signUpHref && !onSignUp ? (
                    <a href={signUpHref}>{signUpText}</a>
                  ) : (
                    signUpText
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }
);
SaasNavigation.displayName = "SaasNavigation";

export interface SaasHeroProps {
  announcementText?: string;
  announcementLinkText?: string;
  announcementHref?: string;
  headline?: React.ReactNode;
  subheadline?: React.ReactNode;
  ctaText?: string;
  onCtaClick?: () => void;
  ctaHref?: string;
  dashboardImageSrc?: string;
  glowImageSrc?: string;
  className?: string;
}

const DEFAULT_GLOW_IMG =
  "https://cdn.21st.dev/assets/mirror/ab/abe6d8090cc14780b846eee062024e4e03274c99d38188554239cd312a7180fa.png";
const DEFAULT_DASHBOARD_IMG =
  "https://cdn.21st.dev/assets/mirror/a9/a9c7043f8f41ca34d70f771cba29b4ba6d11ef8f5f51c90d21f220fea109d6af.png";

export const SaasHero = memo(
  ({
    announcementText = "New version of template is out!",
    announcementLinkText = "Read more",
    announcementHref = "#new-version",
    headline,
    subheadline,
    ctaText = "Get started",
    onCtaClick,
    ctaHref = "/register",
    dashboardImageSrc = DEFAULT_DASHBOARD_IMG,
    glowImageSrc = DEFAULT_GLOW_IMG,
    className = "",
  }: SaasHeroProps) => {
    return (
      <section
        className={`relative min-h-screen flex flex-col items-center justify-start px-6 py-20 md:py-28 overflow-hidden bg-black text-white ${className}`}
        style={{ animation: "fadeIn 0.6s ease-out" }}
      >
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        {/* Announcement Badge */}
        {announcementText && (
          <aside className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 backdrop-blur-sm max-w-full shadow-sm">
            <span
              className="text-xs text-center whitespace-nowrap"
              style={{ color: "#9ca3af" }}
            >
              {announcementText}
            </span>
            {announcementLinkText && (
              <a
                href={announcementHref}
                className="flex items-center gap-1 text-xs hover:text-white transition-all active:scale-95 whitespace-nowrap font-medium"
                style={{ color: "#9ca3af" }}
                aria-label={announcementLinkText}
              >
                <span>{announcementLinkText}</span>
                <ArrowRight size={12} />
              </a>
            )}
          </aside>
        )}

        {/* Headline with Vertical Gradient Text */}
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-medium text-center max-w-3xl px-6 leading-tight mb-6 tracking-tight"
          style={{
            background:
              "linear-gradient(to bottom, #ffffff, #ffffff, rgba(255, 255, 255, 0.6))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.05em",
          }}
        >
          {headline || (
            <>
              Give your big idea <br />
              the website it deserves
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p
          className="text-sm md:text-base text-center max-w-2xl px-6 mb-10 leading-relaxed font-normal"
          style={{ color: "#9ca3af" }}
        >
          {subheadline || (
            <>
              Landing page kit template with React, Shadcn/ui and Tailwind <br />
              that you can copy/paste into your project.
            </>
          )}
        </p>

        {/* CTA Button */}
        <div className="flex items-center gap-4 relative z-10 mb-16">
          <Button
            type="button"
            variant="gradient"
            size="lg"
            className="rounded-lg flex items-center justify-center font-semibold cursor-pointer"
            onClick={onCtaClick}
            aria-label={ctaText}
          >
            {ctaHref && !onCtaClick ? (
              <a href={ctaHref} className="flex items-center gap-2">
                <span>{ctaText}</span>
              </a>
            ) : (
              <span>{ctaText}</span>
            )}
          </Button>
        </div>

        {/* Dashboard Preview Mockup with Glowing Ambient Flare */}
        <div className="w-full max-w-5xl relative pb-20">
          {/* Ambient light glow backdrop */}
          {glowImageSrc && (
            <div
              className="absolute left-1/2 w-[90%] pointer-events-none z-0"
              style={{ top: "-23%", transform: "translateX(-50%)" }}
              aria-hidden="true"
            >
              <img
                src={glowImageSrc}
                alt=""
                className="w-full h-auto opacity-80"
                loading="eager"
              />
            </div>
          )}

          {/* Interactive / High-Resolution Mockup */}
          <div className="relative z-10 rounded-xl border border-gray-800/80 bg-gray-950/60 p-1.5 shadow-2xl backdrop-blur-xs">
            <img
              src={dashboardImageSrc}
              alt="Dashboard preview showing analytics and metrics interface"
              className="w-full h-auto rounded-lg shadow-2xl border border-gray-800/50"
              loading="eager"
            />
          </div>
        </div>
      </section>
    );
  }
);
SaasHero.displayName = "SaasHero";

export interface SaasTemplateProps
  extends SaasNavigationProps,
    SaasHeroProps {}

export default function SaasTemplate(props: SaasTemplateProps) {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <SaasNavigation {...props} />
      <SaasHero {...props} />
    </main>
  );
}
