import { apiClient } from './client.js';

export const verificationApi = {
  /**
   * Performs demographic identity verification via simulated sandbox adapter (with automated PII masking)
   * @param {Object} payload - { aadhaar_number, full_name, dob, state }
   */
  async verifyIdentity(payload) {
    const response = await apiClient.post('/verification/identity', payload);
    return response.data;
  },

  /**
   * Dispatches mobile OTP for simulated e-KYC
   * @param {string} aadhaarNumber
   */
  async sendIdentityOtp(aadhaarNumber) {
    const response = await apiClient.post('/verification/identity/otp/send', {
      aadhaar_number: aadhaarNumber,
    });
    return response.data;
  },

  /**
   * Validates OTP and completes identity authentication
   * @param {Object} payload - { txn_id, otp, aadhaar_number, full_name }
   */
  async verifyIdentityOtp(payload) {
    const response = await apiClient.post('/verification/identity/otp/verify', payload);
    return response.data;
  },

  /**
   * Audits candidate employment continuity against electronic establishment passbook
   * @param {Object} payload - { uan, employer_name }
   */
  async verifyEpfo(payload) {
    const response = await apiClient.post('/verification/epfo', payload);
    return response.data;
  },

  /**
   * Verifies digital qualification authenticity against Skill India Digital / NCVET repository
   * @param {Object} payload - { credential_id, candidate_name }
   */
  async verifySid(payload) {
    const response = await apiClient.post('/verification/sid', payload);
    return response.data;
  },

  /**
   * Executes concurrent multi-channel verification across Identity, EPFO, and Skills
   * @param {Object} payload - { expected_name, aadhaar_number, uan, employer_name, credential_id }
   */
  async runCandidate360Audit(payload) {
    const response = await apiClient.post('/verification/candidate-360', payload);
    return response.data;
  },

  /**
   * Checks connectivity and readiness status for external integration adapters
   */
  async checkAdaptersHealth() {
    const response = await apiClient.get('/verification/health');
    return response.data;
  },
};
