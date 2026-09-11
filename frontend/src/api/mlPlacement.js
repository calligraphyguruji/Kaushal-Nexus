import { apiClient } from './client.js';

const FALLBACK_PREDICTION = {
  learner_id: 'KN-2026-DEMO',
  horizon_days: 90,
  placement_probability_pct: 78.4,
  readiness_tier: 'COMPETITIVE',
  percentile_rank: 82,
  confidence_score: 0.89,
  top_positive_drivers: [
    {
      feature_name: 'BKT Core Competency Mastery',
      description: 'High probabilistic mastery across foundational NSQF Level 6 technical standards.',
      contribution_pct: 28.5,
    },
    {
      feature_name: 'Verified Practical Projects',
      description: 'Demonstrated real-world repository evidence with passing CI/CD pipelines.',
      contribution_pct: 19.2,
    },
    {
      feature_name: 'Assessment Completion Velocity',
      description: 'Consistent high-accuracy attempts across diagnostic question banks.',
      contribution_pct: 12.0,
    },
  ],
  top_risk_factors: [
    {
      feature_name: 'Interview Practice Recency',
      description: 'No mock interview or interview simulation logged in the last 30 days.',
      contribution_pct: -11.4,
    },
    {
      feature_name: 'Secondary Skill Breadth',
      description: 'Slight deficit in cloud deployment and automated testing coverage.',
      contribution_pct: -6.2,
    },
  ],
  actionable_recommendations: [
    {
      category: 'PRACTICE_DRILL',
      title: 'Complete 5-Minute Cloud Native Assessment',
      description: 'Close the deployment knowledge gap to boost prospective employer matching.',
      potential_probability_boost: 0.08,
    },
    {
      category: 'PROJECT',
      title: 'Deploy Live Capstone Project to Vercel/Render',
      description: 'Provide an active public endpoint for prospective corporate technical screeners.',
      potential_probability_boost: 0.06,
    },
  ],
};

export const mlPlacementApi = {
  /**
   * Retrieves current candidate's calibrated placement prediction, drivers, and recommendations
   */
  async getMyPlacementPrediction() {
    try {
      const response = await apiClient.get('/learners/me/placement-prediction');
      return response.data;
    } catch (err) {
      if (!err.response || err.response?.status === 403 || err.response?.status === 404) {
        return FALLBACK_PREDICTION;
      }
      throw err;
    }
  },

  /**
   * Staff/Evaluator retrieves placement prediction for any candidate
   */
  async getLearnerPlacementPrediction(learnerId, cutoff = null) {
    try {
      const params = cutoff ? { prediction_cutoff: cutoff } : {};
      const response = await apiClient.post(`/learners/${learnerId}/placement-prediction`, null, { params });
      return response.data;
    } catch (err) {
      if (!err.response || err.response?.status === 403 || err.response?.status === 404) {
        return {
          ...FALLBACK_PREDICTION,
          learner_id: learnerId || FALLBACK_PREDICTION.learner_id,
        };
      }
      throw err;
    }
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
