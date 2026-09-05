/**
 * Skill Gap Evaluation and Synchronization Engine
 * Bridges Learner Profile 360, BKT Diagnostic Assessments, and the National Skill Gap Matrix.
 */

import { upsertCandidateInRegistry } from './candidateRegistry.js';

/**
 * Derives actionable skill gaps from Bayesian Knowledge Tracing (BKT) updated masteries.
 * Any competency with posterior_mastery < 0.75 or status !== 'Mastered' represents an identified deficit.
 * 
 * @param {Array} masteries - Updated masteries from simulateBKTUpdate or backend BKT
 * @param {Object} learnerInfo - Active learner profile info (name, id, district, sector)
 * @returns {Array} List of evaluated skill gap objects
 */
export function deriveGapsFromMasteries(masteries = [], learnerInfo = {}) {
  if (!Array.isArray(masteries) || masteries.length === 0) return [];

  const learnerName = learnerInfo.full_name || learnerInfo.name || "Candidate Learner";
  const learnerDistrict = learnerInfo.district_name || learnerInfo.district || "Lucknow";
  const learnerSector = learnerInfo.target_sector || learnerInfo.sector || "IT-ITeS";

  // Filter masteries where posterior mastery is below 0.75 (or status is not Mastered)
  // Even if all are >= 0.75, take any with < 0.85 so the learner gets constructive gap feedback
  let deficientMasteries = masteries.filter((m) => m.posterior_mastery < 0.75 || m.status === "Needs Focus");
  if (deficientMasteries.length === 0) {
    deficientMasteries = masteries.filter((m) => m.posterior_mastery < 0.85);
  }

  return deficientMasteries.map((m, idx) => {
    const posterior = typeof m.posterior_mastery === "number" ? m.posterior_mastery : 0.4;
    const supplyPct = Math.round(posterior * 100);
    const demandPct = 85; // Target employer standard benchmark
    const deficitPct = Math.max(15, Math.round((0.85 - posterior) * 100));

    let severity = "Moderate";
    if (deficitPct >= 40 || posterior < 0.45) {
      severity = "Critical";
    } else if (deficitPct >= 25 || posterior < 0.65) {
      severity = "High";
    }

    const compName = m.skill_name || `Competency ${idx + 1}`;
    const compCode = m.competency_code || `NOS-NOS-${idx + 101}`;

    return {
      id: `learner-gap-${compCode.toLowerCase()}-${idx + 1}`,
      competency_id: compCode,
      competency_code: compCode,
      competency_name: compName,
      name: compName,
      sector: learnerSector,
      district_name: `${learnerDistrict} (Candidate)`,
      district_id: learnerDistrict,
      employer_demand_pct: demandPct,
      workforce_supply_pct: supplyPct,
      deficit_pct: deficitPct,
      gap_percentage: deficitPct,
      gap: deficitPct,
      severity: severity,
      severity_level: severity.toUpperCase(),
      level: severity,
      learners_affected: 1,
      candidates_impacted_count: 1,
      priority_rank: idx + 1,
      urgency_rank: idx + 1,
      projected_timeline: severity === "Critical" ? "15 Days" : "30 Days",
      suggested_action: `Deploy targeted bridge curriculum to remediate -${deficitPct}% gap in ${compName} identified via diagnostic assessment.`,
      recommended_intervention: `Deploy targeted bridge curriculum to remediate -${deficitPct}% gap in ${compName} identified via diagnostic assessment.`,
      impact: `Assessed BKT mastery at ${supplyPct}% leaves a -${deficitPct}% deficit against industry threshold (${demandPct}%).`,
      is_learner_gap: true,
      learner_name: learnerName,
      learner_id: learnerInfo.id || "KN-2026-LEARNER",
      assessed_at: new Date().toISOString(),
    };
  });
}

/**
 * Saves assessment submission and synchronizes detected gaps across local storage.
 * @param {Object} submissionResult - Output of simulateBKTUpdate or backend assessment submission
 * @param {string} assessmentId - Unique ID of the assessment taken
 * @param {Object} learnerInfo - Candidate metadata
 * @returns {Object} Updated result with detected gaps attached
 */
export function saveLearnerAssessmentResults(submissionResult, assessmentId, learnerInfo = {}) {
  let storedLearner;
  try {
    storedLearner = JSON.parse(localStorage.getItem("kn_current_learner") || "{}");
  } catch {
    storedLearner = {};
  }

  const mergedLearner = {
    ...storedLearner,
    ...learnerInfo,
  };

  const detectedGaps = deriveGapsFromMasteries(submissionResult.updated_masteries || [], mergedLearner);

  const formattedSkills = (submissionResult.updated_masteries || []).map((m, idx) => ({
    skill_id: `sk-${idx + 1}`,
    skill: m.skill_name,
    name: m.skill_name,
    competency_code: m.competency_code,
    mastery_probability: m.posterior_mastery,
    score_percentage: Math.round(m.posterior_mastery * 100),
    status: m.status?.toLowerCase() || (m.posterior_mastery >= 0.75 ? "mastered" : "developing"),
    questions_attempted: m.questions_answered || 1,
    is_verified: m.posterior_mastery >= 0.75,
  }));

  const assessedReadiness = submissionResult.readiness_score || submissionResult.score_percentage || mergedLearner.readiness_score || 80;
  mergedLearner.readiness_score = assessedReadiness;
  mergedLearner.employment_readiness_score = assessedReadiness;
  mergedLearner.readiness = assessedReadiness;
  mergedLearner.last_assessment = {
    assessment_id: assessmentId,
    score_percentage: submissionResult.score_percentage,
    correct_count: submissionResult.correct_answers || submissionResult.correct_count,
    total_questions: submissionResult.total_questions,
    evaluated_at: submissionResult.evaluated_at || new Date().toISOString(),
  };
  mergedLearner.detected_gaps = detectedGaps;
  mergedLearner.skills = formattedSkills;
  mergedLearner.bkt_masteries = submissionResult.updated_masteries || [];

  try {
    localStorage.setItem("kn_current_learner", JSON.stringify(mergedLearner));
    localStorage.setItem("kn_active_gaps", JSON.stringify(detectedGaps));
    upsertCandidateInRegistry(mergedLearner);
  } catch (err) {
    console.warn("Storage write failed:", err);
  }

  return {
    ...submissionResult,
    detected_gaps: detectedGaps,
  };
}

/**
 * Retrieves the active diagnosed gaps from storage
 */
export function getActiveLearnerGaps() {
  try {
    const raw = localStorage.getItem("kn_active_gaps");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore
  }

  try {
    const learnerRaw = localStorage.getItem("kn_current_learner");
    if (learnerRaw) {
      const parsed = JSON.parse(learnerRaw);
      if (Array.isArray(parsed.detected_gaps) && parsed.detected_gaps.length > 0) {
        return parsed.detected_gaps;
      }
    }
  } catch {
    // Ignore
  }

  return [];
}

/**
 * Builds deterministic role matches and skill gap breakdown from candidate state
 */
export function computeRoleMatchesFromLearner(learner, targetRoleId, availableRoles = []) {
  const currentSkills = Array.isArray(learner?.skills) && learner.skills.length > 0
    ? learner.skills
    : [
        { name: "Frontend Architecture & DOM", score_percentage: 82, mastery_probability: 0.82 },
        { name: "REST API Design", score_percentage: 45, mastery_probability: 0.45 },
        { name: "Relational Database SQL", score_percentage: 55, mastery_probability: 0.55 },
        { name: "Git Version Control", score_percentage: 88, mastery_probability: 0.88 },
        { name: "Python Core & Scripting", score_percentage: 60, mastery_probability: 0.60 },
      ];

  const targetRole = availableRoles.find((r) => r.id === targetRoleId) || availableRoles[0] || {
    id: "role-fullstack",
    name: "Full-Stack Web Developer",
    sector: "Information Technology & Software",
  };

  const skillDetails = currentSkills.map((s, idx) => {
    const current = typeof s.mastery_probability === "number"
      ? s.mastery_probability
      : (s.score_percentage || 50) / 100;
    const required = 0.75;
    const gap = Math.max(0, parseFloat((required - current).toFixed(2)));
    let status = "mastered";
    if (gap >= 0.30) {
      status = "critical_gap";
    } else if (gap > 0) {
      status = "developing";
    }

    return {
      skill_name: s.name || s.skill || `Skill ${idx + 1}`,
      competency_code: s.competency_code || `NOS-NOS-${100 + idx}`,
      current_mastery: current,
      required_mastery: required,
      gap: gap,
      status: status,
    };
  });

  const strongSkills = skillDetails.filter((d) => d.status === "mastered").map((d) => d.skill_name);
  const devSkills = skillDetails.filter((d) => d.status === "developing").map((d) => d.skill_name);
  const critGaps = skillDetails.filter((d) => d.status === "critical_gap").map((d) => d.skill_name);

  const avgMastery = skillDetails.length > 0
    ? skillDetails.reduce((acc, d) => acc + d.current_mastery, 0) / skillDetails.length
    : 0.75;
  const matchScore = Math.min(96, Math.max(48, Math.round(avgMastery * 100)));

  const aspiringRole = {
    role_id: targetRole.id,
    role_name: targetRole.name || targetRole.title,
    role_title: targetRole.name || targetRole.title,
    sector: targetRole.sector,
    match_score: matchScore,
    match_percentage: matchScore,
    strong_skills: strongSkills,
    development_skills: devSkills,
    critical_gaps: critGaps,
    skill_details: skillDetails,
  };

  const topMatches = availableRoles.filter((r) => r.id !== targetRole.id).slice(0, 3).map((r, i) => {
    const score = Math.max(50, matchScore - ((i + 1) * 6));
    return {
      role_id: r.id,
      role_name: r.name || r.title,
      role_title: r.name || r.title,
      sector: r.sector,
      match_score: score,
      match_percentage: score,
      strong_skills: strongSkills.slice(0, 2),
      critical_gaps: critGaps.slice(0, 1),
    };
  });

  const result = [aspiringRole, ...topMatches];
  result.learner_id = learner?.id || "KN-2026-LEARNER";
  result.aspiring_role = aspiringRole;
  result.top_matches = topMatches;

  return result;
}