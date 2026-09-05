import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CANDIDATE_REGISTRY_STORAGE_KEY,
  CURRENT_LEARNER_STORAGE_KEY,
  getAllRegisteredCandidates,
  upsertCandidateInRegistry,
  getCandidateById,
  listCandidatesFromRegistry,
  formatCandidateRecord,
} from '../utils/candidateRegistry.js';
import { learnersApi } from '../api/learners.js';
import { assessmentsApi } from '../api/assessments.js';
import { saveLearnerAssessmentResults } from '../utils/skillGapEvaluator.js';
import { learnersList } from '../data/learnerData.js';

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

describe('Candidate Registry & MSME Officer Real-Data Synchronization Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. upsertCandidateInRegistry saves learner profile with complete schema', () => {
    const rawLearner = {
      id: 'KN-2026-7788',
      full_name: 'Vikas Singhania',
      email: 'vikas.singhania@example.com',
      phone: '+91 98765 12345',
      education_level: 'B.Tech (Computer Science & Engineering)',
      institution: 'UPSDM Center of Excellence, Varanasi',
      district_name: 'Varanasi',
      state: 'Uttar Pradesh',
      target_domain: 'fullstack',
      employment_readiness_score: 82,
    };

    const saved = upsertCandidateInRegistry(rawLearner);
    assert.ok(saved, 'Saved candidate must not be null');
    assert.equal(saved.id, 'KN-2026-7788');
    assert.equal(saved.full_name, 'Vikas Singhania');
    assert.equal(saved.email, 'vikas.singhania@example.com');
    assert.equal(saved.district_name, 'Varanasi');
    assert.equal(saved.readiness_score, 82);
    assert.equal(saved.status, 'In Training');

    // Verify persisted in localStorage under CANDIDATE_REGISTRY_STORAGE_KEY
    const registryRaw = localStorage.getItem(CANDIDATE_REGISTRY_STORAGE_KEY);
    assert.ok(registryRaw, 'Registry must exist in localStorage');
    const parsed = JSON.parse(registryRaw);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].id, 'KN-2026-7788');
    assert.equal(parsed[0].full_name, 'Vikas Singhania');
  });

  it('2. taking diagnostic quiz persists real assessment results, skills, and gaps into learner record', async () => {
    // 1. Initial learner registration
    const initialLearner = {
      id: 'KN-2026-5544',
      full_name: 'Pooja Agarwal',
      email: 'pooja.agarwal@example.com',
      phone: '+91 91234 56789',
      education_level: 'B.Sc (Data Science)',
      institution: 'PMKK Skill Center, Lucknow',
      district_name: 'Lucknow',
      target_domain: 'python',
    };
    upsertCandidateInRegistry(initialLearner);

    // 2. Candidate takes diagnostic assessment (answering 5 questions, 3 correct, 2 wrong)
    const mockSubmission = {
      score_percentage: 60,
      correct_answers: 3,
      total_questions: 5,
      readiness_score: 65,
      passed: false,
      evaluated_at: '2026-09-05T15:30:00.000Z',
      updated_masteries: [
        {
          skill_name: 'Python Basics',
          competency_code: 'NOS-PY-01',
          prior_mastery: 0.35,
          posterior_mastery: 0.82,
          status: 'Mastered',
          questions_answered: 1,
        },
        {
          skill_name: 'Python OOP',
          competency_code: 'NOS-PY-02',
          prior_mastery: 0.35,
          posterior_mastery: 0.78,
          status: 'Mastered',
          questions_answered: 1,
        },
        {
          skill_name: 'Asynchronous Python',
          competency_code: 'NOS-PY-03',
          prior_mastery: 0.35,
          posterior_mastery: 0.40,
          status: 'Needs Focus',
          questions_answered: 1,
        },
        {
          skill_name: 'REST API Design',
          competency_code: 'NOS-PY-04',
          prior_mastery: 0.35,
          posterior_mastery: 0.30,
          status: 'Needs Focus',
          questions_answered: 1,
        },
      ],
    };

    saveLearnerAssessmentResults(mockSubmission, 'assess-python-diagnostic', initialLearner);

    // 3. Verify candidate record in registry now has quiz results, BKT skills, and detected gaps
    const candidateInRegistry = getCandidateById('KN-2026-5544');
    assert.ok(candidateInRegistry, 'Candidate must exist in registry');
    assert.equal(candidateInRegistry.readiness_score, 65);
    assert.equal(candidateInRegistry.last_assessment.score_percentage, 60);
    assert.equal(candidateInRegistry.last_assessment.correct_count, 3);

    // Verify skills populated
    assert.ok(Array.isArray(candidateInRegistry.skills), 'Skills must be an array');
    assert.equal(candidateInRegistry.skills.length, 4);
    assert.equal(candidateInRegistry.skills[0].name, 'Python Basics');
    assert.equal(candidateInRegistry.skills[0].is_verified, true);

    // Verify detected gaps (Asynchronous Python and REST API Design have posterior < 0.75)
    assert.ok(Array.isArray(candidateInRegistry.detected_gaps), 'Gaps must be an array');
    assert.equal(candidateInRegistry.detected_gaps.length, 2);
    assert.equal(candidateInRegistry.detected_gaps[0].competency_name, 'Asynchronous Python');
    assert.equal(candidateInRegistry.detected_gaps[1].competency_name, 'REST API Design');
  });

  it('3. learnersApi.list returns ONLY actual registered learners and ZERO fake candidates', async () => {
    // Register two real learners
    upsertCandidateInRegistry({
      id: 'KN-2026-0001',
      full_name: 'Rahul Sharma',
      district_name: 'Lucknow',
      trade: 'Full Stack Web Engineering',
      readiness_score: 85,
    });
    upsertCandidateInRegistry({
      id: 'KN-2026-0002',
      full_name: 'Meera Nair',
      district_name: 'Noida',
      trade: 'Python Data Stack',
      readiness_score: 90,
    });

    const res = await learnersApi.list();
    assert.ok(res, 'Response must exist');
    assert.equal(res.total, 2, 'Should only contain the 2 actual registered learners');
    assert.equal(res.items.length, 2);

    const names = res.items.map((it) => it.full_name);
    assert.ok(names.includes('Rahul Sharma'));
    assert.ok(names.includes('Meera Nair'));

    // Verify NONE of the fake candidates from learnersList exist in res.items
    const fakeNames = learnersList.map((f) => f.name);
    fakeNames.forEach((fakeName) => {
      assert.ok(!names.includes(fakeName), `Fake mock candidate "${fakeName}" must NOT appear in officer list!`);
    });
  });

  it('4. learnersApi.getById returns the candidate dossier with actual quiz score and verified gaps', async () => {
    const candidate = {
      id: 'KN-2026-8899',
      full_name: 'Deepak Maurya',
      email: 'deepak.maurya@example.com',
      education_level: 'Diploma (Mechanical Engineering)',
      district_name: 'Gorakhpur',
      readiness_score: 88,
      skills: [
        { name: 'CNC Turning', score_percentage: 90, mastery_probability: 0.90, is_verified: true },
        { name: 'G-Code Programming', score_percentage: 86, mastery_probability: 0.86, is_verified: true },
      ],
      detected_gaps: [
        {
          competency_name: 'Engineering Metrology',
          deficit_pct: 35,
          level: 'Moderate',
          impact: 'Required in 70% of precision manufacturing roles',
        },
      ],
      last_assessment: {
        assessment_id: 'assess-mfg-01',
        score_percentage: 88,
        correct_count: 9,
        total_questions: 10,
      },
    };
    upsertCandidateInRegistry(candidate);

    const dossier = await learnersApi.getById('KN-2026-8899');
    assert.ok(dossier, 'Dossier must not be null');
    assert.equal(dossier.id, 'KN-2026-8899');
    assert.equal(dossier.full_name, 'Deepak Maurya');
    assert.equal(dossier.readiness_score, 88);
    assert.equal(dossier.district_name, 'Gorakhpur');
    assert.equal(dossier.skills.length, 2);
    assert.equal(dossier.skills[0].name, 'CNC Turning');
    assert.equal(dossier.detected_gaps.length, 1);
    assert.equal(dossier.detected_gaps[0].competency_name, 'Engineering Metrology');
    assert.equal(dossier.last_assessment.score_percentage, 88);
  });

  it('5. learnersApi.getSkills and getSkillGaps return actual candidate data for BKTSkillMasteryCard', async () => {
    const candidate = {
      id: 'KN-2026-3322',
      full_name: 'Swati Kulkarni',
      skills: [
        { skill_id: 'sk-1', name: 'SQL & Database', score_percentage: 95, mastery_probability: 0.95 },
        { skill_id: 'sk-2', name: 'Power BI Analytics', score_percentage: 42, mastery_probability: 0.42 },
      ],
      detected_gaps: [
        {
          competency_name: 'Power BI Analytics',
          deficit_pct: 43,
          severity: 'Critical',
        },
      ],
    };
    upsertCandidateInRegistry(candidate);

    const skillsRes = await learnersApi.getSkills('KN-2026-3322');
    assert.ok(skillsRes, 'skillsRes must not be null');
    assert.equal(skillsRes.skills.length, 2);
    assert.equal(skillsRes.skills[0].name, 'SQL & Database');
    assert.equal(skillsRes.skills[0].mastery_probability, 0.95);
    assert.equal(skillsRes.skills[1].name, 'Power BI Analytics');
    assert.equal(skillsRes.skills[1].mastery_probability, 0.42);

    const gapsRes = await learnersApi.getSkillGaps('KN-2026-3322', 'Data Analyst');
    assert.ok(gapsRes, 'gapsRes must not be null');
    assert.ok(Array.isArray(gapsRes.skill_gaps));
    assert.equal(gapsRes.skill_gaps.length, 1);
    assert.equal(gapsRes.skill_gaps[0].skill, 'Power BI Analytics');
    assert.equal(gapsRes.skill_gaps[0].gap, 0.43);
    assert.equal(gapsRes.skill_gaps[0].priority, 'critical');
  });
});
