/**
 * KaushalNexus CSV Export Utilities
 * Handles UTF-8 BOM, RFC-4180 CSV escaping, and cross-browser file downloads.
 */

export function downloadCSV(filename, rows, headers = null) {
  if (!rows || rows.length === 0) {
    console.warn("No data available to export to CSV.");
    return false;
  }

  let columnKeys = [];
  let columnLabels = [];

  if (headers && Array.isArray(headers)) {
    if (typeof headers[0] === "object" && headers[0].key) {
      columnKeys = headers.map((h) => h.key);
      columnLabels = headers.map((h) => h.label || h.key);
    } else {
      columnKeys = headers;
      columnLabels = headers;
    }
  } else if (typeof rows[0] === "object" && !Array.isArray(rows[0])) {
    columnKeys = Object.keys(rows[0]);
    columnLabels = columnKeys.map((k) =>
      k
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  const escapeCSVValue = (val) => {
    if (val === null || val === undefined) return '""';
    let str = typeof val === "object" ? JSON.stringify(val) : String(val);
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvLines = [];

  // Header Row
  if (columnLabels.length > 0) {
    csvLines.push(columnLabels.map(escapeCSVValue).join(","));
  }

  // Data Rows
  rows.forEach((row) => {
    if (Array.isArray(row)) {
      csvLines.push(row.map(escapeCSVValue).join(","));
    } else if (typeof row === "object") {
      const line = columnKeys.map((key) => escapeCSVValue(row[key]));
      csvLines.push(line.join(","));
    } else {
      csvLines.push(escapeCSVValue(row));
    }
  });

  const csvString = "\uFEFF" + csvLines.join("\r\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

  const cleanFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  if (window.navigator && window.navigator.msSaveBlob) {
    window.navigator.msSaveBlob(blob, cleanFilename);
  } else {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", cleanFilename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  }

  return true;
}

/**
 * Export Regional District Matrix to CSV
 */
export function exportDistrictsCSV(districts, stateFilter = "ALL", tierFilter = "All Tiers") {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `KaushalNexus_Districts_${stateFilter}_${timestamp}.csv`;

  const headers = [
    { key: "district_id", label: "District ID" },
    { key: "name", label: "District Name" },
    { key: "state", label: "State" },
    { key: "region", label: "Region" },
    { key: "tier", label: "Tier Classification" },
    { key: "total_enrolled", label: "Total Enrolled" },
    { key: "total_certified", label: "Total Certified" },
    { key: "total_placed", label: "Total Placed" },
    { key: "placement_rate", label: "Placement Rate (%)" },
    { key: "retention_rate", label: "6M Retention Rate (%)" },
    { key: "active_training_centers_count", label: "Active PMKK Centers" },
    { key: "dominant_skill_gaps_str", label: "Dominant Skill Deficits" },
    { key: "employer_demand_index", label: "Employer Demand Index" },
    { key: "workforce_supply_index", label: "Workforce Supply Index" },
    { key: "divergence_score", label: "Divergence Score (%)" },
  ];

  const processedRows = districts.map((d) => ({
    ...d,
    dominant_skill_gaps_str: Array.isArray(d.dominant_skill_gaps)
      ? d.dominant_skill_gaps.join("; ")
      : d.dominant_skill_gaps || "None",
  }));

  return downloadCSV(filename, processedRows, headers);
}

/**
 * Export Beneficiary Registry to CSV
 */
export function exportLearnersCSV(learners, searchFilter = "") {
  const timestamp = new Date().toISOString().split("T")[0];
  const querySuffix = searchFilter ? `_${searchFilter.replace(/\s+/g, "_")}` : "";
  const filename = `KaushalNexus_Beneficiaries${querySuffix}_${timestamp}.csv`;

  const headers = [
    { key: "id", label: "Candidate ID" },
    { key: "full_name", label: "Candidate Name" },
    { key: "district_name", label: "District" },
    { key: "state", label: "State" },
    { key: "nsqf_level", label: "NSQF Level" },
    { key: "status", label: "Current Status" },
    { key: "employment_readiness_score", label: "Readiness Score (%)" },
    { key: "verified_skills_str", label: "Verified Competencies" },
    { key: "training_center_name", label: "Training Center" },
    { key: "ncvet_credential_id", label: "NCVET Credential ID" },
    { key: "is_credential_verified", label: "NSR Verification" },
    { key: "current_placement_employer", label: "Placement Employer" },
    { key: "starting_ctc_lpa", label: "Starting CTC (LPA)" },
  ];

  const processedRows = learners.map((l) => ({
    ...l,
    state: l.state || "Uttar Pradesh",
    district_name: l.district_name || l.district_id || "District",
    verified_skills_str: Array.isArray(l.skills)
      ? l.skills.map((s) => s.name || s).join("; ")
      : l.skills || "None",
    training_center_name: l.training_info?.training_center_name || l.training_center || "PMKK Center",
    ncvet_credential_id: l.ncvet_credential_id || "PENDING",
    is_credential_verified: l.is_credential_verified ? "VERIFIED" : "UNVERIFIED",
    current_placement_employer: l.placements?.[0]?.employer_name || "N/A",
    starting_ctc_lpa: l.placements?.[0]?.starting_ctc_lpa || "N/A",
  }));

  return downloadCSV(filename, processedRows, headers);
}

/**
 * Export Skill Gap & Deficit Matrix to CSV
 */
export function exportSkillGapsCSV(gaps, severityFilter = "All", sectorFilter = "All") {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `KaushalNexus_SkillGaps_${severityFilter}_${sectorFilter}_${timestamp}.csv`;

  const headers = [
    { key: "competency_name", label: "Competency / Skill" },
    { key: "sector", label: "Sector" },
    { key: "district_name", label: "Target District" },
    { key: "severity", label: "Severity Tier" },
    { key: "employer_demand_pct", label: "Employer Demand (%)" },
    { key: "workforce_supply_pct", label: "Workforce Supply (%)" },
    { key: "deficit_pct", label: "Supply Deficit Delta (%)" },
    { key: "learners_affected", label: "Beneficiaries Affected" },
    { key: "projected_timeline", label: "Recommended Bridge Duration" },
    { key: "suggested_action", label: "Mandated Curriculum Intervention" },
  ];

  const processedRows = gaps.map((g) => ({
    ...g,
    district_name: g.district_name || g.district_id || "Regional Cluster",
    deficit_pct: `-${g.deficit_pct}%`,
  }));

  return downloadCSV(filename, processedRows, headers);
}

/**
 * Export Employer Hiring Mandates & Partner Network to CSV
 */
export function exportEmployerMandatesCSV(mandates) {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `KaushalNexus_Employer_Mandates_${timestamp}.csv`;

  const headers = [
    { key: "id", label: "Mandate ID" },
    { key: "job_title", label: "Job Role" },
    { key: "employer_name", label: "Employer Partner" },
    { key: "employer_tier", label: "Employer Tier" },
    { key: "sector", label: "Sector" },
    { key: "location", label: "Location / District" },
    { key: "open_positions", label: "Open Vacancies" },
    { key: "salary_min_lpa", label: "Min CTC (LPA)" },
    { key: "salary_max_lpa", label: "Max CTC (LPA)" },
    { key: "required_competencies_str", label: "Required Competencies" },
    { key: "status", label: "Mandate Status" },
  ];

  const processedRows = mandates.map((m) => ({
    ...m,
    salary_min_lpa: `₹${m.salary_min_lpa || 3.5} LPA`,
    salary_max_lpa: `₹${m.salary_max_lpa || 5.5} LPA`,
    required_competencies_str: Array.isArray(m.required_competencies)
      ? m.required_competencies.join("; ")
      : m.required_competencies || "None",
  }));

  return downloadCSV(filename, processedRows, headers);
}

/**
 * Export National Impact & Outcomes Dataset to CSV
 */
export function exportImpactOutcomesCSV(summary, trendData, funnelData, period = "YTD 2026") {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `KaushalNexus_National_Outcomes_${period.replace(/\s+/g, "_")}_${timestamp}.csv`;

  const rows = [];

  // 1. National KPIs
  if (summary) {
    rows.push({
      Category: "Executive KPI",
      Metric: "Total Certified Candidates",
      Value: Number(summary.total_certified || 0).toLocaleString(),
      Unit: "Count",
      Context: "NCVET Authenticated",
    });
    rows.push({
      Category: "Executive KPI",
      Metric: "Verified Placements",
      Value: Number(summary.total_placed || 0).toLocaleString(),
      Unit: "Count",
      Context: "Aadhaar & EPFO Linked",
    });
    rows.push({
      Category: "Executive KPI",
      Metric: "Placement Conversion Rate",
      Value: `${summary.placement_percentage || 0}%`,
      Unit: "Percentage",
      Context: "Certified to Placed Ratio",
    });
    rows.push({
      Category: "Executive KPI",
      Metric: "180-Day Longitudinal Retention",
      Value: `${summary.retention_percentage || 0}%`,
      Unit: "Percentage",
      Context: "Continuous EPF Remittance",
    });
    rows.push({
      Category: "Executive KPI",
      Metric: "Active Hiring Mandates",
      Value: Number(summary.active_hiring_mandates || 0).toLocaleString(),
      Unit: "Count",
      Context: "Corporate Vacancies",
    });
    rows.push({
      Category: "Executive KPI",
      Metric: "Average Readiness Score",
      Value: `${summary.avg_readiness_score || 0}%`,
      Unit: "Score Index",
      Context: "Competency Benchmark",
    });
  }

  // 2. Funnel Stages
  if (funnelData && Array.isArray(funnelData)) {
    funnelData.forEach((f) => {
      rows.push({
        Category: "Longitudinal Funnel",
        Metric: `Funnel Stage: ${f.stage}`,
        Value: Number(f.count || 0).toLocaleString(),
        Unit: "Candidates",
        Context: `${f.percentage || 0}% of cohort (${f.description || ""})`,
      });
    });
  }

  // 3. Trends
  if (trendData && Array.isArray(trendData)) {
    trendData.forEach((t) => {
      rows.push({
        Category: "Monthly Trajectory",
        Metric: `${t.month} Placements`,
        Value: Number(t.placed || 0).toLocaleString(),
        Unit: "Candidates",
        Context: `Enrolled: ${t.enrolled || 0}, Certified: ${t.certified || 0}, Retained (180D): ${t.retained || 0}`,
      });
    });
  }

  return downloadCSV(filename, rows);
}
