import { describe, it } from 'node:test';
import assert from 'node:assert';
import { learnerPipelineApi } from '../api/learnerPipeline.js';

describe('Learner 360 Pipeline & Profile Resiliency Suite', () => {
  it('1. getMyProfile returns valid candidate profile offline without Network Error', async () => {
    const profile = await learnerPipelineApi.getMyProfile();
    assert.ok(profile, 'Profile must not be null');
    assert.ok(profile.id, 'Candidate must have an ID');
    assert.ok(profile.full_name, 'Candidate must have a name');
  });

  it('2. updateMyProfile succeeds when GitHub and LinkedIn are blank or empty strings', async () => {
    const updatePayload = {
      full_name: 'Ananya Verma',
      phone: '9811223344',
      education_level: 'B.Tech IT',
      institution: 'IIT Kanpur',
      graduation_year: 2026,
      experience_years: 1.0,
      bio: 'Cloud architecture and distributed systems developer.',
      github_url: '',
      linkedin_url: '',
    };

    const updated = await learnerPipelineApi.updateMyProfile(updatePayload);
    assert.ok(updated, 'Updated record must not be null');
    assert.strictEqual(updated.full_name, 'Ananya Verma');
    assert.strictEqual(updated.github_url, '');
    assert.strictEqual(updated.linkedin_url, '');
  });

  it('3. updateMyProfile accepts normalized social profile URLs', async () => {
    const updatePayload = {
      full_name: 'Ananya Verma',
      github_url: 'https://github.com/ananya-verma',
      linkedin_url: 'https://linkedin.com/in/ananya-verma',
    };

    const updated = await learnerPipelineApi.updateMyProfile(updatePayload);
    assert.strictEqual(updated.github_url, 'https://github.com/ananya-verma');
    assert.strictEqual(updated.linkedin_url, 'https://linkedin.com/in/ananya-verma');
  });

  it('4. listRoles returns NSQF national track standards', async () => {
    const roles = await learnerPipelineApi.listRoles();
    assert.ok(Array.isArray(roles), 'Roles must be an array');
    assert.ok(roles.length >= 6, 'Must include all 6 core national roles');
    assert.ok(roles.some((r) => r.id === 'role-fullstack'));
    assert.ok(roles.some((r) => r.id === 'role-python'));
  });

  it('5. getMyResume returns parsed resume without Network Error', async () => {
    const resume = await learnerPipelineApi.getMyResume();
    assert.ok(resume, 'Resume must not be null');
    assert.ok(Array.isArray(resume.parsed_skills), 'Parsed skills must be an array');
    assert.ok(resume.parsed_skills.length > 0, 'Should have extracted skills');
  });

  it('6. getMyRoleMatches returns calculated BKT match distributions', async () => {
    const matches = await learnerPipelineApi.getMyRoleMatches();
    assert.ok(Array.isArray(matches), 'Role matches must be an array');
    assert.ok(matches.length > 0, 'Matches must not be empty');
    assert.ok(matches[0].match_percentage > 50, 'Top match should exceed 50%');
  });
});
