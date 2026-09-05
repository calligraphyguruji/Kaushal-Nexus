import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveGapsFromMasteries,
  saveLearnerAssessmentResults,
  getActiveLearnerGaps,
  computeRoleMatchesFromLearner,
} from '../utils/skillGapEvaluator.js';
import { skillGapsApi } from '../api/skillGaps.js';
import { learnersApi } from '../api/learners.js';
import { learnerPipelineApi } from '../api/learnerPipeline.js';

// Polyfill localStorage for Node.js test environment if absent
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

describe('Learner Assessment to Skill Gap Matrix Synchronization Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. deriveGapsFromMasteries identifies competencies below 0.75 mastery as actionable gaps', () => {
    const mockMasteries = [
      {
        skill_name: 'REST API Design',
        competency_code: 'NOS-IT-9820-API',
        prior_mastery: 0.35,
        posterior_mastery: 0.28,
        questions_answered: 3,
        questions_correct: 0,
        is_mastered: false,
        status: 'Needs Focus',
      },
      {
        skill_name: 'Relational Database SQL',
        competency_code: 'NOS-IT-9820-SQL',
        prior_mastery: 0.35,
        posterior_mastery: 0.55,
        questions_answered: 3,
        questions_correct: 1,
        is_mastered: false,
        status: 'Developing',
      },
      {
        skill_name: 'Git Version Control',
        competency_code: 'NOS-IT-9820-GIT',
        prior_mastery: 0.35,
        posterior_mastery: 0.88,
        questions_answered: 4,
        questions_correct: 4,
        is_mastered: true,
        status: 'Mastered',
      },
    ];

    const learnerInfo = {
      id: 'KN-2026-TEST',
      full_name: 'Rohan Gupta',
      district_name: 'Varanasi',
      target_sector: 'IT-ITeS',
    };

    const gaps = deriveGapsFromMasteries(mockMasteries, learnerInfo);

    assert.ok(Array.isArray(gaps), 'Gaps must be an array');
    assert.equal(gaps.length, 2, 'Should identify 2 deficits (REST API and SQL)');

    // Verify REST API gap (deficit = 85 - 28 = 57% -> Critical)
    const restGap = gaps.find((g) => g.competency_name === 'REST API Design');
    assert.ok(restGap, 'REST API gap must exist');
    assert.equal(restGap.severity, 'Critical');
    assert.equal(restGap.deficit_pct, 57);
    assert.equal(restGap.is_learner_gap, true);
    assert.equal(restGap.learner_name, 'Rohan Gupta');
    assert.equal(restGap.district_name, 'Varanasi (Candidate)');

    // Verify SQL gap (deficit = 85 - 55 = 30% -> High)
    const sqlGap = gaps.find((g) => g.competency_name === 'Relational Database SQL');
    assert.ok(sqlGap, 'SQL gap must exist');
    assert.equal(sqlGap.severity, 'High');
    assert.equal(sqlGap.deficit_pct, 30);
  });

  it('2. saveLearnerAssessmentResults persists detected gaps to kn_active_gaps and kn_current_learner', () => {
    const submissionResult = {
      score_percentage: 60,
      total_questions: 10,
      correct_answers: 6,
      readiness_score: 77,
      updated_masteries: [
        {
          skill_name: 'Python OOP',
          competency_code: 'NOS-CS-4410-OOP',
          prior_mastery: 0.35,
          posterior_mastery: 0.42,
          is_mastered: false,
          status: 'Needs Focus',
        },
      ],
      evaluated_at: new Date().toISOString(),
    };

    const learnerInfo = {
      id: 'KN-2026-PRIYA',
      full_name: 'Priya Patel',
      district_name: 'Prayagraj',
    };

    const saved = saveLearnerAssessmentResults(submissionResult, 'assess-python-02', learnerInfo);

    assert.ok(saved.detected_gaps, 'Saved result must include detected gaps');
    assert.equal(saved.detected_gaps.length, 1);
    assert.equal(saved.detected_gaps[0].competency_name, 'Python OOP');

    // Verify LocalStorage sync
    const activeGaps = getActiveLearnerGaps();
    assert.equal(activeGaps.length, 1);
    assert.equal(activeGaps[0].learner_name, 'Priya Patel');

    const storedLearner = JSON.parse(localStorage.getItem('kn_current_learner') || '{}');
    assert.equal(storedLearner.full_name, 'Priya Patel');
    assert.equal(storedLearner.readiness_score, 77);
    assert.equal(storedLearner.detected_gaps.length, 1);
  });

  it('3. skillGapsApi.getPriorityGaps injects active candidate gaps at the top of the matrix', async () => {
    // Setup active candidate assessment gaps in storage
    const candidateGaps = [
      {
        id: 'learner-gap-nos-it-9820-api-1',
        competency_name: 'REST API Design',
        sector: 'IT-ITeS',
        district_name: 'Lucknow (Candidate)',
        employer_demand_pct: 85,
        workforce_supply_pct: 28,
        deficit_pct: 57,
        severity: 'Critical',
        severity_level: 'CRITICAL',
        is_learner_gap: true,
        learner_name: 'Aarav Sharma',
      },
    ];
    localStorage.setItem('kn_active_gaps', JSON.stringify(candidateGaps));

    const priorityGaps = await skillGapsApi.getPriorityGaps();

    assert.ok(Array.isArray(priorityGaps), 'Priority gaps must be an array');
    assert.ok(priorityGaps.length > 1, 'Should contain candidate gap plus national benchmarks');

    // The first item must be the candidate gap
    const firstGap = priorityGaps[0];
    assert.equal(firstGap.competency_name, 'REST API Design');
    assert.equal(firstGap.is_learner_gap, true);
    assert.equal(firstGap.learner_name, 'Aarav Sharma');
    assert.equal(firstGap.priority_rank, 1);
    assert.equal(firstGap.deficit_pct, 57);

    // Verify sequential ranking
    for (let i = 0; i < priorityGaps.length; i++) {
      assert.equal(priorityGaps[i].priority_rank, i + 1);
    }
  });

  it('4. learnersApi.getById returns active profile merged with detected assessment gaps', async () => {
    const candidateProfile = {
      id: 'KN-2026-9812',
      full_name: 'Ananya Verma',
      district_name: 'Kanpur',
      readiness_score: 84,
      detected_gaps: [
        {
          name: 'Asynchronous Microservices',
          level: 'Critical',
          impact: 'Supply deficit of -45% vs employer demand threshold',
        },
      ],
      skills: [
        { skill: 'Python OOP', score_percentage: 85, is_verified: true },
      ],
    };
    localStorage.setItem('kn_current_learner', JSON.stringify(candidateProfile));

    const dossier = await learnersApi.getById('KN-2026-9812');

    assert.ok(dossier, 'Dossier must not be null');
    assert.equal(dossier.full_name, 'Ananya Verma');
    assert.equal(dossier.readiness_score, 84);
    assert.ok(Array.isArray(dossier.detected_gaps), 'detected_gaps must be an array');
    assert.equal(dossier.detected_gaps.length, 1);
    assert.equal(dossier.detected_gaps[0].name, 'Asynchronous Microservices');
  });

  it('5. learnersApi.getSkillGaps reflects evaluated candidate deficits for BKT card', async () => {
    const candidateGaps = [
      {
        competency_name: 'Containerization & Docker',
        workforce_supply_pct: 30,
        employer_demand_pct: 85,
        deficit_pct: 55,
        severity: 'Critical',
      },
    ];
    localStorage.setItem('kn_active_gaps', JSON.stringify(candidateGaps));

    const result = await learnersApi.getSkillGaps('KN-2026-9812', 'Full Stack Web Developer');

    assert.ok(result, 'Result must not be null');
    assert.ok(Array.isArray(result.skill_gaps), 'skill_gaps must be an array');
    assert.equal(result.skill_gaps.length, 1);
    assert.equal(result.skill_gaps[0].skill, 'Containerization & Docker');
    assert.equal(result.skill_gaps[0].priority, 'critical');
    assert.equal(result.skill_gaps[0].gap, 0.55);
  });

  it('6. computeRoleMatchesFromLearner generates structured aspiring_role with skill_details and critical_gaps', () => {
    const learner = {
      id: 'KN-2026-DEV',
      skills: [
        { name: 'REST API Design', mastery_probability: 0.30, score_percentage: 30 },
        { name: 'SQL Schema & Queries', mastery_probability: 0.85, score_percentage: 85 },
      ],
    };

    const roles = [
      { id: 'role-fullstack', name: 'Full-Stack Web Developer', sector: 'IT-ITeS' },
      { id: 'role-python', name: 'Python Specialist', sector: 'IT-ITeS' },
    ];

    const matches = computeRoleMatchesFromLearner(learner, 'role-fullstack', roles);

    // Array compatibility
    assert.ok(Array.isArray(matches), 'Matches must be array-compatible');
    assert.ok(matches.length > 0, 'Matches must have elements');

    // Object property compatibility for Wizard Stage 6
    assert.ok(matches.aspiring_role, 'aspiring_role must be defined');
    assert.equal(matches.aspiring_role.role_title, 'Full-Stack Web Developer');
    assert.ok(Array.isArray(matches.aspiring_role.strong_skills), 'strong_skills must be an array');
    assert.ok(matches.aspiring_role.strong_skills.includes('SQL Schema & Queries'));
    assert.ok(Array.isArray(matches.aspiring_role.critical_gaps), 'critical_gaps must be an array');
    assert.ok(matches.aspiring_role.critical_gaps.includes('REST API Design'));
    assert.ok(Array.isArray(matches.aspiring_role.skill_details), 'skill_details must be an array');
  });
});
