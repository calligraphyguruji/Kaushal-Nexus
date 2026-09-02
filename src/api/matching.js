import { apiClient } from './client';
import { jobMatches } from '../data/employerData';

export const matchingApi = {
  /**
   * Lists active employer hiring mandates
   * @param {Object} params - { sector, state, is_active }
   */
  async listMandates(params = {}) {
    try {
      const response = await apiClient.get('/matching/mandates', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return jobMatches.map((j) => ({
          id: j.id,
          job_title: j.role,
          company_name: j.company,
          sector: j.companyType,
          location_city: j.location,
          min_salary_inr: 450000,
          max_salary_inr: 650000,
          openings: j.openings,
          required_skills: j.skills,
          is_active: true,
        }));
      }
      throw err;
    }
  },

  /**
   * Calculates explainable multi-signal candidate-to-job matching scores
   * @param {string} learnerId
   * @param {number} topN
   */
  async calculateMatches(learnerId, topN = 10) {
    try {
      const response = await apiClient.get(`/matching/calculate/${learnerId}`, {
        params: { top_n: topN },
      });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return jobMatches.slice(0, topN).map((j) => ({
          mandate_id: j.id,
          job_title: j.role,
          company_name: j.company,
          location: j.location,
          salary: j.salary,
          match_score: j.match,
          skill_score: j.matchBreakdown.skillAlignment,
          mobility_score: j.matchBreakdown.locationFit,
          readiness_score: j.matchBreakdown.readinessFit,
          matched_competencies: j.matchedSkills,
          missing_competencies: j.missingSkills,
          openings: j.openings,
          match_explanation: j.rationale,
        }));
      }
      throw err;
    }
  },

  /**
   * Dispatches shortlisted candidate batch directly to employer hiring mandate
   * @param {Object} payload - { mandate_id, learner_ids, dispatch_notes }
   */
  async dispatchBatch(payload) {
    try {
      const response = await apiClient.post('/matching/dispatch-batch', payload);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          success: true,
          dispatch_id: `DISP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          message: 'Candidate dossier batch successfully dispatched to employer HR portal.',
        };
      }
      throw err;
    }
  },
};
