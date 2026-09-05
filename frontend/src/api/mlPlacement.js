import { apiClient } from './client.js';

export const mlPlacementApi = {
  /**
   * Retrieves current candidate's calibrated placement prediction, drivers, and recommendations
   */
  async getMyPlacementPrediction() {
    const response = await apiClient.get('/learners/me/placement-prediction');
    return response.data;
  },

  /**
   * Staff/Evaluator retrieves placement prediction for any candidate
   */
  async getLearnerPlacementPrediction(learnerId, cutoff = null) {
    const params = cutoff ? { prediction_cutoff: cutoff } : {};
    const response = await apiClient.post(`/learners/${learnerId}/placement-prediction`, null, { params });
    return response.data;
  },

  /**
   * Triggers the full training, tuning, and probability calibration pipeline
   */
  async trainPlacementModel(payload = {}) {
    const response = await apiClient.post('/ml/placement/train', payload);
    return response.data;
  },

  /**
   * Retrieves data quality report on training snapshots
   */
  async getDataQualityReport() {
    const response = await apiClient.get('/ml/placement/data-quality');
    return response.data;
  },

  /**
   * Retrieves active model metadata, evaluation metrics, calibration curve, and feature importances
   */
  async getActiveModel() {
    const response = await apiClient.get('/ml/placement/model');
    return response.data;
  },

  /**
   * Retrieves historical training runs and metric evaluations
   */
  async getTrainingRuns() {
    const response = await apiClient.get('/ml/placement/runs');
    return response.data;
  },
};
