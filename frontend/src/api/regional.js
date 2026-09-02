import { apiClient } from './client';
import { districtPerformance, priorityDistricts, skillDemand } from '../data/regionalData';

export const regionalApi = {
  /**
   * Lists all monitored districts with geospatial and skilling metrics
   * @param {Object} params - { state, region, tier }
   */
  async getDistricts(params = {}) {
    try {
      const response = await apiClient.get('/regional/districts', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return districtPerformance.map((d, i) => ({
          id: `dist-${i + 1}`,
          district_name: d.district,
          state: 'Uttar Pradesh',
          region: d.region,
          tier: d.tier,
          total_enrolled: d.learners,
          total_certified: d.certified,
          placement_rate: d.employment,
          retention_rate_180d: d.retention6M,
          primary_sector: d.topSector,
          priority_level: d.priority,
          active_employers_count: d.employersActive,
        }));
      }
      throw err;
    }
  },

  /**
   * Retrieves regional demand vs supply divergence analytics and state aggregates
   * @param {Object} params - { state, region, district, tier }
   */
  async getDivergence(params = {}) {
    try {
      const response = await apiClient.get('/regional/divergence', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          clusters: skillDemand,
          state_divergence_index: 38.4,
        };
      }
      throw err;
    }
  },

  /**
   * Retrieves priority intervention clusters ranked by vulnerability index
   * @param {Object} params - { state, region, district, tier, limit }
   */
  async getPriorityClusters(params = {}) {
    try {
      const response = await apiClient.get('/regional/priority-clusters', {
        params: typeof params === 'number' ? { limit: params } : params,
      });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return priorityDistricts;
      }
      throw err;
    }
  },
};
