import { describe, it } from 'node:test';
import assert from 'node:assert';
import { learnersApi } from '../api/learners.js';
import { placementsApi } from '../api/placements.js';
import { dashboardApi } from '../api/dashboard.js';

describe('KaushalNexus Longitudinal Outcomes & Privacy Integration Suite', () => {
  it('1. Privacy Consents API returns fallback structure on network isolation', async () => {
    const consents = await learnersApi.getConsents('KN-TEST-001');
    assert.ok(Array.isArray(consents), 'Consents must be an array');
    assert.ok(consents.length >= 1, 'Default fallback consent should exist');
    assert.strictEqual(consents[0].consent_type, 'FOLLOW_UP_COMMUNICATION');
  });

  it('2. Follow-Up Milestones API returns longitudinal timeline structure', async () => {
    const followUps = await learnersApi.getFollowUps('KN-TEST-001');
    assert.ok(Array.isArray(followUps), 'Follow-ups must be an array');
    assert.ok(followUps.length >= 1, 'Default fallback follow-ups should exist');
    assert.ok(followUps.some((f) => f.follow_up_type === '30_DAY'));
  });

  it('3. Self-Employment API handles creation with micro-enterprise details', async () => {
    const venture = await learnersApi.createSelfEmployment('KN-TEST-001', {
      enterprise_name: 'Solar Technicians Kiosk',
      business_activity: 'Rooftop Inverter Setup',
      sector: 'Power & Clean Energy',
      monthly_income_range: '₹20,000 - ₹35,000',
    });
    assert.strictEqual(venture.enterprise_name, 'Solar Technicians Kiosk');
    assert.strictEqual(venture.verification_status, 'SELF_REPORTED');
  });

  it('4. Non-Placement Diagnostics records competency bottlenecks', async () => {
    const record = await learnersApi.recordNonPlacementReason('KN-TEST-001', {
      reason: 'SKILL_GAP',
      associated_skill_code: 'COMP-GENAI-01',
      notes: 'Needs cloud lab deployment refresher',
    });
    assert.strictEqual(record.reason, 'SKILL_GAP');
    assert.strictEqual(record.associated_skill_code, 'COMP-GENAI-01');
  });

  it('5. Placement Separation & Job Turnover API records departure events', async () => {
    const separation = await placementsApi.recordSeparation('plc-uuid-1234', {
      reason: 'BETTER_OPPORTUNITY',
      separation_date: '2026-05-01',
      notes: 'Hired by Tier-1 OEM supplier',
    });
    assert.strictEqual(separation.reason, 'BETTER_OPPORTUNITY');
    assert.strictEqual(separation.separation_date, '2026-05-01');
  });

  it('6. Multi-Track Outcome Distribution API calculates destination percentages', async () => {
    const outcomes = await dashboardApi.getOutcomeDistribution();
    assert.ok(outcomes.employed_rate > 0, 'Employed rate must be positive');
    assert.ok(outcomes.self_employed_rate > 0, 'Self-employed rate must be positive');
    assert.ok(outcomes.apprenticeship_rate > 0, 'Apprenticeship rate must be positive');
    assert.ok(outcomes.unemployed_rate >= 0, 'Unemployed rate must be defined');
  });

  it('7. Longitudinal Follow-Up Metrics API exposes channel distribution and completion rates', async () => {
    const metrics = await dashboardApi.getFollowUpMetrics();
    assert.ok(metrics.completion_rate > 0, 'Completion rate must be positive');
    assert.ok(metrics.response_rate > 0, 'Response rate must be positive');
    assert.ok(metrics.channel_breakdown.IN_APP !== undefined, 'Channel breakdown must include IN_APP');
  });

  it('8. Non-Placement & Attrition Diagnostic Analytics provides root-cause distribution', async () => {
    const nonPlc = await dashboardApi.getNonPlacementAnalytics();
    assert.ok(Array.isArray(nonPlc.top_reasons), 'Top reasons must be an array');
    assert.ok(nonPlc.skill_gap_percentage > 0, 'Skill gap percentage must be positive');

    const attrition = await dashboardApi.getAttritionAnalytics();
    assert.ok(attrition.three_month_retention_rate > 0, '3M retention rate must be positive');
    assert.ok(attrition.six_month_retention_rate > 0, '6M retention rate must be positive');
    assert.ok(attrition.twelve_month_retention_rate > 0, '12M retention rate must be positive');
  });

  it('9. Wage Progression Metrics captures baseline starting and current CTC trajectories', async () => {
    const wages = await dashboardApi.getWageMetrics();
    assert.ok(wages.avg_starting_ctc_lpa > 0, 'Starting CTC must be positive');
    assert.ok(wages.avg_current_ctc_lpa >= wages.avg_starting_ctc_lpa, 'Current CTC must be >= starting');
    assert.ok(wages.avg_wage_growth_pct >= 0, 'Wage growth pct must be defined');
  });
});
