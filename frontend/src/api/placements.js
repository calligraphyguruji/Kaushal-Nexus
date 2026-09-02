import { apiClient } from './client';

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
};
