export const skillGapStats = [
  {
    title: "Critical Skills",
    value: "12",
    change: "+3",
    description: "skills requiring immediate intervention",
    tone: "danger",
  },
  {
    title: "High Gap Areas",
    value: "27",
    change: "+8",
    description: "skills with significant workforce shortages",
    tone: "warning",
  },
  {
    title: "Learners Affected",
    value: "8,420",
    change: "+12.6%",
    description: "learners with identified skill gaps",
    tone: "primary",
  },
  {
    title: "Programs Impacted",
    value: "18",
    change: "+4",
    description: "training programs requiring attention",
    tone: "success",
  },
];

export const skillGapDistribution = [
  {
    level: "Critical",
    count: 12,
    percentage: 18,
  },
  {
    level: "High",
    count: 27,
    percentage: 41,
  },
  {
    level: "Medium",
    count: 19,
    percentage: 29,
  },
  {
    level: "Low",
    count: 8,
    percentage: 12,
  },
];

export const prioritySkills = [
  {
    rank: "01",
    name: "Cloud Computing",
    category: "Infrastructure",
    gap: 82,
    severity: "Critical",
    learners: 2140,
  },
  {
    rank: "02",
    name: "Cybersecurity",
    category: "Security",
    gap: 76,
    severity: "Critical",
    learners: 1860,
  },
  {
    rank: "03",
    name: "Data Engineering",
    category: "Data",
    gap: 68,
    severity: "High",
    learners: 1520,
  },
  {
    rank: "04",
    name: "AI / Machine Learning",
    category: "Artificial Intelligence",
    gap: 61,
    severity: "High",
    learners: 1280,
  },
];

export const interventions = [
  {
    skill: "Cloud Computing",
    priority: "Immediate",
    action: "Launch targeted cloud upskilling programs",
    impact: "2,140 learners",
  },
  {
    skill: "Cybersecurity",
    priority: "Immediate",
    action: "Increase cybersecurity training capacity",
    impact: "1,860 learners",
  },
  {
    skill: "Data Engineering",
    priority: "High",
    action: "Align curriculum with employer requirements",
    impact: "1,520 learners",
  },
];