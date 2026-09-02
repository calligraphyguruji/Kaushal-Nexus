import { apiClient } from './client';
import { employmentTrend, conversionPipeline, programPerformance } from '../data/dashboardData';

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
};
