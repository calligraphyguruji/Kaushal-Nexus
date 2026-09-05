import { apiClient } from './client.js';

export const learnerPipelineApi = {
  /**
   * Retrieves current authenticated learner profile
   */
  async getMyProfile() {
    const response = await apiClient.get('/learners/me/profile');
    return response.data;
  },

  /**
   * Updates current authenticated learner profile
   */
  async updateMyProfile(profileData) {
    const response = await apiClient.put('/learners/me/profile', profileData);
    return response.data;
  },

  /**
   * Uploads candidate resume file (PDF/DOCX) for skill and project extraction
   */
  async uploadResume(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/learners/me/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Retrieves active parsed resume with candidate skills and projects
   */
  async getMyResume() {
    const response = await apiClient.get('/learners/me/resume');
    return response.data;
  },

  /**
   * Deletes active resume
   */
  async deleteMyResume() {
    const response = await apiClient.delete('/learners/me/resume');
    return response.data;
  },

  /**
   * Lists available target roles and occupation standards
   */
  async listRoles() {
    const response = await apiClient.get('/roles');
    return response.data;
  },

  /**
   * Retrieves role details with competency requirements
   */
  async getRoleById(roleId) {
    const response = await apiClient.get(`/roles/${roleId}`);
    return response.data;
  },

  /**
   * Retrieves candidate's current target aspiring role
   */
  async getMyAspiringRole() {
    const response = await apiClient.get('/learners/me/aspiring-role');
    return response.data;
  },

  /**
   * Sets or updates candidate's aspiring role
   */
  async setMyAspiringRole(roleId) {
    const response = await apiClient.put('/learners/me/aspiring-role', { role_id: roleId });
    return response.data;
  },

  /**
   * Calculates real-time BKT role matches and gap diagnostics
   */
  async getMyRoleMatches() {
    const response = await apiClient.get('/learners/me/role-matches');
    return response.data;
  },

  /**
   * Retrieves BKT skill masteries for authenticated learner
   */
  async getMySkills() {
    const response = await apiClient.get('/learners/me/skills');
    return response.data;
  },

  /**
   * Analyzes skill deficits against target role
   */
  async getMySkillGaps(roleId = null) {
    const params = roleId ? { role_id: roleId } : {};
    const response = await apiClient.get('/learners/me/skill-gaps', { params });
    return response.data;
  },

  /**
   * Generates leakage-free ML tabular feature vector for XGBoost models
   */
  async getMyBktFeatures() {
    const response = await apiClient.get('/learners/me/bkt-features');
    return response.data;
  },

  /**
   * Records candidate ground-truth outcome
   */
  async recordOutcome(outcomeData) {
    const response = await apiClient.post('/learners/me/outcomes', outcomeData);
    return response.data;
  },

  /**
   * Lists candidate ground-truth career outcomes
   */
  async getMyOutcomes() {
    const response = await apiClient.get('/learners/me/outcomes');
    return response.data;
  },

  // ============================================================================
  // Phase 3: Adaptive Learning & Remediation Loop APIs
  // ============================================================================

  /**
   * Retrieves candidate's active personalized remedial learning plan
   */
  async getMyLearningPlan() {
    const response = await apiClient.get('/learners/me/learning-plan');
    return response.data;
  },

  /**
   * Generates or regenerates learning plan based on current BKT skill gaps
   */
  async generateLearningPlan(forceRegenerate = false) {
    const response = await apiClient.post('/learners/me/learning-plan/generate', null, {
      params: { force_regenerate: forceRegenerate },
    });
    return response.data;
  },

  /**
   * Retrieves specific module detail with resources and prerequisites
   */
  async getLearningPlanModule(moduleId) {
    const response = await apiClient.get(`/learners/me/learning-plan/${moduleId}`);
    return response.data;
  },

  /**
   * Fetches targeted practice and reassessment questions for a competency
   */
  async getPracticeQuestions(competencyId) {
    const response = await apiClient.get(`/learners/me/practice/${competencyId}`);
    return response.data;
  },

  /**
   * Submits practice answers, updates BKT, and returns adaptive intervention decisions
   */
  async submitPractice(competencyId, submissionData) {
    const response = await apiClient.post(
      `/learners/me/practice/${competencyId}/submit`,
      submissionData
    );
    return response.data;
  },

  /**
   * Logs candidate educational activity (reading docs, watching video)
   * RULE: Does NOT directly alter BKT mastery
   */
  async recordLearningActivity(activityData) {
    const response = await apiClient.post('/learners/me/learning-activity', activityData);
    return response.data;
  },

  /**
   * Retrieves candidate activity log
   */
  async getLearningActivities(limit = 50) {
    const response = await apiClient.get('/learners/me/learning-activity', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Gets overall remediation progress and milestone summary
   */
  async getLearningProgress() {
    const response = await apiClient.get('/learners/me/learning-progress');
    return response.data;
  },

  // ============================================================================
  // Phase 4: Career Outcome Tracking & ML Dataset Foundation APIs
  // ============================================================================

  /**
   * Retrieves comprehensive candidate career journey overview
   */
  async getCareerJourneyOverview() {
    const response = await apiClient.get('/learners/me/career-journey');
    return response.data;
  },

  /**
   * Lists chronological career events
   */
  async listCareerEvents(params = {}) {
    const response = await apiClient.get('/learners/me/career-events', { params });
    return response.data;
  },

  /**
   * Records a timestamped career journey event
   */
  async recordCareerEvent(eventData) {
    const response = await apiClient.post('/learners/me/career-events', eventData);
    return response.data;
  },

  /**
   * Lists candidate job/internship applications
   */
  async listCareerApplications(status = null) {
    const params = status ? { status } : {};
    const response = await apiClient.get('/learners/me/applications', { params });
    return response.data;
  },

  /**
   * Creates a job/internship application
   */
  async createCareerApplication(applicationData) {
    const response = await apiClient.post('/learners/me/applications', applicationData);
    return response.data;
  },

  /**
   * Updates application progression status
   */
  async updateCareerApplication(applicationId, updateData) {
    const response = await apiClient.patch(`/learners/me/applications/${applicationId}`, updateData);
    return response.data;
  },

  /**
   * Lists practical project implementations
   */
  async listProjects() {
    const response = await apiClient.get('/learners/me/projects');
    return response.data;
  },

  /**
   * Logs a portfolio project implementation
   */
  async createProject(projectData) {
    const response = await apiClient.post('/learners/me/projects', projectData);
    return response.data;
  },

  /**
   * Freezes point-in-time historical feature snapshot at cutoff T
   */
  async createFeatureSnapshot(snapshotData = {}) {
    const response = await apiClient.post('/learners/me/feature-snapshots', snapshotData);
    return response.data;
  },

  /**
   * Exports leakage-free supervised training dataset (Admin / Staff only)
   */
  async exportMLDataset(params = {}) {
    const response = await apiClient.get('/ml/dataset', { params });
    return response.data;
  },

  /**
   * Institutional staff/admin outcome verification
   */
  async verifyOutcome(outcomeId, verifyData) {
    const response = await apiClient.patch(`/learners/outcomes/${outcomeId}/verify`, verifyData);
    return response.data;
  },
};
