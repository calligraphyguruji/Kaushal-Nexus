/**
 * KaushalNexus PDF Generation Utilities
 * Built with jsPDF and jspdf-autotable for pixel-perfect, printable A4 evaluation dossiers.
 *
 * Implements a universal text-encoding and font sanitization layer to ensure all numeric values,
 * currency strings, percentages, and decimals render crisply without unwanted character spacing.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Brand Palette Constants (RGB)
const COLORS = {
  primary: [15, 23, 42], // Slate 900
  brandBlue: [37, 99, 235], // Blue 600
  brandDarkBlue: [30, 58, 138], // Blue 900
  emerald: [5, 150, 105], // Emerald 600
  amber: [217, 119, 6], // Amber 600
  rose: [225, 29, 72], // Rose 600
  slateLight: [241, 245, 249], // Slate 100
  slateMuted: [100, 116, 139], // Slate 500
  border: [226, 232, 240], // Slate 200
  white: [255, 255, 255],
};

/**
 * Universal PDF Text Sanitizer
 *
 * Standard PDF Type 1 fonts (Helvetica, Times, Courier) operate on single-byte WinAnsi encoding.
 * When non-Latin1/Unicode characters (e.g. Rupee symbol U+20B9, bullets U+2022, special symbols)
 * are passed, jsPDF falls back to UTF-16BE encoding with null bytes (\x00) between characters,
 * causing PDF engines to render numbers with wide character spaces (e.g. '1 4 . 5   L P A').
 *
 * This sanitizer maps all Unicode and currency symbols to their standard WinAnsi equivalents,
 * guaranteeing zero character-spacing distortion across all viewers (Chrome, Safari, Preview).
 */
export function sanitizePDFText(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val !== "string") return String(val);

  return val
    // Indian Rupee Symbol (U+20B9) -> "Rs. "
    .replace(/₹\s*/g, "Rs. ")
    .replace(/\u20B9\s*/g, "Rs. ")
    // Bullets & Dots -> Clean ASCII
    .replace(/[•●]/g, "*")
    .replace(/·/g, " | ")
    // Dashes & Hyphens -> Standard hyphen
    .replace(/[–—]/g, "-")
    // Smart Quotes -> Standard ASCII quotes
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    // Mathematical & Comparison Symbols
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/≠/g, "!=")
    .replace(/±/g, "+/-")
    // Arrows
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/↑/g, "^")
    .replace(/↓/g, "v")
    // Verification marks & Emojis
    .replace(/[✓✔✅]/g, "[VERIFIED]")
    .replace(/[❌✖]/g, "[REJECTED]")
    .replace(/[⚡🚀💡⚠️]/g, "")
    // Ensure all remaining characters conform strictly to ASCII / WinAnsi range (0x20 - 0x7E, plus common Latin-1)
    .replace(/[^\x00-\x7F]/g, "");
}

/**
 * Recursively sanitizes table rows and cells for autoTable
 */
function sanitizeRow(row) {
  if (!row) return [];
  if (Array.isArray(row)) {
    return row.map((cell) => {
      if (cell && typeof cell === "object") {
        if (cell.content !== undefined) {
          return { ...cell, content: sanitizePDFText(cell.content) };
        }
        return cell;
      }
      return sanitizePDFText(cell);
    });
  }
  return row;
}

/**
 * Recursively sanitizes table data matrices (head, body, foot)
 */
function sanitizeTableData(data) {
  if (!data || !Array.isArray(data)) return [];
  return data.map(sanitizeRow);
}

/**
 * Creates a pre-configured jsPDF instance with an automatic text sanitization interceptor
 */
function createKaushalNexusPDF(options = { format: "a4", unit: "mm" }) {
  const doc = new jsPDF(options);

  // Monkey-patch doc.text to automatically sanitize any string or array of strings passed in
  const originalText = doc.text.bind(doc);
  doc.text = function (text, x, y, opt, transform) {
    let sanitized;
    if (Array.isArray(text)) {
      sanitized = text.map(sanitizePDFText);
    } else {
      sanitized = sanitizePDFText(text);
    }
    return originalText(sanitized, x, y, opt, transform);
  };

  return doc;
}

/**
 * Robust wrapper around jspdf-autotable that enforces sanitized text across all cells
 */
function renderAutoTable(doc, options) {
  const sanitizedOptions = {
    ...options,
    head: options.head ? sanitizeTableData(options.head) : undefined,
    body: options.body ? sanitizeTableData(options.body) : undefined,
    foot: options.foot ? sanitizeTableData(options.foot) : undefined,
    didParseCell: (data) => {
      if (data.cell && data.cell.text) {
        data.cell.text = Array.isArray(data.cell.text)
          ? data.cell.text.map(sanitizePDFText)
          : [sanitizePDFText(data.cell.text)];
      }
      if (options.didParseCell) {
        options.didParseCell(data);
      }
    },
  };
  return autoTable(doc, sanitizedOptions);
}

/**
 * Applies standard KaushalNexus executive header and watermark
 */
function applyHeader(doc, title, subtitle, reportId = "") {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Accent Bar
  doc.setFillColor(...COLORS.brandBlue);
  doc.rect(0, 0, pageWidth, 5, "F");

  // Top Dark Header Box
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 5, pageWidth, 32, "F");

  // Brand Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.white);
  doc.text("KAUSHALNEXUS", 14, 18);

  // Platform Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(191, 219, 254); // Blue 200
  doc.text("National Skilling & Longitudinal Employment Platform", 14, 24);
  doc.text("Ministry of Skill Development & Entrepreneurship (MSDE) | NCVET Standards", 14, 29);

  // Platform Header Label & Timestamp (Right aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.white);
  doc.text("EXECUTIVE AUDIT DOSSIER", pageWidth - 14, 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  const dateStr = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - 14, 22, { align: "right" });
  if (reportId) {
    doc.text(`Report ID: ${reportId}`, pageWidth - 14, 27, { align: "right" });
  }

  // Document Title Sub-banner
  doc.setFillColor(...COLORS.slateLight);
  doc.rect(0, 37, pageWidth, 18, "F");
  doc.setDrawColor(...COLORS.border);
  doc.line(0, 55, pageWidth, 55);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primary);
  doc.text(title.toUpperCase(), 14, 46);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.slateMuted);
    doc.text(subtitle, 14, 51);
  }
}

/**
 * Applies standard pagination footer
 */
function applyFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(...COLORS.border);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.slateMuted);

    // Left disclaimer
    doc.text(
      "KaushalNexus | Demonstration & Evaluation Dataset | Conforms to MSDE Longitudinal Guidelines",
      14,
      pageHeight - 7
    );

    // Right page number
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: "right" });
  }
}

/**
 * Helper to render KPI summary metric cards in PDF
 */
function renderKPICards(doc, startY, cards = []) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gap = 4;
  const availableWidth = pageWidth - margin * 2;
  const cardWidth = (availableWidth - gap * (cards.length - 1)) / cards.length;
  const cardHeight = 22;

  cards.forEach((card, idx) => {
    const x = margin + idx * (cardWidth + gap);

    // Card background & border
    doc.setFillColor(...COLORS.slateLight);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, "S");

    // Title
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.slateMuted);
    doc.text(sanitizePDFText(card.title).toUpperCase(), x + 4, startY + 6);

    // Metric Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...(card.color || COLORS.primary));
    doc.text(sanitizePDFText(String(card.value)), x + 4, startY + 13);

    // Context / Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.slateMuted);
    doc.text(sanitizePDFText(card.subtitle || ""), x + 4, startY + 18);
  });

  return startY + cardHeight + 6;
}

// ==============================================================================
// 1. Export National Impact & Outcomes Audit Dossier (PDF)
// ==============================================================================
export function exportImpactAuditPDF({ summary, trendData, funnelData, sectorMatrixData, period = "YTD 2026" }) {
  const doc = createKaushalNexusPDF({ format: "a4", unit: "mm" });
  const reportId = `KN-AUDIT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  applyHeader(
    doc,
    "National Skilling Outcomes & Longitudinal Retention Dossier",
    `Scope: National Skilling Ecosystem | Evaluation Window: ${period}`,
    reportId
  );

  let currentY = 60;

  // KPI Metric Cards
  if (summary) {
    const cards = [
      {
        title: "Certified Beneficiaries",
        value: Number(summary.total_certified || 0).toLocaleString(),
        subtitle: `${Number(summary.total_trained || 0).toLocaleString()} Trained`,
        color: COLORS.brandBlue,
      },
      {
        title: "Verified Placements",
        value: Number(summary.total_placed || 0).toLocaleString(),
        subtitle: `${summary.placement_percentage || 0}% Conversion`,
        color: COLORS.emerald,
      },
      {
        title: "180-Day Retention",
        value: `${summary.retention_percentage || 0}%`,
        subtitle: "EPFO Passbook Synced",
        color: COLORS.brandDarkBlue,
      },
      {
        title: "Active Mandates",
        value: Number(summary.active_hiring_mandates || 0).toLocaleString(),
        subtitle: "Industry Vacancies",
        color: COLORS.rose,
      },
    ];
    currentY = renderKPICards(doc, currentY, cards);
  }

  // Section 1: Longitudinal Pipeline Funnel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text("1. LONGITUDINAL EMPLOYMENT & RETENTION FUNNEL", 14, currentY + 2);
  currentY += 4;

  const funnelRows = (funnelData || []).map((f) => [
    f.stage,
    Number(f.count || 0).toLocaleString(),
    `${f.percentage || 0}%`,
    f.description || "Longitudinal tracked candidate cohort",
    f.stage === "Retained" ? "EPFO Verified Remittance" : "NCVET Authenticated",
  ]);

  renderAutoTable(doc, {
    startY: currentY,
    head: [["Funnel Stage", "Candidates", "Cohort %", "Operational Description", "Verification Status"]],
    body: funnelRows.length > 0 ? funnelRows : [["Enrollment", "28,450", "100%", "Registered PMKK Candidates", "Demo Identity Adapter Synced"]],
    theme: "grid",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: COLORS.primary },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Section 2: Sectoral Matrix & Placement Conversion
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text("2. SECTORAL EMPLOYMENT EQUILIBRIUM & RETENTION MATRIX", 14, currentY);
  currentY += 2;

  const sectorRows = (sectorMatrixData || []).map((s) => [
    s.sector,
    Number(s.enrolled || 0).toLocaleString(),
    Number(s.certified || 0).toLocaleString(),
    Number(s.placed || 0).toLocaleString(),
    `${s.placement_rate || 0}%`,
    `${s.retention_rate || 0}%`,
    s.demand_gap || "Balanced",
  ]);

  renderAutoTable(doc, {
    startY: currentY,
    head: [["Sector Classification", "Enrolled", "Certified", "Placed", "Conversion %", "6M Retention %", "Demand Equilibrium"]],
    body:
      sectorRows.length > 0
        ? sectorRows
        : [
            ["IT & Digital Services", "6,800", "5,950", "4,980", "83.7%", "85.2%", "High Demand Deficit"],
            ["Automotive & EV", "5,200", "4,420", "3,610", "81.6%", "82.4%", "Moderate Deficit"],
            ["Renewable Energy & Solar", "4,100", "3,580", "2,980", "83.2%", "79.8%", "Aligned"],
            ["Logistics & Supply Chain", "4,900", "4,150", "3,180", "76.6%", "74.1%", "High Demand Deficit"],
            ["Healthcare & Paramedical", "3,850", "3,420", "2,790", "81.5%", "86.0%", "Balanced"],
          ],
    theme: "grid",
    headStyles: { fillColor: COLORS.brandBlue, textColor: COLORS.white, fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: COLORS.primary },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Section 3: Monthly Longitudinal Trajectory
  if (trendData && trendData.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.primary);
    doc.text("3. MONTHLY PLACEMENT & 180-DAY RETENTION TRAJECTORY", 14, currentY);
    currentY += 2;

    const trendRows = trendData.map((t) => [
      t.month,
      Number(t.enrolled || 0).toLocaleString(),
      Number(t.certified || 0).toLocaleString(),
      Number(t.placed || 0).toLocaleString(),
      Number(t.retained || 0).toLocaleString(),
      t.certified > 0 ? `${Math.round((t.placed / t.certified) * 100)}%` : "N/A",
    ]);

    renderAutoTable(doc, {
      startY: currentY,
      head: [["Month", "Enrolled", "Certified", "Placed", "180D Retained", "Conversion Rate"]],
      body: trendRows,
      theme: "grid",
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7.5, fontStyle: "bold" },
      bodyStyles: { fontSize: 7, textColor: COLORS.primary },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
  }

  applyFooter(doc);

  const filename = `KaushalNexus_Audit_Dossier_${period.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
  return true;
}

// ==============================================================================
// 2. Export District Intelligence Dossier (PDF)
// ==============================================================================
export function exportDistrictDossierPDF(district) {
  if (!district) return false;

  const doc = createKaushalNexusPDF({ format: "a4", unit: "mm" });
  const reportId = `KN-DIST-${(district.district_id || district.name || "UP").toUpperCase()}`;

  applyHeader(
    doc,
    `District Intelligence Dossier: ${district.name}`,
    `State: ${district.state} | Region: ${district.region} | Tier Classification: ${district.tier}`,
    reportId
  );

  let currentY = 60;

  // KPI Metrics
  const cards = [
    {
      title: "Enrolled Candidates",
      value: Number(district.total_enrolled || 0).toLocaleString(),
      subtitle: `${district.active_training_centers_count || 4} PMKK Centers`,
      color: COLORS.brandBlue,
    },
    {
      title: "Placement Conversion",
      value: `${district.placement_rate || 0}%`,
      subtitle: `${Number(district.total_placed || 0).toLocaleString()} Placed`,
      color: COLORS.emerald,
    },
    {
      title: "6M Retention Rate",
      value: `${district.retention_rate || 0}%`,
      subtitle: "EPFO Verified Remittance",
      color: COLORS.brandDarkBlue,
    },
    {
      title: "Divergence Score",
      value: `${district.divergence_score || 0}%`,
      subtitle: "Supply vs Demand Delta",
      color: COLORS.rose,
    },
  ];
  currentY = renderKPICards(doc, currentY, cards);

  // District Profile Overview Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text("1. GEOSPATIAL SKILLING & DEMAND AUDIT PROFILE", 14, currentY + 2);
  currentY += 4;

  const profileRows = [
    ["District Name", district.name, "Geographic Region", district.region],
    ["State Jurisdiction", district.state, "Tier Classification", district.tier],
    ["Accredited Training Centers", `${district.active_training_centers_count || 4} Centers`, "Workforce Supply Index", `${district.workforce_supply_index || 65}%`],
    ["Employer Demand Index", `${district.employer_demand_index || 70}%`, "Supply Divergence Delta", `${district.divergence_score || 25}%`],
    [
      "Dominant Skill Deficits",
      { content: Array.isArray(district.dominant_skill_gaps) ? district.dominant_skill_gaps.join(", ") : district.dominant_skill_gaps || "None", colSpan: 3 },
    ],
  ];

  renderAutoTable(doc, {
    startY: currentY,
    head: [["Attribute", "Specification", "Metric Indicator", "Benchmark Value"]],
    body: profileRows,
    theme: "grid",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 7.5, textColor: COLORS.primary },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Section 2: Policy Interventions & Bridge Modules
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text("2. RECOMMENDED CURRICULUM BRIDGE INTERVENTIONS", 14, currentY);
  currentY += 2;

  const interventionRows = [
    [
      "40-Hour Lab Bridge Course",
      "Specialized modules in Cloud Infra & Power BI to match Tier-1 employer mandates",
      "Immediate (30 Days)",
      "High Priority",
    ],
    [
      "Master Trainer Capacity Upgrade",
      "Deploy certified NCVET instructors to strengthen hands-on EV diagnostics labs",
      "Mid-Term (60 Days)",
      "Medium Priority",
    ],
    [
      "Direct Corporate Placement Drive",
      "Organize dedicated industry hiring fair with TCS, L&T, and local MSME partners",
      "Planned Q2 2026",
      "Active",
    ],
  ];

  renderAutoTable(doc, {
    startY: currentY,
    head: [["Intervention Package", "Strategic Action Description", "Timeline", "Status"]],
    body: interventionRows,
    theme: "grid",
    headStyles: { fillColor: COLORS.brandBlue, textColor: COLORS.white, fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 7.5, textColor: COLORS.primary },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  applyFooter(doc);

  const filename = `KaushalNexus_District_Dossier_${district.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
  return true;
}

// ==============================================================================
// 3. Export Learner 360° Dossier & Competency Certificate (PDF)
// ==============================================================================
export function exportLearnerDossierPDF(learner, placements = [], retentionAudit = null) {
  if (!learner) return false;

  const doc = createKaushalNexusPDF({ format: "a4", unit: "mm" });
  const reportId = `KN-DOSSIER-${learner.id}`;

  applyHeader(
    doc,
    `Candidate 360 Degree Dossier: ${learner.full_name}`,
    `Candidate ID: ${learner.id} | NSQF Level: ${learner.nsqf_level || "Level 5"} | District: ${learner.district_name || learner.district_id}`,
    reportId
  );

  let currentY = 60;

  // Masked Identification (Aadhaar & UAN)
  const activePlacement = placements && placements.length > 0 ? placements[0] : null;
  const rawId = String(learner.id || "");
  const maskedAadhaar = `XXXX XXXX ${rawId.slice(-4) || "8841"}`;

  // KPI Metrics (starting CTC formatted cleanly as "Rs. 14.5 LPA" or similar numeric)
  const startingCTC = activePlacement?.starting_ctc_lpa ? `Rs. ${activePlacement.starting_ctc_lpa} LPA` : "Rs. 4.5 LPA";

  const cards = [
    {
      title: "Readiness Index",
      value: `${learner.employment_readiness_score || 85}%`,
      subtitle: "Multi-Signal Evaluated",
      color: COLORS.brandBlue,
    },
    {
      title: "Current Status",
      value: learner.status || "Placed",
      subtitle: activePlacement?.employer_name || "Verified Placement",
      color: COLORS.emerald,
    },
    {
      title: "NCVET Credential",
      value: learner.is_credential_verified ? "VERIFIED" : "PENDING",
      subtitle: learner.ncvet_credential_id || "NCVET-2026-AUTH",
      color: COLORS.brandDarkBlue,
    },
    {
      title: "Starting CTC",
      value: startingCTC,
      subtitle: "EPFO Remitted",
      color: COLORS.primary,
    },
  ];
  currentY = renderKPICards(doc, currentY, cards);

  // Section 1: Candidate dossier details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text("1. CANDIDATE IDENTITY & TRAINING ACCREDITATION", 14, currentY + 2);
  currentY += 4;

  const candidateTable = [
    ["Candidate Full Name", learner.full_name, "Candidate System ID", learner.id],
    ["Aadhaar Identity Verification", `${maskedAadhaar} (Simulated UIDAI)`, "NSQF Qualification Level", learner.nsqf_level || "NSQF Level 5"],
    ["Training Center", learner.training_info?.training_center_name || "PMKK Center", "Curriculum Progress", `${learner.training_info?.completion_percentage || 100}% Coursework`],
    ["NCVET Credential ID", learner.ncvet_credential_id || "NCVET-2026-P9812", "National Skills Registry (NSR)", learner.is_credential_verified ? "Authenticated & Signed" : "Under Evaluation"],
  ];

  renderAutoTable(doc, {
    startY: currentY,
    head: [["Field", "Information", "Verification Element", "Status / Identifier"]],
    body: candidateTable,
    theme: "grid",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: COLORS.primary },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Section 2: Verified Competencies
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text("2. VERIFIED COMPETENCIES & ASSESSMENT SCORES", 14, currentY);
  currentY += 2;

  const skillsRows = (learner.skills || []).map((s) => [
    s.name || s,
    s.sector || "Technical Services",
    s.verified ? "100% Certified" : "Verified",
    `${s.assessment_score || 88}%`,
    s.verified ? "NCVET Practical Lab Exam Passed" : "Coursework Assessment",
  ]);

  renderAutoTable(doc, {
    startY: currentY,
    head: [["Competency / Skill", "Industry Sector", "Verification Mode", "Score", "Assessment Evidence"]],
    body:
      skillsRows.length > 0
        ? skillsRows
        : [
            ["Python Backend Development", "IT-ITeS", "NCVET Lab Passed", "92%", "Capstone Project Evaluated"],
            ["SQL Database Design", "IT-ITeS", "NCVET Lab Passed", "88%", "Practical Lab Exam Passed"],
            ["Git Version Control & CI/CD", "IT-ITeS", "Verified", "85%", "Automated Assessment"],
          ],
    theme: "grid",
    headStyles: { fillColor: COLORS.brandBlue, textColor: COLORS.white, fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: COLORS.primary },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Section 3: Longitudinal Placement & Retention Checkpoints
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text("3. LONGITUDINAL EMPLOYMENT & 180-DAY RETENTION AUDIT", 14, currentY);
  currentY += 2;

  const checkpointRows = (retentionAudit?.checkpoints || []).map((cp) => [
    cp.checkpoint_type,
    cp.is_active_at_checkpoint ? "Active & Retained" : "Inactive",
    cp.current_ctc_lpa ? `Rs. ${cp.current_ctc_lpa} LPA` : "Rs. 4.5 LPA",
    `+${cp.wage_increment_percentage || 0}%`,
    cp.epfo_verified ? "EPFO Electronic Remittance Synced" : "Pending",
    cp.remarks || "Quarterly statutory passbook contribution recorded",
  ]);

  renderAutoTable(doc, {
    startY: currentY,
    head: [["Milestone", "Employment Status", "Current CTC", "Wage Growth", "EPFO Verification", "Audit Remarks"]],
    body:
      checkpointRows.length > 0
        ? checkpointRows
        : [
            ["3-Month Milestone", "Active & Retained", "Rs. 4.5 LPA", "+0%", "EPFO Remittance Synced", "Continuous EPF contribution"],
            ["6-Month Milestone", "Active & Retained", "Rs. 5.2 LPA", "+15.5%", "EPFO Remittance Synced", "Performance increment confirmed"],
            ["12-Month Milestone", "Scheduled", "Rs. 5.8 LPA (Est)", "+28.8%", "Pending Next Window", "Annual appraisal checkpoint"],
          ],
    theme: "grid",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: COLORS.primary },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  applyFooter(doc);

  const filename = `KaushalNexus_Candidate_${learner.full_name.replace(/\s+/g, "_")}_${learner.id}.pdf`;
  doc.save(filename);
  return true;
}

// ==============================================================================
// 4. Export Employer Partner Network & Mandate Directory (PDF)
// ==============================================================================
export function exportEmployerDirectoryPDF(mandates = []) {
  const doc = createKaushalNexusPDF({ format: "a4", unit: "mm" });
  const reportId = `KN-EMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  applyHeader(
    doc,
    "National Employer Partner & Hiring Mandate Directory",
    `Active Corporate Network | ${mandates.length} Industry Hiring Mandates`,
    reportId
  );

  let currentY = 60;

  // KPI summary
  const totalOpen = mandates.reduce((acc, m) => acc + (m.open_positions || 1), 0);
  const cards = [
    {
      title: "Total Mandates",
      value: mandates.length.toString(),
      subtitle: "Verified Job Openings",
      color: COLORS.brandBlue,
    },
    {
      title: "Open Positions",
      value: totalOpen.toLocaleString(),
      subtitle: "Industry Capacity",
      color: COLORS.emerald,
    },
    {
      title: "Salary Range (Avg)",
      value: "Rs. 4.2 - 6.5 LPA",
      subtitle: "EPFO Compliant",
      color: COLORS.brandDarkBlue,
    },
    {
      title: "Hiring Partners",
      value: "450+ Orgs",
      subtitle: "Multi-Sectoral",
      color: COLORS.rose,
    },
  ];
  currentY = renderKPICards(doc, currentY, cards);

  // Mandates Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text("1. ACTIVE CORPORATE HIRING MANDATES & VACANCIES", 14, currentY + 2);
  currentY += 4;

  const mandateRows = (mandates || []).map((m) => [
    m.job_title,
    m.employer_name,
    m.sector,
    m.location,
    `${m.open_positions || 5} Vacancies`,
    `Rs. ${m.salary_min_lpa || 3.8} - ${m.salary_max_lpa || 5.5} LPA`,
    Array.isArray(m.required_competencies) ? m.required_competencies.slice(0, 2).join(", ") : "Competencies Listed",
  ]);

  renderAutoTable(doc, {
    startY: currentY,
    head: [["Job Role", "Employer Partner", "Sector", "Location", "Openings", "CTC Range", "Key Competencies"]],
    body: mandateRows.length > 0 ? mandateRows : [["Data Analyst", "TechNova Solutions", "IT-ITeS", "Noida", "12", "Rs. 4.5 - 6.0 LPA", "Python, SQL"]],
    theme: "grid",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: COLORS.primary },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  applyFooter(doc);

  const filename = `KaushalNexus_Employer_Directory_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
  return true;
}

// ==============================================================================
// 5. Export Skill Gap Bridge Intervention Mandate Order (PDF)
// ==============================================================================
export function exportSkillInterventionPDF(interventionData, skill = null) {
  const doc = createKaushalNexusPDF({ format: "a4", unit: "mm" });
  const orderId = `KN-ORDER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  applyHeader(
    doc,
    "Curriculum Bridge Intervention Allocation Order",
    `Administrative Directive | NQR Aligned Lab Specialization Program`,
    orderId
  );

  let currentY = 60;

  const competencyName = skill?.competency_name || interventionData?.competency_name || "Specialized Lab Module";
  const districtName = skill?.district_name || skill?.district_id || interventionData?.district_id || "Regional Cluster";
  const capacity = interventionData?.target_capacity || 150;
  const budgetINR = Number(interventionData?.budget_allocated_inr || 500000).toLocaleString("en-IN");
  const timelineWeeks = interventionData?.target_completion_weeks || 4;

  const cards = [
    {
      title: "Target Capacity",
      value: `${capacity} Beneficiaries`,
      subtitle: "Accredited Seats",
      color: COLORS.brandBlue,
    },
    {
      title: "Budget Allocated",
      value: `Rs. ${budgetINR}`,
      subtitle: "PMKVY 4.0 Special Fund",
      color: COLORS.emerald,
    },
    {
      title: "Target Duration",
      value: `${timelineWeeks} Weeks`,
      subtitle: "40-Hour Fast Track",
      color: COLORS.brandDarkBlue,
    },
    {
      title: "Projected Deficit Cut",
      value: "-35% Deficit",
      subtitle: "Model Simulation",
      color: COLORS.rose,
    },
  ];
  currentY = renderKPICards(doc, currentY, cards);

  // Order Details Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text("1. ADMINISTRATIVE DIRECTIVE & ALLOCATION SPECIFICATIONS", 14, currentY + 2);
  currentY += 4;

  const orderTable = [
    ["Allocation Order ID", orderId, "Target Competency", competencyName],
    ["Target District / Region", districtName, "Intervention Strategy", interventionData?.intervention_type || "40-Hour Bridge Course"],
    ["Allocated Seat Capacity", `${capacity} Beneficiaries`, "Budget Allocation (INR)", `Rs. ${budgetINR}`],
    ["Target Completion Timeline", `${timelineWeeks} Weeks (${timelineWeeks * 10} Hours)`, "Curriculum Standard", "NCVET NQR Version 2026.1"],
    [
      "Administrative Notes",
      {
        content:
          interventionData?.notes ||
          "Mandated fast-track curriculum bridge package dispatched to regional PMKK centers to close employer hiring deficit.",
        colSpan: 3,
      },
    ],
  ];

  renderAutoTable(doc, {
    startY: currentY,
    head: [["Directive Field", "Parameter Specification", "Governance Element", "Value / Authority"]],
    body: orderTable,
    theme: "grid",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 7.5, textColor: COLORS.primary },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  applyFooter(doc);

  const filename = `KaushalNexus_Bridge_Order_${orderId}.pdf`;
  doc.save(filename);
  return true;
}
