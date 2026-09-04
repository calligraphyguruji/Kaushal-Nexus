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
          district_id: `dist-${i + 1}`,
          id: `dist-${i + 1}`,
          name: d.district,
          district_name: d.district,
          state: 'Uttar Pradesh',
          region: d.region,
          tier: d.tier,
          total_enrolled: d.learners,
          total_trained: Math.round(d.learners * 0.9),
          total_certified: d.certified,
          total_placed: Math.round(d.certified * (d.employment / 100)),
          placement_rate: d.employment,
          retention_rate: d.retention6M,
          retention_rate_180d: d.retention6M,
          training_completion_rate: 88.5,
          employer_demand_index: Math.min(100, Math.round(d.employment + 14)),
          workforce_supply_index: Math.min(100, Math.round(d.employment - 12)),
          divergence_score: 26.0,
          dominant_skill_gaps: [d.dominantGap || 'Technical Automation & Data'],
          primary_sector: d.topSector,
          priority_level: d.priority === 'High' ? 'Critical' : d.priority === 'Medium' ? 'Elevated' : 'Stable',
          active_employers_count: d.employersActive,
          active_training_centers_count: 4,
          vulnerability_index: d.priority === 'High' ? 52.0 : 34.0,
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
          summary: {
            total_districts: districtPerformance.length,
            high_divergence_count: 3,
            avg_divergence: 28.5,
          },
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
        return priorityDistricts.map((d, i) => ({
          district_id: `cluster-${i + 1}`,
          district_name: d.district,
          state: 'Uttar Pradesh',
          region: 'Eastern UP',
          tier: 'Tier 3',
          rank: i + 1,
          composite_priority_score: 84 - i * 8,
          divergence_score: parseFloat(d.metricValue) || 35.0,
          learners_at_risk: 380 - i * 50,
          key_bottlenecks: [d.rootCause],
          recommended_interventions: [d.recommendation],
        }));
      }
      throw err;
    }
  },
};
