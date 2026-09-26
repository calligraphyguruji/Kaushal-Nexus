import { useEffect } from "react";

const SITE_URL = "https://kaushal-nexus.vercel.app";
const DEFAULT_TITLE = "KaushalNexus — AI-Powered Skill & Employment Intelligence";
const DEFAULT_DESCRIPTION =
  "AI-powered skill assessment, skill-gap analysis, internship matching and employment intelligence for learners and workforce development.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * SEOHead: Enterprise SEO & Metadata Manager for KaushalNexus
 * Manages document title, meta descriptions, canonical URLs, Open Graph,
 * Twitter Card, robots directives, and Schema.org JSON-LD.
 */
export default function SEOHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = "/",
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
  structuredData = null,
}) {
  const cleanPath = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const canonicalUrl = `${SITE_URL}${cleanPath === "/" ? "" : cleanPath}`;
  const fullTitle = title.includes("KaushalNexus") ? title : `${title} | KaushalNexus`;
  const robotsDirective = noindex
    ? "noindex, nofollow"
    : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

  useEffect(() => {
    // 1. Title
    document.title = fullTitle;

    // Helper to create or update meta tag
    const setMetaTag = (attribute, name, content) => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // 2. Standard Meta
    setMetaTag("name", "description", description);
    setMetaTag("name", "robots", robotsDirective);

    // 3. Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalUrl);

    // 4. Open Graph Meta
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", canonicalUrl);
    setMetaTag("property", "og:type", ogType);
    setMetaTag("property", "og:image", ogImage);
    setMetaTag("property", "og:site_name", "KaushalNexus");

    // 5. Twitter Card Meta
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", ogImage);

    // 6. Structured Data (JSON-LD)
    const existingScript = document.getElementById("kn-json-ld");
    if (existingScript) {
      existingScript.remove();
    }

    if (structuredData && !noindex) {
      const script = document.createElement("script");
      script.id = "kn-json-ld";
      script.type = "application/ld+json";
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    return () => {
      const s = document.getElementById("kn-json-ld");
      if (s) s.remove();
    };
  }, [fullTitle, description, canonicalUrl, ogType, ogImage, robotsDirective, structuredData, noindex]);

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={robotsDirective} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="KaushalNexus" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {structuredData && !noindex && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
    </>
  );
}
