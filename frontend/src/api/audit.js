import { apiClient } from './client';

export const auditApi = {
  /**
   * Queries compliance and security audit logs
   * @param {Object} params - { action, resource_type, resource_id, actor_id, correlation_id, limit, offset }
   */
  async getLogs(params = {}) {
    const response = await apiClient.get('/audit/logs', { params });
    return response.data;
  },
};
