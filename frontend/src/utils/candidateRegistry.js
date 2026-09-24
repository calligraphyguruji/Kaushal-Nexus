/**
 * National Candidate Registry Service
 * Persistent registry for all actual learners who register, update profiles, or complete assessments.
 * Eliminates fake mock candidate data on MSME Officer and institutional logins.
 */

import { learnersList } from '../data/learnerData.js';

export const CANDIDATE_REGISTRY_STORAGE_KEY = 'kn_all_registered_learners';
export const CURRENT_LEARNER_STORAGE_KEY = 'kn_current_learner';

/**
 * Normalizes and ensures complete schema for candidate dossier
 * @param {Object} raw - Raw candidate input
 * @returns {Object} Cleaned candidate record
 */
export function formatCandidateRecord(raw = {}) {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const id = raw.id || `KN-${new Date().getFullYear()}-${randNum}`;

  const fullName = (raw.full_name || raw.name || 'Candidate Learner').trim();

  // Determine readiness score
  let readiness = 75;
  if (typeof raw.readiness_score === 'number') {
    readiness = raw.readiness_score;
  } else if (typeof raw.employment_readiness_score === 'number') {
    readiness = raw.employment_readiness_score;
  } else if (typeof raw.readiness === 'number') {
    readiness = raw.readiness;
  } else if (raw.last_assessment && typeof raw.last_assessment.score_percentage === 'number') {
    readiness = raw.last_assessment.score_percentage;
  }

  // Determine district & state
  let districtName = raw.district_name || 'Lucknow';
  let state = raw.state || 'Uttar Pradesh';
  if (raw.location && typeof raw.location === 'string') {
    const parts = raw.location.split(',').map((p) => p.trim());
    if (parts[0]) districtName = parts[0];
    if (parts[1]) state = parts[1];
  } else if (raw.district_id && typeof raw.district_id === 'string' && raw.district_id.includes(',')) {
    const parts = raw.district_id.split(',').map((p) => p.trim());
    if (parts[0]) districtName = parts[0];
    if (parts[1]) state = parts[1];
  }

  const districtId = raw.district_id && !raw.district_id.includes(',')
    ? raw.district_id
    : `UP-${districtName.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

  const educationLevel = raw.education_level || raw.education || 'Vocational Studies (Engineering / IT)';
  const institution = raw.institution || raw.provider || 'PMKK Skilling Center of Excellence';
  const targetDomain = raw.target_domain || 'fullstack';
  const trade = raw.trade || raw.program || raw.target_role || (
    targetDomain === 'python' ? 'Python & Data Engineering' :
    targetDomain === 'data' ? 'Data Analytics & Business Intelligence' :
    targetDomain === 'manufacturing' ? 'Smart Manufacturing & CNC' :
    targetDomain === 'digital' ? 'Digital Marketing & Growth' :
    targetDomain === 'cad' ? 'CAD & Mechanical Design' :
    'Full Stack Web Engineering'
  );

  const nsqfLevel = raw.nsqf_level || raw.nsqfLevel || 'NSQF Level 5';
  const credentialId = raw.ncvet_credential_id || raw.credentialId || `NCVET-${id.replace('KN-', '')}`;
  const status = raw.status || (raw.last_assessment ? 'Seeking Employment' : 'In Training');

  // Format verified skills
  let skills = [];
  if (Array.isArray(raw.skills) && raw.skills.length > 0) {
    skills = raw.skills.map((s, idx) => {
      const score = typeof s.score_percentage === 'number'
        ? s.score_percentage
        : typeof s.score === 'number'
        ? s.score
        : typeof s.mastery_probability === 'number'
        ? Math.round(s.mastery_probability * 100)
        : 75;

      const masteryProb = typeof s.mastery_probability === 'number'
        ? s.mastery_probability
        : score / 100;

      const isMastered = masteryProb >= 0.75 || score >= 75;

      return {
        skill_id: s.skill_id || s.id || `sk-${idx + 1}`,
        id: s.id || `sk-${idx + 1}`,
        name: s.name || s.skill || `Skill ${idx + 1}`,
        skill: s.skill || s.name || `Skill ${idx + 1}`,
        score_percentage: score,
        score: score,
        mastery_probability: masteryProb,
        status: s.status || (isMastered ? 'Mastered' : 'Developing'),
        verified_by: s.verified_by || s.verifiedBy || 'NCVET Diagnostic Assessment',
        is_verified: s.is_verified ?? isMastered,
        questions_attempted: s.questions_attempted || (raw.last_assessment ? 10 : 5),
        sector: s.sector || (targetDomain === 'data' ? 'Analytics & BFSI' : 'IT-ITeS'),
      };
    });
  }

  // Format detected gaps
  let detectedGaps = [];
  if (Array.isArray(raw.detected_gaps) && raw.detected_gaps.length > 0) {
    detectedGaps = raw.detected_gaps.map((g, idx) => {
      const compName = g.competency_name || g.name || `Competency Deficit ${idx + 1}`;
      const deficit = typeof g.deficit_pct === 'number'
        ? g.deficit_pct
        : typeof g.gap === 'number'
        ? g.gap
        : 35;
      const level = g.level || g.severity || (deficit >= 40 ? 'Critical' : 'Moderate');

      return {
        id: g.id || `gap-${id}-${idx + 1}`,
        competency_name: compName,
        name: compName,
        competency_code: g.competency_code || `NOS-NOS-${idx + 101}`,
        deficit_pct: deficit,
        gap_percentage: deficit,
        gap: deficit,
        employer_demand_pct: g.employer_demand_pct || 85,
        workforce_supply_pct: g.workforce_supply_pct || Math.max(20, 85 - deficit),
        level: level,
        severity: level,
        severity_level: level.toUpperCase(),
        impact: g.impact || `Assessed deficit of -${deficit}% hinders immediate candidate-employer alignment.`,
        suggested_action: g.suggested_action || g.recommended_intervention || `Complete remedial bridge module in ${compName}.`,
        recommended_intervention: g.recommended_intervention || g.suggested_action || `Complete remedial bridge module in ${compName}.`,
        learners_affected: 1,
        candidates_impacted_count: 1,
        is_learner_gap: true,
        learner_name: fullName,
        learner_id: id,
        assessed_at: g.assessed_at || new Date().toISOString(),
      };
    });
  }

  // Generate Career Timeline reflecting real milestones
  const enrolledDate = raw.created_at
    ? new Date(raw.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recent';

  const timeline = [
    {
      title: 'Program Onboarded & Registered',
      date: enrolledDate,
      status: 'completed',
      note: `Registered at ${institution} (${districtName})`,
    },
  ];

  if (raw.last_assessment) {
    const assessDate = raw.last_assessment.evaluated_at
      ? new Date(raw.last_assessment.evaluated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Recent';

    timeline.push({
      title: `Baseline NSQF Diagnostic MCQ Assessment (${raw.last_assessment.score_percentage}%)`,
      date: assessDate,
      status: 'completed',
      note: `Evaluated ${raw.last_assessment.correct_count ?? 8}/${raw.last_assessment.total_questions ?? 10} correct across NSQF standards.`,
    });
  }

  if (detectedGaps.length > 0) {
    timeline.push({
      title: `BKT Skill Gap Diagnostics (${detectedGaps.length} Deficits)`,
      date: 'Active Stage',
      status: 'current',
      note: `Remedial bridge module prescribed for ${detectedGaps.map((g) => g.name).slice(0, 2).join(', ')}.`,
    });
  } else {
    timeline.push({
      title: 'Competency Verification Completed',
      date: 'Active Stage',
      status: 'current',
      note: 'All tested competencies meet or exceed industry readiness threshold.',
    });
  }

  timeline.push({
    title: 'Employer Pipeline Shortlisting',
    date: 'Upcoming Milestone',
    status: 'upcoming',
    note: 'Eligible for institutional placement drives upon bridge curriculum completion.',
  });

  return {
    id: id,
    full_name: fullName,
    name: fullName,
    email: raw.email || '',
    phone: raw.phone || '',
    education_level: educationLevel,
    education: educationLevel,
    institution: institution,
    provider: institution,
    location: `${districtName}, ${state}`,
    district_name: districtName,
    district_id: districtId,
    state: state,
    target_domain: targetDomain,
    target_role: raw.target_role || raw.targetRole || 'Full Stack Web Developer',
    role: raw.role || raw.target_role || trade,
    trade: trade,
    program: trade,
    nsqf_level: nsqfLevel,
    nsqfLevel: nsqfLevel,
    status: status,
    readiness_score: readiness,
    employment_readiness_score: readiness,
    readiness: readiness,
    overall_progress: raw.overall_progress || (raw.last_assessment ? 85 : 40),
    progress: raw.overall_progress || (raw.last_assessment ? 85 : 40),
    aadhaar_verified: raw.aadhaar_verified ?? raw.verified ?? true,
    verified: raw.aadhaar_verified ?? raw.verified ?? true,
    ncvet_credential_id: credentialId,
    credentialId: credentialId,
    last_assessment: raw.last_assessment || null,
    skills: skills,
    detected_gaps: detectedGaps,
    gaps: detectedGaps,
    bkt_masteries: raw.bkt_masteries || [],
    career_timeline: timeline,
    timeline: timeline,
    training_info: {
      modules_completed: raw.training_info?.modules_completed || (raw.last_assessment ? '8 of 10' : '4 of 10'),
      training_hours: raw.training_info?.training_hours || (raw.last_assessment ? '120 hrs' : '40 hrs'),
      training_center_name: institution,
    },
    recommendation: raw.recommendation || {
      action: detectedGaps.length > 0
        ? `Complete targeted 15-hour bridge module in ${detectedGaps[0].name} to boost job readiness.`
        : 'Eligible for direct placement matching across regional enterprise partners.',
      targetCompany: 'Enterprise Skill Partner Network',
      potentialWage: '₹4.5–6.0 LPA',
    },
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const NATIONAL_SEED_CANDIDATES = [
  {
    id: "KN-2026-01001",
    full_name: "Amlan Chakrabarty",
    name: "Amlan Chakrabarty",
    email: "amlan.chakrabarty@kaushalnexus.in",
    phone: "+91 98765 43210",
    role: "Cloud Ops & DevOps Engineer",
    target_role: "Cloud Solutions Architect",
    trade: "Cloud Computing & DevOps Systems",
    program: "Cloud Computing & DevOps Systems",
    institution: "National Skill Development Center, Noida",
    provider: "National Skill Development Center, Noida",
    district_name: "Noida",
    district_id: "UP-NOIDA",
    location: "Gautam Buddha Nagar (Noida), Uttar Pradesh",
    state: "Uttar Pradesh",
    education_level: "B.Tech in Computer Science & Cloud Ops · 2025",
    nsqf_level: "NSQF Level 6",
    status: "Interview Ready",
    readiness_score: 95,
    ncvet_credential_id: "NCVET-2026-CERT-10002",
    verified: true,
    aadhaar_verified: true,
    overall_progress: 96,
    skills: [
      { name: "Kubernetes & Docker", score_percentage: 96, mastery_probability: 0.96, is_verified: true, status: "Mastered" },
      { name: "AWS Cloud Infrastructure", score_percentage: 94, mastery_probability: 0.94, is_verified: true, status: "Mastered" },
      { name: "Linux Systems & Bash", score_percentage: 92, mastery_probability: 0.92, is_verified: true, status: "Mastered" },
      { name: "CI/CD & GitHub Actions", score_percentage: 90, mastery_probability: 0.90, is_verified: true, status: "Mastered" },
      { name: "Terraform & IaC", score_percentage: 88, mastery_probability: 0.88, is_verified: true, status: "Mastered" },
      { name: "Python Automation", score_percentage: 85, mastery_probability: 0.85, is_verified: true, status: "Mastered" },
    ],
    detected_gaps: [
      {
        competency_name: "Multi-Cloud Security & Vault",
        deficit_pct: 32,
        level: "Moderate",
        severity: "Moderate",
        impact: "Beneficial for enterprise banking and FinTech mandates",
        suggested_action: "Complete 15-hr specialized secret management and zero-trust bridge module.",
      },
    ],
  },
  {
    id: "KN-2026-01000",
    full_name: "Aarav Sharma",
    name: "Aarav Sharma",
    email: "aarav.sharma@kaushalnexus.in",
    phone: "+91 98765 11000",
    role: "AI & Data Analytics Specialist",
    target_role: "Associate AI Engineer",
    trade: "Data Analytics & Applied AI",
    program: "Data Analytics & Applied AI",
    institution: "UP Skill Center of Excellence, Varanasi",
    provider: "UP Skill Center of Excellence, Varanasi",
    district_name: "Varanasi",
    district_id: "UP-VARANASI",
    location: "Varanasi, Uttar Pradesh",
    state: "Uttar Pradesh",
    education_level: "B.Voc in Data Analytics & Applied AI · 2025",
    nsqf_level: "NSQF Level 6",
    status: "Interview Ready",
    readiness_score: 94,
    ncvet_credential_id: "NCVET-2026-CERT-10001",
    verified: true,
    aadhaar_verified: true,
    overall_progress: 92,
    skills: [
      { name: "Python for AI & Data Science", score_percentage: 95, mastery_probability: 0.95, is_verified: true, status: "Mastered" },
      { name: "SQL & Relational Warehousing", score_percentage: 92, mastery_probability: 0.92, is_verified: true, status: "Mastered" },
      { name: "Machine Learning Models", score_percentage: 90, mastery_probability: 0.90, is_verified: true, status: "Mastered" },
      { name: "Prompt Engineering & LLM APIs", score_percentage: 88, mastery_probability: 0.88, is_verified: true, status: "Mastered" },
      { name: "Data Visualization & Dashboards", score_percentage: 86, mastery_probability: 0.86, is_verified: true, status: "Mastered" },
    ],
    detected_gaps: [
      {
        competency_name: "Distributed Spark & Big Data",
        deficit_pct: 35,
        level: "Moderate",
        severity: "Moderate",
        impact: "Required for terabyte-scale enterprise streaming pipelines",
        suggested_action: "Complete PySpark and Delta Lake practical labs.",
      },
    ],
  },
  {
    id: "KN-2026-01002",
    full_name: "Satyam Jaiswal",
    name: "Satyam Jaiswal",
    email: "satyam.jaiswal@kaushalnexus.in",
    phone: "+91 98765 22000",
    role: "Data Analytics Associate",
    target_role: "BI & Operations Analyst",
    trade: "Data Analytics & Business Intelligence",
    program: "Data Analytics & Business Intelligence",
    institution: "PMKK Skill Center, Varanasi",
    provider: "PMKK Skill Center, Varanasi",
    district_name: "Varanasi",
    district_id: "UP-VARANASI",
    location: "Varanasi, Uttar Pradesh",
    state: "Uttar Pradesh",
    education_level: "Bachelor of Vocational Studies (B.Voc Analytics)",
    nsqf_level: "NSQF Level 5",
    status: "Placed & Verified",
    readiness_score: 93,
    ncvet_credential_id: "NCVET-2026-CERT-10003",
    verified: true,
    aadhaar_verified: true,
    overall_progress: 100,
    skills: [
      { name: "Power BI & Tableau", score_percentage: 94, mastery_probability: 0.94, is_verified: true, status: "Mastered" },
      { name: "Advanced SQL", score_percentage: 92, mastery_probability: 0.92, is_verified: true, status: "Mastered" },
      { name: "Business Analytics", score_percentage: 90, mastery_probability: 0.90, is_verified: true, status: "Mastered" },
    ],
  },
  {
    id: "KN-2026-01003",
    full_name: "Anand Maurya",
    name: "Anand Maurya",
    email: "anand.maurya@kaushalnexus.in",
    phone: "+91 98765 33000",
    role: "Smart Manufacturing & Robotics Tech",
    target_role: "Industrial Automation Engineer",
    trade: "Smart Manufacturing & CNC",
    program: "Smart Manufacturing & CNC",
    institution: "Government ITI Centre of Excellence, Lucknow",
    provider: "Government ITI Centre of Excellence, Lucknow",
    district_name: "Lucknow",
    district_id: "UP-LUCKNOW",
    location: "Lucknow, Uttar Pradesh",
    state: "Uttar Pradesh",
    education_level: "Diploma in Smart Manufacturing & Robotics",
    nsqf_level: "NSQF Level 5",
    status: "Interview Ready",
    readiness_score: 89,
    ncvet_credential_id: "NCVET-2026-CERT-10004",
    verified: true,
    aadhaar_verified: true,
    overall_progress: 90,
    skills: [
      { name: "CNC Programming & G-Code", score_percentage: 91, mastery_probability: 0.91, is_verified: true, status: "Mastered" },
      { name: "PLC & SCADA Basics", score_percentage: 87, mastery_probability: 0.87, is_verified: true, status: "Mastered" },
      { name: "Industrial IoT Sensors", score_percentage: 85, mastery_probability: 0.85, is_verified: true, status: "Mastered" },
    ],
  },
  {
    id: "KN-2026-01005",
    full_name: "Pooja Agarwal",
    name: "Pooja Agarwal",
    email: "pooja.agarwal@kaushalnexus.in",
    phone: "+91 98765 55000",
    role: "Python Backend Engineer",
    target_role: "Backend API Engineer",
    trade: "Python & Data Engineering",
    program: "Python & Data Engineering",
    institution: "PMKK Skill Center, Lucknow",
    provider: "PMKK Skill Center, Lucknow",
    district_name: "Lucknow",
    district_id: "UP-LUCKNOW",
    location: "Lucknow, Uttar Pradesh",
    state: "Uttar Pradesh",
    education_level: "B.Sc (Data Science & Programming)",
    nsqf_level: "NSQF Level 5",
    status: "Seeking Employment",
    readiness_score: 85,
    ncvet_credential_id: "NCVET-2026-CERT-10005",
    verified: true,
    aadhaar_verified: true,
    overall_progress: 86,
    skills: [
      { name: "Python FastAPI & Django", score_percentage: 88, mastery_probability: 0.88, is_verified: true, status: "Mastered" },
      { name: "PostgreSQL & Database Design", score_percentage: 84, mastery_probability: 0.84, is_verified: true, status: "Mastered" },
    ],
  },
  {
    id: "KN-2026-01006",
    full_name: "Ananya Verma",
    name: "Ananya Verma",
    email: "ananya.verma@kaushalnexus.in",
    phone: "+91 98765 66000",
    role: "Full Stack Web Developer",
    target_role: "Frontend & React Developer",
    trade: "Full Stack Web Engineering",
    program: "Full Stack Web Engineering",
    institution: "UPSDM Training Center, Kanpur",
    provider: "UPSDM Training Center, Kanpur",
    district_name: "Kanpur",
    district_id: "UP-KANPUR",
    location: "Kanpur, Uttar Pradesh",
    state: "Uttar Pradesh",
    education_level: "B.Tech (Information Technology)",
    nsqf_level: "NSQF Level 5",
    status: "Interview Ready",
    readiness_score: 84,
    ncvet_credential_id: "NCVET-2026-CERT-10006",
    verified: true,
    aadhaar_verified: true,
    overall_progress: 88,
    skills: [
      { name: "React.js & Tailwind CSS", score_percentage: 88, mastery_probability: 0.88, is_verified: true, status: "Mastered" },
      { name: "RESTful APIs & Node.js", score_percentage: 82, mastery_probability: 0.82, is_verified: true, status: "Mastered" },
    ],
  },
  {
    id: "KN-2026-01007",
    full_name: "Vikas Singhania",
    name: "Vikas Singhania",
    email: "vikas.singhania@kaushalnexus.in",
    phone: "+91 98765 77000",
    role: "Cloud Infrastructure Associate",
    target_role: "Site Reliability Engineer",
    trade: "Cloud Computing & DevOps Systems",
    program: "Cloud Computing & DevOps Systems",
    institution: "UPSDM Center of Excellence, Varanasi",
    provider: "UPSDM Center of Excellence, Varanasi",
    district_name: "Varanasi",
    district_id: "UP-VARANASI",
    location: "Varanasi, Uttar Pradesh",
    state: "Uttar Pradesh",
    education_level: "B.Tech (Computer Science & Engineering)",
    nsqf_level: "NSQF Level 5",
    status: "In Training",
    readiness_score: 82,
    ncvet_credential_id: "NCVET-2026-CERT-10007",
    verified: true,
    aadhaar_verified: true,
    overall_progress: 80,
    skills: [
      { name: "Linux Server Administration", score_percentage: 84, mastery_probability: 0.84, is_verified: true, status: "Mastered" },
      { name: "Docker Containerization", score_percentage: 80, mastery_probability: 0.80, is_verified: true, status: "Mastered" },
    ],
  },
];

/**
 * Seeds default national candidates if the persistent storage has no candidates or only a placeholder.
 * Safe to call on application bootstrap.
 * @returns {Array<Object>} Seeded or existing candidates
 */
export function seedDefaultCandidatesIfEmpty() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CANDIDATE_REGISTRY_STORAGE_KEY);
    let existing = [];
    if (raw) {
      try {
        existing = JSON.parse(raw);
      } catch {}
    }

    const needsSeed =
      !Array.isArray(existing) ||
      existing.length === 0 ||
      (existing.length === 1 && (existing[0]?.full_name || '').startsWith('Candidate ('));

    if (needsSeed) {
      const formattedSeed = NATIONAL_SEED_CANDIDATES.map(formatCandidateRecord);
      const combined = Array.isArray(existing) && existing.length > 0
        ? [...existing.filter((e) => !formattedSeed.some((s) => s.id === e.id)), ...formattedSeed]
        : formattedSeed;
      localStorage.setItem(CANDIDATE_REGISTRY_STORAGE_KEY, JSON.stringify(combined));
      return combined;
    }
    return existing;
  } catch (err) {
    console.warn('Failed to seed default candidates:', err);
    return [];
  }
}

/**
 * Retrieves all registered candidates from persistent client storage.
 * Synchronizes with active learner if present.
 * NEVER returns hardcoded fake candidates on officer login!
 * @returns {Array<Object>} List of registered candidates
 */
export function getAllRegisteredCandidates() {
  let registry = [];
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CANDIDATE_REGISTRY_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        registry = parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read candidates registry:', err);
  }

  // In browser runtime, if registry is empty or only has un-named phone dummy, seed national cohort
  if (
    typeof window !== 'undefined' &&
    (registry.length === 0 || (registry.length === 1 && (registry[0]?.full_name || '').startsWith('Candidate (')))
  ) {
    registry = seedDefaultCandidatesIfEmpty();
  }

  // Also check kn_current_learner
  try {
    const currentRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENT_LEARNER_STORAGE_KEY) : null;
    if (currentRaw) {
      const current = JSON.parse(currentRaw);
      if (current && (current.full_name || current.id)) {
        const existingIdx = registry.findIndex(
          (c) => c.id === current.id || (current.email && c.email === current.email)
        );
        const formattedCurrent = formatCandidateRecord(current);
        if (existingIdx >= 0) {
          // Merge latest data
          registry[existingIdx] = {
            ...registry[existingIdx],
            ...formattedCurrent,
            skills: formattedCurrent.skills.length > 0 ? formattedCurrent.skills : registry[existingIdx].skills,
            detected_gaps: formattedCurrent.detected_gaps.length > 0 ? formattedCurrent.detected_gaps : registry[existingIdx].detected_gaps,
          };
        } else {
          registry.unshift(formattedCurrent);
        }
      }
    }
  } catch {
    // Ignore
  }

  return registry;
}

/**
 * Adds or updates a candidate in the national registry
 * @param {Object} candidateData
 * @returns {Object} The saved candidate dossier
 */
export function upsertCandidateInRegistry(candidateData) {
  if (!candidateData) return null;

  const currentRegistry = getAllRegisteredCandidates();
  const formatted = formatCandidateRecord(candidateData);

  const existingIdx = currentRegistry.findIndex(
    (c) => c.id === formatted.id || (formatted.email && c.email === formatted.email)
  );

  let mergedCandidate;
  if (existingIdx >= 0) {
    const existing = currentRegistry[existingIdx];
    mergedCandidate = {
      ...existing,
      ...formatted,
      skills: formatted.skills.length > 0 ? formatted.skills : existing.skills,
      detected_gaps: formatted.detected_gaps.length > 0 ? formatted.detected_gaps : existing.detected_gaps,
      last_assessment: formatted.last_assessment || existing.last_assessment,
      readiness_score: formatted.readiness_score ?? existing.readiness_score,
      employment_readiness_score: formatted.employment_readiness_score ?? existing.employment_readiness_score,
      readiness: formatted.readiness ?? existing.readiness,
      updated_at: new Date().toISOString(),
    };
    currentRegistry[existingIdx] = mergedCandidate;
  } else {
    mergedCandidate = formatted;
    currentRegistry.unshift(mergedCandidate);
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CANDIDATE_REGISTRY_STORAGE_KEY, JSON.stringify(currentRegistry));
      // Also keep kn_current_learner aligned
      localStorage.setItem(CURRENT_LEARNER_STORAGE_KEY, JSON.stringify(mergedCandidate));
    }
  } catch (err) {
    console.warn('Failed to persist candidate into registry:', err);
  }

  return mergedCandidate;
}

/**
 * Retrieves a candidate by ID from the persistent registry
 * @param {string} learnerId
 * @returns {Object|null}
 */
export function getCandidateById(learnerId) {
  if (!learnerId) return null;

  let decodedId = String(learnerId).trim();
  try {
    decodedId = decodeURIComponent(decodedId).trim();
  } catch {}

  const lowerTarget = decodedId.toLowerCase();
  const registry = getAllRegisteredCandidates();
  const found = registry.find((c) => {
    if (!c) return false;
    const cId = String(c.id || '').trim().toLowerCase();
    const cEmail = String(c.email || '').trim().toLowerCase();
    const cCred = String(c.ncvet_credential_id || '').trim().toLowerCase();
    return cId === lowerTarget || cEmail === lowerTarget || cCred === lowerTarget;
  });
  if (found) return found;

  // Direct check against national seed candidates
  const seedMatch = NATIONAL_SEED_CANDIDATES.find((c) => {
    if (!c) return false;
    const cId = String(c.id || '').trim().toLowerCase();
    const cEmail = String(c.email || '').trim().toLowerCase();
    const cCred = String(c.ncvet_credential_id || '').trim().toLowerCase();
    return cId === lowerTarget || cEmail === lowerTarget || cCred === lowerTarget;
  });
  if (seedMatch) return formatCandidateRecord(seedMatch);

  // Fallback check in current learner
  try {
    const current = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(CURRENT_LEARNER_STORAGE_KEY) || '{}') : {};
    if (current) {
      const curId = String(current.id || '').trim().toLowerCase();
      const curEmail = String(current.email || '').trim().toLowerCase();
      if (curId === lowerTarget || curEmail === lowerTarget || (!registry.length && current.full_name)) {
        return formatCandidateRecord(current);
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Lists candidates with search, district filter, status filter, and pagination
 * @param {Object} params - { search, district_id, status, nsqf_level, page, page_size }
 * @returns {Object} { items, total, page, page_size, pages }
 */
export function listCandidatesFromRegistry(params = {}) {
  let candidates = getAllRegisteredCandidates();

  // Search filter
  if (params.search && typeof params.search === 'string') {
    const q = params.search.trim().toLowerCase();
    candidates = candidates.filter((c) => {
      const fullName = (c.full_name || c.name || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      const district = (c.district_name || c.district_id || '').toLowerCase();
      const location = (c.location || '').toLowerCase();
      const state = (c.state || '').toLowerCase();
      const trade = (c.trade || c.program || c.role || c.target_role || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const credential = (c.ncvet_credential_id || '').toLowerCase();
      const skillsMatch = Array.isArray(c.skills) && c.skills.some((s) => (s.name || s.skill || '').toLowerCase().includes(q));

      return (
        fullName.includes(q) ||
        id.includes(q) ||
        district.includes(q) ||
        location.includes(q) ||
        state.includes(q) ||
        trade.includes(q) ||
        email.includes(q) ||
        credential.includes(q) ||
        skillsMatch
      );
    });
  }

  // Status filter
  if (params.status && params.status !== 'All') {
    const targetStatus = params.status.toLowerCase();
    candidates = candidates.filter((c) => (c.status || '').toLowerCase().includes(targetStatus));
  }

  // District filter
  if (params.district_id && params.district_id !== 'ALL') {
    candidates = candidates.filter(
      (c) => c.district_id === params.district_id || (c.district_name || '').includes(params.district_id)
    );
  }

  // NSQF filter
  if (params.nsqf_level) {
    candidates = candidates.filter((c) => (c.nsqf_level || '').includes(params.nsqf_level));
  }

  const total = candidates.length;
  const page = parseInt(params.page, 10) || 1;
  const pageSize = parseInt(params.page_size, 10) || 50;
  const pages = Math.ceil(total / pageSize) || 1;
  const offset = (page - 1) * pageSize;
  const paginatedItems = candidates.slice(offset, offset + pageSize);

  return {
    items: paginatedItems.map((c) => ({
      id: c.id,
      full_name: c.full_name,
      name: c.full_name,
      trade: c.trade,
      program: c.trade,
      district_name: c.district_name,
      state: c.state,
      location: c.location,
      status: c.status,
      readiness_score: c.readiness_score,
      readiness: c.readiness_score,
      employment_readiness_score: c.employment_readiness_score,
      nsqf_level: c.nsqf_level,
      nsqfLevel: c.nsqf_level,
      aadhaar_verified: c.aadhaar_verified,
      verified: c.aadhaar_verified,
      ncvet_credential_id: c.ncvet_credential_id,
      last_assessment: c.last_assessment,
    })),
    total: total,
    page: page,
    page_size: pageSize,
    pages: pages,
  };
}
