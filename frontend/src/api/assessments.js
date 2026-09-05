import { apiClient } from './client.js';
import { getDomainQuestions, simulateBKTUpdate, QUESTION_BANK } from '../data/assessmentQuestionBank.js';
import { saveLearnerAssessmentResults } from '../utils/skillGapEvaluator.js';

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
            id: 'assess-fs-dev-01',
            code: 'ASSESS-FS-DEV-01',
            title: 'Full-Stack Software Engineering Diagnostic',
            description: 'Comprehensive diagnostic evaluating Python Basics, OOP, SQL, Git, DSA, and REST APIs.',
            sector: 'IT-ITeS',
            duration_minutes: 25,
            total_questions: 10,
            is_active: true,
          },
          {
            id: 'assess-python-02',
            code: 'ASSESS-PY-ENG-02',
            title: 'Python & Data Engineering Diagnostic',
            description: 'Assesses Python Core, OOP Architecture, Asynchronous Microservices, and Celery.',
            sector: 'IT-ITeS',
            duration_minutes: 25,
            total_questions: 10,
            is_active: true,
          },
          {
            id: 'assess-powerbi-03',
            code: 'ASSESS-DAX-BI-03',
            title: 'Data Analytics & Power BI Diagnostic',
            description: 'Evaluates DAX, Dimensional Modeling, SQL Analytics, and Reporting KPIs.',
            sector: 'Analytics & BFSI',
            duration_minutes: 25,
            total_questions: 10,
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
        const domainKey = String(assessmentId).includes('python')
          ? 'python'
          : String(assessmentId).includes('powerbi') || String(assessmentId).includes('dax')
          ? 'data'
          : 'fullstack';

        const questions = getDomainQuestions(domainKey, 10).map((q) => ({
          id: q.id,
          skill_name: q.skill_name,
          competency_code: q.competency_code,
          question_text: q.question_text,
          options: q.options,
          difficulty: q.difficulty,
        }));

        return {
          id: assessmentId,
          code: `ASSESS-${domainKey.toUpperCase()}-01`,
          title: `${domainKey === 'python' ? 'Python & Data Engineering' : domainKey === 'data' ? 'Data Analytics & Power BI' : 'Full-Stack Software Engineering'} Diagnostic`,
          sector: domainKey === 'data' ? 'Analytics & BFSI' : 'IT-ITeS',
          duration_minutes: 25,
          total_questions: questions.length,
          questions,
        };
      }
      throw err;
    }
  },

  /**
   * Generates a role-specific MCQ assessment from the question bank.
   * Questions are selected based on the role's required competencies.
   * @param {string} roleId - UUID or key of the target aspiring role
   * @returns {Object} AssessmentDetailResponseDTO with questions (no answers)
   */
  async generateForRole(roleId) {
    try {
      const response = await apiClient.post(`/assessments/generate-for-role/${roleId}`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        const idLower = String(roleId || '').toLowerCase();
        let domainKey = 'fullstack';
        if (idLower.includes('python') || idLower.includes('data-eng')) domainKey = 'python';
        else if (idLower.includes('analytic') || idLower.includes('powerbi') || idLower.includes('data')) domainKey = 'data';
        else if (idLower.includes('cnc') || idLower.includes('manufactur')) domainKey = 'manufacturing';
        else if (idLower.includes('market') || idLower.includes('digital')) domainKey = 'digital';
        else if (idLower.includes('cad') || idLower.includes('bim')) domainKey = 'cad';

        const questions = getDomainQuestions(domainKey, 10).map((q) => ({
          id: q.id,
          skill_name: q.skill_name,
          competency_code: q.competency_code,
          question_text: q.question_text,
          options: q.options,
          difficulty: q.difficulty,
        }));

        return {
          id: `role-gen-${domainKey}-${Date.now()}`,
          code: `ASSESS-ROLE-${domainKey.toUpperCase()}`,
          title: `Role Diagnostic: ${domainKey.charAt(0).toUpperCase() + domainKey.slice(1)} Competencies`,
          sector: 'National Occupational Standard',
          duration_minutes: 25,
          total_questions: questions.length,
          questions,
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
    const candidateMeta = {
      id: payload.learner_id,
      ...(payload.learner_info || payload.learnerInfo || {}),
    };
    try {
      const response = await apiClient.post(`/assessments/${assessmentId}/submit`, payload);
      try {
        saveLearnerAssessmentResults(response.data, assessmentId, candidateMeta);
      } catch {
        // Ignore sync errors
      }
      return response.data;
    } catch (err) {
      if (!err.response) {
        // Collect all questions across banks for lookup
        const allQuestions = Object.values(QUESTION_BANK).flat();
        const answersMap = (payload.answers || []).reduce((acc, a) => {
          acc[a.question_id] = a.selected_answer;
          return acc;
        }, {});

        // Match questions that were in the test
        const testQuestions = allQuestions.filter((q) => answersMap[q.id] !== undefined);
        const result = simulateBKTUpdate(
          testQuestions.length > 0 ? testQuestions : getDomainQuestions('fullstack', payload.answers?.length || 10),
          answersMap
        );

        // Store result and derive actionable skill gaps for matrix
        const enrichedResult = saveLearnerAssessmentResults(result, assessmentId, candidateMeta);

        return enrichedResult;
      }
      throw err;
    }
  },

  /**
   * Submits a single question answer for instant interactive feedback
   * @param {Object} payload - { learner_id, question_id, selected_answer }
   */
  async quickAttempt(payload) {
    try {
      const response = await apiClient.post('/assessments/quick-attempt', payload);
      return response.data;
    } catch (err) {
      if (!err.response) {
        const allQuestions = Object.values(QUESTION_BANK).flat();
        const q = allQuestions.find((item) => item.id === payload.question_id);
        const isCorrect = q ? q.correct_answer === payload.selected_answer : true;
        return {
          question_id: payload.question_id,
          is_correct: isCorrect,
          correct_answer: q ? q.correct_answer : payload.selected_answer,
          explanation: q ? q.explanation : 'Good attempt on technical standard item.',
          prior_mastery: 0.35,
          posterior_mastery: isCorrect ? 0.65 : 0.25,
        };
      }
      throw err;
    }
  },
};

// Backward-compatible aliases used by LearnerPipelineWizard
assessmentsApi.listAssessments = assessmentsApi.list;
assessmentsApi.getAssessmentById = assessmentsApi.getById;
assessmentsApi.submitAssessment = assessmentsApi.submit;

