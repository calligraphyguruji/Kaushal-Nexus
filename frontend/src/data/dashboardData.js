export const dashboardStats = [
  {
    title: "Total Beneficiaries Tracked",
    value: "28,450",
    change: "+14.2%",
    trend: "up",
    period: "vs last quarter",
    subtitle: "Across 42 active skilling districts",
    highlight: "Demo dataset: 94.2% linkage",
  },
  {
    title: "Training Completion Rate",
    value: "89.4%",
    change: "+3.8%",
    trend: "up",
    period: "vs previous cohort",
    subtitle: "25,600 certified learners",
    highlight: "NSQF Level 4–6 certified",
  },
  {
    title: "Employment Conversion",
    value: "68.7%",
    change: "+8.4%",
    trend: "up",
    period: "demonstration cohort",
    subtitle: "16,886 placed in verified roles",
    highlight: "Target: 75.0% by Q4 2026",
  },
  {
    title: "6-Month Retention Rate",
    value: "81.3%",
    change: "+5.1%",
    trend: "up",
    period: "demonstration cohort",
    subtitle: "13,728 retained (demo record)",
    highlight: "Avg starting wage: ₹22,400/mo",
  },
];

export const conversionPipeline = [
  { stage: "Enrolled", count: 28450, rate: "100%", description: "Total registered across 6 sectors" },
  { stage: "Completed Training", count: 25600, rate: "90.0%", description: "Completed min. 400 hrs curriculum" },
  { stage: "Certified", count: 24580, rate: "86.4%", description: "Passed third-party assessment" },
  { stage: "Employed", count: 16886, rate: "68.7%", description: "Placed in employer role (demonstration record)" },
  { stage: "6M Retained", count: 13728, rate: "81.3%", description: "Active employment after 180 days" },
];

export const employmentTrend = [
  { month: "Jan 2026", rate: 54, target: 60, certified: 3100, placed: 1674 },
  { month: "Feb 2026", rate: 57, target: 62, certified: 3350, placed: 1910 },
  { month: "Mar 2026", rate: 59, target: 63, certified: 3600, placed: 2124 },
  { month: "Apr 2026", rate: 62, target: 65, certified: 3820, placed: 2368 },
  { month: "May 2026", rate: 65, target: 67, certified: 4100, placed: 2665 },
  { month: "Jun 2026", rate: 68, target: 70, certified: 4350, placed: 2958 },
  { month: "Jul 2026", rate: 69, target: 72, certified: 4620, placed: 3188 },
];

export const programPerformance = [
  {
    name: "Data Analytics & BI",
    sector: "IT & ITeS",
    learners: 4250,
    employment: 78.4,
    retention: 86.2,
    avgWage: "₹26,500/mo",
    status: "High Performing",
  },
  {
    name: "Full Stack Web Engineering",
    sector: "Technology",
    learners: 3820,
    employment: 74.2,
    retention: 82.5,
    avgWage: "₹28,000/mo",
    status: "Strong",
  },
  {
    name: "Cloud Infrastructure & DevOps",
    sector: "Cloud / Infra",
    learners: 2910,
    employment: 71.0,
    retention: 84.0,
    avgWage: "₹31,000/mo",
    status: "Growing",
  },
  {
    name: "Industrial Automation & IoT",
    sector: "Manufacturing",
    learners: 2640,
    employment: 69.5,
    retention: 79.1,
    avgWage: "₹21,500/mo",
    status: "Moderate",
  },
  {
    name: "Cybersecurity Operations",
    sector: "Security",
    learners: 2140,
    employment: 67.2,
    retention: 78.0,
    avgWage: "₹29,000/mo",
    status: "Intervention Priority",
  },
  {
    name: "Digital Marketing & CRM",
    sector: "Services",
    learners: 1980,
    employment: 62.8,
    retention: 71.4,
    avgWage: "₹18,500/mo",
    status: "Needs Optimization",
  },
];

export const schemeBreakdown = [
  { scheme: "PMKVY 4.0", enrolled: 11200, placedRate: 71.2, budgetUtil: "92%" },
  { scheme: "State Skill Mission (UPSDM)", enrolled: 8450, placedRate: 67.5, budgetUtil: "88%" },
  { scheme: "DDU-GKY Rural Skilling", enrolled: 5200, placedRate: 64.8, budgetUtil: "95%" },
  { scheme: "National Apprenticeship (NAPS)", enrolled: 3600, placedRate: 82.4, budgetUtil: "96%" },
];

export const insights = [
  {
    type: "positive",
    category: "Conversion Velocity",
    title: "Employment conversion up 8.4% across tech cohorts",
    description: "Full Stack and Data Analytics programs achieved peak placement turnaround (avg 24 days post-certification).",
    metric: "+8.4%",
    action: "Scale Q3 intake capacity by 20%",
  },
  {
    type: "warning",
    category: "Regional Skill Gap",
    title: "Power BI & Cloud Security deficit in Eastern UP",
    description: "41% shortage between employer job descriptions and certified candidates in Varanasi and Gorakhpur clusters.",
    metric: "41% Gap",
    action: "Deploy targeted 60-hour bridge modules",
  },
  {
    type: "positive",
    category: "Longitudinal Retention",
    title: "6-Month employment retention reached 81.3%",
    description: "Apprenticeship-linked training models demonstrated a 14% higher retention rate compared to classroom-only courses.",
    metric: "81.3%",
    action: "Expand employer co-certification framework",
  },
];