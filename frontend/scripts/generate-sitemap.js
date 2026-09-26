import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ALL_INTERNSHIPS } from "../src/data/internshipsData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://kaushal-nexus.vercel.app";
const today = new Date().toISOString().split("T")[0];

const staticRoutes = [
  {
    path: "/",
    priority: "1.0",
    changefreq: "weekly",
  },
  {
    path: "/internships",
    priority: "0.9",
    changefreq: "daily",
  },
];

// Build XML structure
let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

// Add static public routes
for (const route of staticRoutes) {
  xml += `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
}

// Add verified dynamic internship detail routes
for (const internship of ALL_INTERNSHIPS) {
  if (!internship.id) continue;
  const lastmod = internship.deadline || today;
  xml += `  <url>
    <loc>${BASE_URL}/internships/${encodeURIComponent(internship.id)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
}

xml += `</urlset>
`;

const outputPath = path.resolve(__dirname, "../public/sitemap.xml");
fs.writeFileSync(outputPath, xml, "utf-8");

console.log(`✅ sitemap.xml generated successfully with ${staticRoutes.length + ALL_INTERNSHIPS.length} URLs at ${outputPath}`);
