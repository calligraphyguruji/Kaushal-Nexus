import { apiClient } from './client';

/**
 * Phase 7: Impact Intelligence, Optimization & Production Scale Client APIs.
 */

// Learner Self-Service APIs
export const getMyImpact = async () => {
  const response = await apiClient.get('/learners/me/impact');
  return response.data;
};

export const getMyEarlyWarnings = async () => {
  const response = await apiClient.get('/learners/me/early-warnings');
  return response.data;
};

export const getMyInterventions = async (status = null) => {
  const params = status ? { status } : {};
  const response = await apiClient.get('/learners/me/interventions', { params });
  return response.data;
};

export const updateMyInterventionStatus = async (interventionId, data) => {
  const response = await apiClient.post(`/learners/me/interventions/${interventionId}/status`, data);
  return response.data;
};

// Staff Candidate Evaluation API
export const getLearnerImpact = async (learnerId) => {
  const response = await apiClient.get(`/learners/${learnerId}/impact`);
  return response.data;
};

// Institutional & Program-Wide Impact APIs
export const getProgramImpactScorecard = async () => {
  const response = await apiClient.get('/ml/impact/program');
  return response.data;
};

export const getCohortImpactAnalytics = async (dimension = 'INSTITUTION', value = null) => {
  const params = { dimension };
  if (value) params.value = value;
  const response = await apiClient.get('/ml/impact/cohort', { params });
  return response.data;
};

export const getSkillBottlenecksAndCurriculum = async (limit = 10) => {
  const response = await apiClient.get('/ml/impact/skills', { params: { limit } });
  return response.data;
};

export const getInterventionEffectiveness = async () => {
  const response = await apiClient.get('/ml/impact/interventions');
  return response.data;
};

export const getCareerFunnel = async () => {
  const response = await apiClient.get('/ml/impact/funnel');
  return response.data;
};

export const getLearningResourcesAnalysis = async (limit = 20) => {
  const response = await apiClient.get('/ml/impact/resources', { params: { limit } });
  return response.data;
};

export const getImpactDataQuality = async () => {
  const response = await apiClient.get('/ml/impact/data-quality');
  return response.data;
};
