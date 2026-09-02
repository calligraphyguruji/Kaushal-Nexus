import { apiClient } from './client.js';
import { employmentTrend, conversionPipeline, programPerformance } from '../data/dashboardData.js';

const MOCK_SUMMARY = {
  total_enrolled: 28450,
  total_trained: 25600,
  total_certified: 24580,
  total_placed: 16886,
  placement_percentage: 68.7,
  retention_percentage: 81.3,
  active_hiring_mandates: 4800,
  avg_readiness_score: 84.5,
  retention_verified_count: 13728,
  deltas: {
    enrolled: { value: '+14.2%', is_positive: true, context: 'vs last quarter' },
    certified: { value: '+8.7%', is_positive: true, context: 'MoM growth' },
    placement: { value: '+8.4%', is_positive: true, context: 'conversion rate' },
    mandates: { value: '+18.5%', is_positive: true, context: 'active corporate listings' },
  },
};

export const dashboardApi = {
  /**
   * Fetches high-level executive dashboard summary and KPI indicators
   * @param {Object} params - { district_id, state }
   */
  async getSummary(params = {}) {
    try {
      const response = await apiClient.get('/dashboard/summary', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return MOCK_SUMMARY;
      }
      throw err;
    }
  },

  /**
   * Fetches longitudinal employment retention trend data points
   * @param {Object} params - { district_id, months }
   */
  async getEmploymentTrend(params = {}) {
    try {
      const response = await apiClient.get('/dashboard/employment-trend', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return employmentTrend;
      }
      throw err;
    }
  },

  /**
   * Fetches candidate 5-stage conversion funnel pipeline metrics
   * @param {Object} params - { district_id }
   */
  async getFunnel(params = {}) {
    try {
      const response = await apiClient.get('/dashboard/funnel', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return conversionPipeline;
      }
      throw err;
    }
  },

  /**
   * Fetches cross-sector performance and placement-retention matrix
   * @param {Object} params - { district_id }
   */
  async getSectorMatrix(params = {}) {
    try {
      const response = await apiClient.get('/dashboard/sector-matrix', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return programPerformance;
      }
      throw err;
    }
  },

  /**
   * Fetches multi-track outcome distribution (Employed, Self-Employed, Apprenticeship, Unemployed)
   * @param {Object} params - { district_id }
   */
  async getOutcomeDistribution(params = {}) {
    try {
      const response = await apiClient.get('/dashboard/outcomes', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          total_candidates: 28450,
          employed_count: 16886,
          employed_rate: 59.4,
          self_employed_count: 4268,
          self_employed_rate: 15.0,
          apprenticeship_count: 2845,
          apprenticeship_rate: 10.0,
          unemployed_count: 2845,
          unemployed_rate: 10.0,
          further_education_count: 1138,
          further_education_rate: 4.0,
          other_count: 468,
          other_rate: 1.6,
        };
      }
      throw err;
    }
  },

  /**
   * Fetches longitudinal follow-up milestone completion, pending, and channel breakdown
   * @param {Object} params - { district_id }
   */
  async getFollowUpMetrics(params = {}) {
    try {
      const response = await apiClient.get('/dashboard/follow-ups', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          total_scheduled: 18450,
          completed_count: 14820,
          completion_rate: 80.3,
          pending_count: 3120,
          overdue_count: 510,
          response_rate: 76.5,
          channel_breakdown: { IN_APP: 45, EMAIL: 28, SMS: 18, ASSISTED_CALL: 9 },
        };
      }
      throw err;
    }
  },

  /**
   * Fetches non-placement diagnostic factors and skill-gap proportions
   * @param {Object} params - { district_id }
   */
  async getNonPlacementAnalytics(params = {}) {
    try {
      const response = await apiClient.get('/dashboard/non-placement', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          total_unplaced: 2845,
          skill_gap_related_count: 1080,
          skill_gap_percentage: 38.0,
          top_reasons: [
            { reason: 'SKILL_GAP', count: 1080, percentage: 38.0 },
            { reason: 'INTERVIEW_FAILURE', count: 680, percentage: 23.9 },
            { reason: 'LOCATION_CONSTRAINT', count: 480, percentage: 16.9 },
            { reason: 'SALARY_EXPECTATION', count: 380, percentage: 13.4 },
            { reason: 'COMMUNICATION_ISSUE', count: 225, percentage: 7.9 },
          ],
          district_breakdown: [
            { district_id: 'UP-VARANASI', unplaced_count: 320 },
            { district_id: 'MH-PUNE', unplaced_count: 280 },
            { district_id: 'KA-BENGALURU-U', unplaced_count: 240 },
          ],
        };
      }
      throw err;
    }
  },

  /**
   * Fetches post-placement attrition rates, checkpoint milestones, and separation drivers
   * @param {Object} params - { district_id }
   */
  async getAttritionAnalytics(params = {}) {
    try {
      const response = await apiClient.get('/dashboard/attrition', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          total_separated: 1420,
          attrition_rate: 8.4,
          three_month_retention_rate: 88.5,
          six_month_retention_rate: 81.3,
          twelve_month_retention_rate: 74.2,
          top_reasons: [
            { reason: 'BETTER_OPPORTUNITY', count: 580, percentage: 40.8 },
            { reason: 'LOW_SALARY', count: 320, percentage: 22.5 },
            { reason: 'RELOCATION', count: 210, percentage: 14.8 },
            { reason: 'SKILL_MISMATCH', count: 180, percentage: 12.7 },
            { reason: 'WORK_ENVIRONMENT', count: 130, percentage: 9.2 },
          ],
          checkpoint_breakdown: { '3M': 380, '6M': 620, '12M': 420 },
          sector_breakdown: [
            { sector: 'IT-ITeS', separated_count: 420, attrition_rate: 7.2 },
            { sector: 'Smart Manufacturing', separated_count: 380, attrition_rate: 9.8 },
            { sector: 'Renewable Energy', separated_count: 220, attrition_rate: 6.5 },
          ],
        };
      }
      throw err;
    }
  },

  /**
   * Fetches self-employment statistics, micro-enterprise verification rates, and sector spread
   * @param {Object} params - { district_id }
   */
  async getSelfEmploymentAnalytics(params = {}) {
    try {
      const response = await apiClient.get('/dashboard/self-employment', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          total_self_employed: 4268,
          self_employment_rate: 15.0,
          verified_count: 3280,
          verification_rate: 76.9,
          sector_breakdown: [
            { sector: 'Electronics & Repair', count: 1420 },
            { sector: 'Solar & Rooftop Installation', count: 1180 },
            { sector: 'Handicrafts & Apparel', count: 960 },
            { sector: 'Digital Services Kiosks', count: 708 },
          ],
          district_breakdown: [
            { district_id: 'UP-VARANASI', count: 640 },
            { district_id: 'MH-PUNE', count: 520 },
            { district_id: 'KA-BENGALURU-U', count: 480 },
          ],
        };
      }
      throw err;
    }
  },

  /**
   * Fetches wage trajectory and starting vs current CTC progression metrics
   * @param {Object} params - { district_id }
   */
  async getWageMetrics(params = {}) {
    try {
      const response = await apiClient.get('/dashboard/wages', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          avg_starting_ctc_lpa: 4.2,
          avg_current_ctc_lpa: 4.8,
          avg_wage_growth_pct: 14.3,
          median_wage_growth_pct: 12.5,
          placements_tracked: 16886,
        };
      }
      throw err;
    }
  },
};
