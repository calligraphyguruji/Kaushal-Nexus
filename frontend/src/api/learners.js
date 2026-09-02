import { apiClient } from './client';
import { learnersList } from '../data/learnerData';

export const learnersApi = {
  /**
   * Lists and filters candidates with pagination
   * @param {Object} params - { search, district_id, status, nsqf_level, page, page_size }
   */
  async list(params = {}) {
    try {
      const response = await apiClient.get('/learners', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          items: learnersList.map((l) => ({
            id: l.id,
            full_name: l.name,
            trade: l.trade,
            district_name: l.location?.split(',')[0] || 'Lucknow',
            status: l.status,
            readiness_score: l.readiness,
            nsqf_level: l.nsqfLevel,
            aadhaar_verified: l.verified,
          })),
          total: learnersList.length,
          page: 1,
          page_size: 50,
          pages: 1,
        };
      }
      throw err;
    }
  },

  /**
   * Retrieves complete 360-degree candidate intelligence dossier
   * @param {string} learnerId
   */
  async getById(learnerId) {
    try {
      const response = await apiClient.get(`/learners/${learnerId}`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        const found = learnersList.find((l) => l.id === learnerId);
        return found || learnersList[0];
      }
      throw err;
    }
  },

  /**
   * Registers a new candidate into the national registry
   * @param {Object} learnerData
   */
  async create(learnerData) {
    try {
      const response = await apiClient.post('/learners', learnerData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          id: `KN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          ...learnerData,
          readiness_score: 85,
          created_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  /**
   * Partially updates candidate profile fields
   * @param {string} learnerId
   * @param {Object} updateData
   */
  async update(learnerId, updateData) {
    try {
      const response = await apiClient.patch(`/learners/${learnerId}`, updateData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return { id: learnerId, ...updateData };
      }
      throw err;
    }
  },

  /**
   * Verifies candidate credentials against NCVET / NSR repository
   * @param {string} learnerId
   * @param {Object} payload - { notes }
   */
  async verifyCredential(learnerId, payload = {}) {
    try {
      const response = await apiClient.post(`/learners/${learnerId}/verify-credential`, payload);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          learner_id: learnerId,
          verified: true,
          verification_source: 'NCVET-NSR-MOCK',
          verified_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  /**
   * Assigns targeted remedial bridge curriculum track
   * @param {string} learnerId
   * @param {Object} payload - { module_name, duration_hours, target_competency_code }
   */
  async allocateBridgeModule(learnerId, payload) {
    try {
      const response = await apiClient.post(`/learners/${learnerId}/allocate-bridge-module`, payload);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          allocation_id: `MOD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          learner_id: learnerId,
          status: 'ENROLLED',
          ...payload,
        };
      }
      throw err;
    }
  },
};
