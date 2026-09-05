import { apiClient } from './client.js';

export const careerIntelligenceApi = {
  /**
   * Retrieves candidate career readiness, calibrated XGBoost placement probability,
   * priority areas, next-best actions, strengths, and strategic recommendations.
   */
  async getMyCareerIntelligence() {
    const response = await apiClient.get('/learners/me/career-intelligence');
    return response.data;
  },

  /**
   * Institutional staff/evaluators generate career intelligence for any candidate.
   */
  async getLearnerCareerIntelligence(learnerId, cutoff = null) {
    const params = cutoff ? { prediction_cutoff: cutoff } : {};
    const response = await apiClient.post(`/learners/${learnerId}/career-intelligence`, null, { params });
    return response.data;
  },

  /**
   * Retrieves longitudinal model monitoring, calibration deciles, and feature drift status.
   */
  async getModelMonitoring() {
    const response = await apiClient.get('/ml/placement/monitoring');
    return response.data;
  },

  /**
   * Trains a candidate model and checks discrimination and calibration quality gates.
   */
  async retrainCandidateModel(payload = {}) {
    const response = await apiClient.post('/ml/placement/retrain', payload);
    return response.data;
  },

  /**
   * Promotes candidate or archived model version to ACTIVE with auditable justification.
   */
  async activateModel(modelId, reason) {
    const response = await apiClient.post(`/ml/placement/models/${encodeURIComponent(modelId)}/activate`, { reason });
    return response.data;
  },

  /**
   * Retrieves institutional cohort intelligence, skill-gap heatmap, and prioritized interventions.
   */
  async getCohortIntelligence() {
    const response = await apiClient.get('/ml/career-intelligence/cohort');
    return response.data;
  },
};
