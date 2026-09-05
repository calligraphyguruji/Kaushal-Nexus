import { apiClient } from './client.js';
import { learnersList } from '../data/learnerData.js';

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

  // ==========================================
  // Privacy & Consent Governance
  // ==========================================

  async getConsents(learnerId) {
    try {
      const response = await apiClient.get(`/learners/${learnerId}/consents`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return [
          {
            id: 'c-mock-1',
            consent_type: 'FOLLOW_UP_COMMUNICATION',
            purpose: 'Longitudinal outcome follow-up surveys',
            granted: true,
            version: 'v1.0',
            granted_at: new Date().toISOString(),
          },
          {
            id: 'c-mock-2',
            consent_type: 'WAGE_TRACKING',
            purpose: 'EPFO & employer wage progression verification',
            granted: true,
            version: 'v1.0',
            granted_at: new Date().toISOString(),
          },
        ];
      }
      throw err;
    }
  },

  async createConsent(learnerId, data) {
    try {
      const response = await apiClient.post(`/learners/${learnerId}/consents`, data);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return { id: `c-${Date.now()}`, learner_id: learnerId, ...data, granted_at: new Date().toISOString() };
      }
      throw err;
    }
  },

  async revokeConsent(learnerId, consentId) {
    try {
      const response = await apiClient.delete(`/learners/${learnerId}/consents/${consentId}`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return { id: consentId, granted: false, revoked_at: new Date().toISOString() };
      }
      throw err;
    }
  },

  // ==========================================
  // Longitudinal Follow-Up Milestones
  // ==========================================

  async getFollowUps(learnerId) {
    try {
      const response = await apiClient.get(`/learners/${learnerId}/follow-ups`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return [
          {
            id: 'fu-mock-1',
            follow_up_type: '30_DAY',
            scheduled_at: new Date(Date.now() - 5 * 86400000).toISOString(),
            status: 'COMPLETED',
            channel: 'IN_APP',
            response_status: 'EMPLOYED',
            notes: 'Verified placement with employer.',
          },
          {
            id: 'fu-mock-2',
            follow_up_type: '90_DAY',
            scheduled_at: new Date(Date.now() + 30 * 86400000).toISOString(),
            status: 'SCHEDULED',
            channel: 'SMS',
          },
        ];
      }
      throw err;
    }
  },

  async scheduleFollowUp(learnerId, data) {
    try {
      const response = await apiClient.post(`/learners/${learnerId}/follow-ups`, data);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return { id: `fu-${Date.now()}`, learner_id: learnerId, ...data, status: 'SCHEDULED', attempt_count: 0 };
      }
      throw err;
    }
  },

  async recordFollowUpResponse(learnerId, followUpId, data) {
    try {
      const response = await apiClient.post(`/learners/${learnerId}/follow-ups/${followUpId}/respond`, data);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return { id: followUpId, status: 'COMPLETED', ...data, completed_at: new Date().toISOString() };
      }
      throw err;
    }
  },

  // ==========================================
  // Self-Employment & Micro-Enterprise
  // ==========================================

  async getSelfEmployment(learnerId) {
    try {
      const response = await apiClient.get(`/learners/${learnerId}/self-employment`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return [];
      }
      throw err;
    }
  },

  async createSelfEmployment(learnerId, data) {
    try {
      const response = await apiClient.post(`/learners/${learnerId}/self-employment`, data);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return { id: `se-${Date.now()}`, learner_id: learnerId, ...data, verification_status: 'SELF_REPORTED' };
      }
      throw err;
    }
  },

  async verifySelfEmployment(learnerId, outcomeId, data) {
    try {
      const response = await apiClient.patch(`/learners/${learnerId}/self-employment/${outcomeId}/verify`, data);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return { id: outcomeId, ...data, verified_at: new Date().toISOString() };
      }
      throw err;
    }
  },

  // ==========================================
  // Non-Placement Reasons
  // ==========================================

  async getNonPlacementReasons(learnerId) {
    try {
      const response = await apiClient.get(`/learners/${learnerId}/non-placement-reasons`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return [];
      }
      throw err;
    }
  },

  async recordNonPlacementReason(learnerId, data) {
    try {
      const response = await apiClient.post(`/learners/${learnerId}/non-placement-reasons`, data);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return { id: `np-${Date.now()}`, learner_id: learnerId, ...data, recorded_at: new Date().toISOString() };
      }
      throw err;
    }
  },

  // ==========================================
  // Bayesian Knowledge Tracing (BKT) APIs
  // ==========================================

  async getSkills(learnerId) {
    try {
      const response = await apiClient.get(`/learners/${learnerId}/skills`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          learner_id: learnerId,
          skills: [
            { skill_id: "s1", skill: "Python Basics", mastery_probability: 0.82, status: "mastered", questions_attempted: 12 },
            { skill_id: "s2", skill: "Python OOP", mastery_probability: 0.54, status: "developing", questions_attempted: 8 },
            { skill_id: "s3", skill: "SQL", mastery_probability: 0.43, status: "developing", questions_attempted: 9 },
            { skill_id: "s4", skill: "Git", mastery_probability: 0.31, status: "weak", questions_attempted: 6 },
            { skill_id: "s5", skill: "DSA", mastery_probability: 0.65, status: "proficient", questions_attempted: 14 },
            { skill_id: "s6", skill: "REST API", mastery_probability: 0.25, status: "weak", questions_attempted: 7 },
          ],
        };
      }
      throw err;
    }
  },

  async getSkillGaps(learnerId, roleId = "Python Developer Intern") {
    try {
      const response = await apiClient.get(`/learners/${learnerId}/skill-gaps`, {
        params: { role_id: roleId },
      });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          learner_id: learnerId,
          role: roleId,
          overall_alignment: 0.63,
          skill_gaps: [
            { skill: "REST API", current_mastery: 0.25, required_mastery: 0.60, gap: 0.35, priority: "high" },
            { skill: "Git", current_mastery: 0.31, required_mastery: 0.60, gap: 0.29, priority: "high" },
            { skill: "SQL", current_mastery: 0.43, required_mastery: 0.65, gap: 0.22, priority: "medium" },
            { skill: "Python OOP", current_mastery: 0.54, required_mastery: 0.70, gap: 0.16, priority: "medium" },
          ],
        };
      }
      throw err;
    }
  },

  async getBktFeatures(learnerId) {
    try {
      const response = await apiClient.get(`/learners/${learnerId}/bkt-features`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          learner_id: learnerId,
          features: {
            python_basics_mastery: 0.82,
            python_oop_mastery: 0.54,
            sql_mastery: 0.43,
            git_mastery: 0.31,
            dsa_mastery: 0.65,
            rest_api_mastery: 0.25,
          },
          total_skills_assessed: 6,
          generated_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },
};
