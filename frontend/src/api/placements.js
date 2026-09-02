import { apiClient } from './client.js';

export const placementsApi = {
  /**
   * Registers a new verified placement and auto-initializes 3M/6M/12M checkpoints
   * @param {Object} placementData
   */
  async create(placementData) {
    const response = await apiClient.post('/placements', placementData);
    return response.data;
  },

  /**
   * Retrieves all placement dossiers for a specific candidate
   * @param {string} learnerId
   */
  async getByLearnerId(learnerId) {
    const response = await apiClient.get(`/placements/${learnerId}`);
    return response.data;
  },

  /**
   * Retrieves longitudinal retention milestone audit for a placement
   * @param {string} placementId
   */
  async getRetentionAudit(placementId) {
    const response = await apiClient.get(`/placements/${placementId}/retention`);
    return response.data;
  },

  /**
   * Updates checkpoint active status, current CTC, and recalculates wage increment
   * @param {string} placementId
   * @param {string} checkpointType - '3M', '6M', or '12M'
   * @param {Object} updateData - { is_active_at_checkpoint, current_ctc_lpa, remarks, epfo_verified }
   */
  async updateCheckpoint(placementId, checkpointType, updateData) {
    const response = await apiClient.put(
      `/placements/${placementId}/retention/${checkpointType}`,
      updateData
    );
    return response.data;
  },

  /**
   * Retrieves turnover and job departure reasons documented for a placement
   * @param {string} placementId
   */
  async getSeparations(placementId) {
    try {
      const response = await apiClient.get(`/placements/${placementId}/separations`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Documents employee departure / turnover event and updates retention checkpoints
   * @param {string} placementId
   * @param {Object} separationData - { reason, separation_date, checkpoint_id, source, notes, associated_skill_gap }
   */
  async recordSeparation(placementId, separationData) {
    try {
      const response = await apiClient.post(`/placements/${placementId}/separations`, separationData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          id: `sep-${Date.now()}`,
          placement_id: placementId,
          ...separationData,
          recorded_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },
};
