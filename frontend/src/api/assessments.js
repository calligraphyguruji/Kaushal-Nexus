import { apiClient } from './client.js';

export const assessmentsApi = {
  /**
   * Lists available diagnostic assessments
   * @param {Object} params - { sector }
   */
  async list(params = {}) {
    try {
      const response = await apiClient.get('/assessments', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return [
          {
            id: 'demo-assess-1',
            code: 'ASSESS-FS-DEV-01',
            title: 'Full-Stack Software Engineering Diagnostic',
            description: 'Comprehensive diagnostic evaluating Python Basics, OOP, SQL, Git, DSA, and REST APIs.',
            sector: 'IT-ITeS',
            duration_minutes: 35,
            total_questions: 12,
            is_active: true,
          },
        ];
      }
      throw err;
    }
  },

  /**
   * Gets single assessment with questions (no correct answers in payload)
   * @param {string} assessmentId
   */
  async getById(assessmentId) {
    try {
      const response = await apiClient.get(`/assessments/${assessmentId}`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          id: assessmentId,
          code: 'ASSESS-FS-DEV-01',
          title: 'Full-Stack Software Engineering Diagnostic',
          sector: 'IT-ITeS',
          duration_minutes: 35,
          questions: [
            {
              id: 'q1',
              skill_id: 's1',
              skill_name: 'Python Basics',
              question_text: "What will type([]) return in Python 3?",
              options: ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'dict'>"],
              difficulty: 'EASY',
            },
            {
              id: 'q2',
              skill_id: 's2',
              skill_name: 'Python OOP',
              question_text: 'What is inheritance in Python?',
              options: [
                'Mechanism allowing a child class to inherit attributes and methods from a parent class',
                'A technique to declare global variables shared across all threads',
                'A way to serialize classes into JSON strings',
                'Direct low-level memory allocation in the Python heap',
              ],
              difficulty: 'EASY',
            },
            {
              id: 'q3',
              skill_id: 's3',
              skill_name: 'SQL',
              question_text: 'Which SQL clause is used to filter aggregated grouped records after a GROUP BY statement?',
              options: ['HAVING', 'WHERE', 'FILTER', 'LIMIT'],
              difficulty: 'EASY',
            },
          ],
        };
      }
      throw err;
    }
  },

  /**
   * Submits batch answers for assessment and triggers sequential BKT updates
   * @param {string} assessmentId
   * @param {Object} payload - { learner_id, answers: [{ question_id, selected_answer }] }
   */
  async submit(assessmentId, payload) {
    const response = await apiClient.post(`/assessments/${assessmentId}/submit`, payload);
    return response.data;
  },

  /**
   * Submits a single question answer for instant interactive feedback
   * @param {Object} payload - { learner_id, question_id, selected_answer }
   */
  async quickAttempt(payload) {
    const response = await apiClient.post('/assessments/quick-attempt', payload);
    return response.data;
  },
};
