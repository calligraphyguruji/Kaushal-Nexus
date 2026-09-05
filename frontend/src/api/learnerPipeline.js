import { apiClient } from './client.js';
import { computeRoleMatchesFromLearner, getActiveLearnerGaps } from '../utils/skillGapEvaluator.js';
import { upsertCandidateInRegistry } from '../utils/candidateRegistry.js';

const DEMO_ROLES = [
  {
    id: 'role-fullstack',
    name: 'Full-Stack Web Developer',
    sector: 'Information Technology & Software',
    description: 'Designs, builds, and maintains web applications using modern frontend and backend architectures.',
    benchmark_score: 75.0,
    nsqf_level: 'Level 6',
  },
  {
    id: 'role-python',
    name: 'Applied Python & Automation Specialist',
    sector: 'IT-ITeS & Scripting',
    description: 'Automates pipelines, writes test suites, and implements microservices using Python.',
    benchmark_score: 70.0,
    nsqf_level: 'Level 5',
  },
  {
    id: 'role-data',
    name: 'Data Analytics & SQL Engineer',
    sector: 'Analytics & Business Intelligence',
    description: 'Builds SQL transformations, executes EDA, and drives data-backed decision pipelines.',
    benchmark_score: 72.0,
    nsqf_level: 'Level 6',
  },
  {
    id: 'role-manufacturing',
    name: 'Smart Manufacturing & CNC Specialist',
    sector: 'Automotive & Capital Goods',
    description: 'Operates CNC machinery, programs G-code, and adheres to Industry 4.0 safety protocols.',
    benchmark_score: 68.0,
    nsqf_level: 'Level 5',
  },
  {
    id: 'role-digital',
    name: 'Digital Marketing & Growth Specialist',
    sector: 'Media & Digital Services',
    description: 'Executes SEO, SEM campaigns, conversion funnel optimization, and Google Analytics tracking.',
    benchmark_score: 65.0,
    nsqf_level: 'Level 4',
  },
  {
    id: 'role-cad',
    name: 'CAD & Mechanical Design Engineer',
    sector: 'Mechanical & Civil Engineering',
    description: 'Creates parametric 3D CAD models, assembly drawings, and GD&T documentation.',
    benchmark_score: 70.0,
    nsqf_level: 'Level 5',
  },
];

export const learnerPipelineApi = {
  /**
   * Retrieves current authenticated learner profile
   */
  async getMyProfile() {
    try {
      const response = await apiClient.get('/learners/me/profile');
      return response.data;
    } catch (err) {
      if (!err.response) {
        try {
          const stored = JSON.parse(localStorage.getItem('kn_current_learner') || '{}');
          if (stored.full_name) return stored;
        } catch {
          // Ignore parse errors
        }
        try {
          const u = JSON.parse(localStorage.getItem('kn_user') || '{}');
          if (u.full_name) {
            return {
              id: u.id || 'KN-2026-9812',
              full_name: u.full_name,
              phone: '9876543210',
              education_level: 'B.Tech Computer Science',
              institution: 'National Institute of Technology',
              graduation_year: 2026,
              experience_years: 0.0,
              bio: 'Passionate engineering learner focused on software and system architectures.',
              github_url: '',
              linkedin_url: '',
              aspiring_role_id: 'role-fullstack',
              readiness_score: 82,
              total_skills_assessed: 6,
            };
          }
        } catch {
          // Ignore parse errors
        }
        return {
          id: 'KN-2026-9812',
          full_name: 'Rahul Sharma',
          phone: '9876543210',
          education_level: 'B.Tech Computer Science',
          institution: 'National Institute of Technology',
          graduation_year: 2026,
          experience_years: 0.0,
          bio: 'Passionate full-stack developer dedicated to scalable web and AI systems.',
          github_url: 'https://github.com/rahul-sharma',
          linkedin_url: 'https://linkedin.com/in/rahul-sharma',
          aspiring_role_id: 'role-fullstack',
          readiness_score: 84,
          total_skills_assessed: 6,
        };
      }
      throw err;
    }
  },

  /**
   * Updates current authenticated learner profile
   */
  async updateMyProfile(profileData) {
    try {
      const response = await apiClient.put('/learners/me/profile', profileData);
      try {
        upsertCandidateInRegistry(response.data);
      } catch {}
      return response.data;
    } catch (err) {
      if (!err.response) {
        let existing = {};
        try {
          existing = JSON.parse(localStorage.getItem('kn_current_learner') || '{}');
        } catch {
          // Ignore parse errors
        }
        const updated = {
          ...existing,
          ...profileData,
          id: existing.id || 'KN-2026-9812',
          full_name: profileData.full_name || existing.full_name || 'Candidate Learner',
          updated_at: new Date().toISOString(),
        };
        try {
          localStorage.setItem('kn_current_learner', JSON.stringify(updated));
          upsertCandidateInRegistry(updated);
          const u = JSON.parse(localStorage.getItem('kn_user') || '{}');
          if (u.email && updated.full_name) {
            u.full_name = updated.full_name;
            localStorage.setItem('kn_user', JSON.stringify(u));
          }
        } catch {
          // Ignore storage errors
        }
        return updated;
      }
      throw err;
    }
  },

  /**
   * Uploads candidate resume file (PDF/DOCX) for skill and project extraction
   */
  async uploadResume(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/learners/me/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (err) {
      if (!err.response) {
        const resumeData = {
          id: 'res-' + Date.now(),
          filename: file?.name || 'Candidate_Resume.pdf',
          uploaded_at: new Date().toISOString(),
          parsed_skills: [
            { name: 'JavaScript / React.js', confidence: 0.95 },
            { name: 'Python & FastAPIs', confidence: 0.91 },
            { name: 'SQL Schema & Queries', confidence: 0.88 },
            { name: 'Git & Version Control', confidence: 0.94 },
            { name: 'Containerization / Docker', confidence: 0.82 },
          ],
          parsed_projects: [
            {
              title: 'Telemetry Analytics Dashboard',
              description: 'Real-time telemetry and candidate tracking application built with React.',
              technologies: 'React, Tailwind CSS, Recharts',
              github_url: 'https://github.com/example/telemetry-analytics',
            },
          ],
        };
        try {
          localStorage.setItem('kn_resume', JSON.stringify(resumeData));
        } catch {
          // Ignore storage error
        }
        return resumeData;
      }
      throw err;
    }
  },

  /**
   * Retrieves active parsed resume with candidate skills and projects
   */
  async getMyResume() {
    try {
      const response = await apiClient.get('/learners/me/resume');
      return response.data;
    } catch (err) {
      if (!err.response) {
        try {
          const stored = JSON.parse(localStorage.getItem('kn_resume') || '{}');
          if (stored.filename) return stored;
        } catch {
          // Ignore parse errors
        }
        return {
          id: 'res-demo-default',
          filename: 'Rahul_Sharma_Resume.pdf',
          uploaded_at: new Date().toISOString(),
          parsed_skills: [
            { name: 'JavaScript / React.js', confidence: 0.95 },
            { name: 'Python & FastAPIs', confidence: 0.91 },
            { name: 'SQL Schema & Queries', confidence: 0.88 },
            { name: 'Git & Version Control', confidence: 0.94 },
          ],
          parsed_projects: [
            {
              title: 'Kaushal Intelligence Portal',
              description: 'AI-driven skilling dashboard with NSQF-aligned competency tracking.',
              technologies: 'React, Tailwind CSS, FastAPI',
              github_url: 'https://github.com/example/kaushal-portal',
            },
          ],
        };
      }
      throw err;
    }
  },

  /**
   * Deletes active resume
   */
  async deleteMyResume() {
    try {
      const response = await apiClient.delete('/learners/me/resume');
      return response.data;
    } catch (err) {
      if (!err.response) {
        try {
          localStorage.removeItem('kn_resume');
        } catch {
          // Ignore
        }
        return { success: true };
      }
      throw err;
    }
  },

  /**
   * Lists available target roles and occupation standards
   */
  async listRoles() {
    try {
      const response = await apiClient.get('/roles');
      return response.data;
    } catch (err) {
      if (!err.response) {
        return DEMO_ROLES;
      }
      throw err;
    }
  },

  /**
   * Retrieves role details with competency requirements
   */
  async getRoleById(roleId) {
    try {
      const response = await apiClient.get(`/roles/${roleId}`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        const found = DEMO_ROLES.find((r) => r.id === roleId);
        return found || DEMO_ROLES[0];
      }
      throw err;
    }
  },

  /**
   * Retrieves candidate's current target aspiring role
   */
  async getMyAspiringRole() {
    try {
      const response = await apiClient.get('/learners/me/aspiring-role');
      return response.data;
    } catch (err) {
      if (!err.response) {
        let roleId = 'role-fullstack';
        try {
          const stored = JSON.parse(localStorage.getItem('kn_current_learner') || '{}');
          if (stored.aspiring_role_id) roleId = stored.aspiring_role_id;
        } catch {
          // Ignore
        }
        const found = DEMO_ROLES.find((r) => r.id === roleId) || DEMO_ROLES[0];
        return { role_id: roleId, role: found };
      }
      throw err;
    }
  },

  /**
   * Sets or updates candidate's aspiring role
   */
  async setMyAspiringRole(roleId) {
    try {
      const response = await apiClient.put('/learners/me/aspiring-role', { role_id: roleId });
      return response.data;
    } catch (err) {
      if (!err.response) {
        try {
          const stored = JSON.parse(localStorage.getItem('kn_current_learner') || '{}');
          stored.aspiring_role_id = roleId;
          localStorage.setItem('kn_current_learner', JSON.stringify(stored));
        } catch {
          // Ignore
        }
        return { success: true, aspiring_role_id: roleId };
      }
      throw err;
    }
  },

  /**
   * Calculates real-time BKT role matches and gap diagnostics
   */
  async getMyRoleMatches() {
    try {
      const response = await apiClient.get('/learners/me/role-matches');
      return response.data;
    } catch (err) {
      if (!err.response) {
        let stored = null;
        try {
          stored = JSON.parse(localStorage.getItem('kn_current_learner') || '{}');
        } catch {
          // Ignore
        }
        const targetRoleId = stored?.aspiring_role_id || 'role-fullstack';
        return computeRoleMatchesFromLearner(stored, targetRoleId, DEMO_ROLES);
      }
      throw err;
    }
  },

  /**
   * Retrieves BKT skill masteries for authenticated learner
   */
  async getMySkills() {
    try {
      const response = await apiClient.get('/learners/me/skills');
      return response.data;
    } catch (err) {
      if (!err.response) {
        let stored = null;
        try {
          stored = JSON.parse(localStorage.getItem('kn_current_learner') || '{}');
        } catch {
          // Ignore
        }
        if (stored && Array.isArray(stored.skills) && stored.skills.length > 0) {
          return stored.skills.map((s, idx) => ({
            id: s.skill_id || `sk-${idx + 1}`,
            name: s.skill || s.name,
            mastery: typeof s.mastery_probability === 'number' ? s.mastery_probability : 0.75,
            nsqf_level: s.nsqf_level || 'Level 6',
            status: s.status || (s.mastery_probability >= 0.75 ? 'Mastered' : 'Needs Improvement'),
          }));
        }
        return [
          { id: 'sk-1', name: 'Frontend Architecture & DOM', mastery: 0.88, nsqf_level: 'Level 6', status: 'Mastered' },
          { id: 'sk-2', name: 'Asynchronous State & APIs', mastery: 0.82, nsqf_level: 'Level 6', status: 'Proficient' },
          { id: 'sk-3', name: 'SQL Schema & Queries', mastery: 0.76, nsqf_level: 'Level 5', status: 'Proficient' },
          { id: 'sk-4', name: 'Git & Collaboration Workflow', mastery: 0.90, nsqf_level: 'Level 5', status: 'Mastered' },
          { id: 'sk-5', name: 'CI/CD & Containerization', mastery: 0.58, nsqf_level: 'Level 6', status: 'Needs Improvement' },
        ];
      }
      throw err;
    }
  },

  /**
   * Analyzes skill deficits against target role
   */
  async getMySkillGaps(roleId = null) {
    try {
      const params = roleId ? { role_id: roleId } : {};
      const response = await apiClient.get('/learners/me/skill-gaps', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        const activeGaps = getActiveLearnerGaps();
        if (activeGaps.length > 0) {
          return activeGaps.map((g) => ({
            skill_name: g.competency_name || g.name,
            current_mastery: typeof g.workforce_supply_pct === 'number' ? g.workforce_supply_pct / 100 : 0.40,
            required_mastery: typeof g.employer_demand_pct === 'number' ? g.employer_demand_pct / 100 : 0.85,
            gap: typeof g.deficit_pct === 'number' ? g.deficit_pct / 100 : 0.45,
            priority: (g.severity || 'HIGH').toUpperCase(),
          }));
        }
        return [
          { skill_name: 'CI/CD & Containerization', current_mastery: 0.58, required_mastery: 0.80, gap: 0.22, priority: 'HIGH' },
          { skill_name: 'SQL Schema & Queries', current_mastery: 0.76, required_mastery: 0.85, gap: 0.09, priority: 'MEDIUM' },
        ];
      }
      throw err;
    }
  },

  /**
   * Generates leakage-free ML tabular feature vector for XGBoost models
   */
  async getMyBktFeatures() {
    try {
      const response = await apiClient.get('/learners/me/bkt-features');
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          learner_id: 'KN-2026-9812',
          bkt_mean_mastery: 0.788,
          bkt_min_mastery: 0.58,
          bkt_max_mastery: 0.90,
          skills_assessed_count: 5,
          has_github: 1.0,
          has_linkedin: 1.0,
          experience_years: 0.0,
          predicted_readiness_score: 84.2,
        };
      }
      throw err;
    }
  },

  /**
   * Records candidate ground-truth outcome
   */
  async recordOutcome(outcomeData) {
    try {
      const response = await apiClient.post('/learners/me/outcomes', outcomeData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          id: 'out-' + Date.now(),
          ...outcomeData,
          recorded_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  /**
   * Lists candidate ground-truth career outcomes
   */
  async getMyOutcomes() {
    try {
      const response = await apiClient.get('/learners/me/outcomes');
      return response.data;
    } catch (err) {
      if (!err.response) {
        return [];
      }
      throw err;
    }
  },

  // ============================================================================
  // Phase 3: Adaptive Learning & Remediation Loop APIs
  // ============================================================================

  /**
   * Retrieves candidate's active personalized remedial learning plan
   */
  async getMyLearningPlan() {
    try {
      const response = await apiClient.get('/learners/me/learning-plan');
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          id: 'plan-demo-01',
          learner_id: 'KN-2026-9812',
          status: 'ACTIVE',
          modules: [
            {
              id: 'mod-1',
              title: 'Docker Multi-Stage Builds & Containerization',
              competency_code: 'COMP-NOS-FS-05',
              duration_hours: 12,
              status: 'IN_PROGRESS',
              mastery_delta: 0.18,
            },
            {
              id: 'mod-2',
              title: 'Advanced SQL Query Optimization & Indexing',
              competency_code: 'COMP-NOS-FS-03',
              duration_hours: 8,
              status: 'ASSIGNED',
              mastery_delta: 0.12,
            },
          ],
        };
      }
      throw err;
    }
  },

  /**
   * Generates or regenerates learning plan based on current BKT skill gaps
   */
  async generateLearningPlan(forceRegenerate = false) {
    try {
      const response = await apiClient.post('/learners/me/learning-plan/generate', null, {
        params: { force_regenerate: forceRegenerate },
      });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return this.getMyLearningPlan();
      }
      throw err;
    }
  },

  /**
   * Retrieves specific module detail with resources and prerequisites
   */
  async getLearningPlanModule(moduleId) {
    try {
      const response = await apiClient.get(`/learners/me/learning-plan/${moduleId}`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          id: moduleId,
          title: 'Targeted Remedial Module',
          description: 'Interactive exercises and conceptual lab assignments.',
          resources: [
            { title: 'Official Documentation & Standards Guide', url: 'https://docs.docker.com/' },
          ],
        };
      }
      throw err;
    }
  },

  /**
   * Fetches targeted practice and reassessment questions for a competency
   */
  async getPracticeQuestions(competencyId) {
    try {
      const response = await apiClient.get(`/learners/me/practice/${competencyId}`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          competency_id: competencyId,
          questions: [
            {
              id: 'p-q1',
              question_text: 'Which Dockerfile instruction creates a lightweight production layer from a previous build stage?',
              options: ['COPY --from=builder', 'EXTRACT --stage=build', 'MERGE --stage=build', 'IMPORT --builder'],
              correct_answer: 'COPY --from=builder',
              explanation: 'Multi-stage builds use COPY --from=<stage> to pull only the build artifacts.',
            },
          ],
        };
      }
      throw err;
    }
  },

  /**
   * Submits practice answers, updates BKT, and returns adaptive intervention decisions
   */
  async submitPractice(competencyId, submissionData) {
    try {
      const response = await apiClient.post(
        `/learners/me/practice/${competencyId}/submit`,
        submissionData
      );
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          competency_id: competencyId,
          score_percentage: 100,
          bkt_mastery_prior: 0.58,
          bkt_mastery_posterior: 0.82,
          mastery_achieved: true,
          next_recommended_action: 'ADVANCE_TO_NEXT_MODULE',
        };
      }
      throw err;
    }
  },

  /**
   * Logs candidate educational activity (reading docs, watching video)
   * RULE: Does NOT directly alter BKT mastery
   */
  async recordLearningActivity(activityData) {
    try {
      const response = await apiClient.post('/learners/me/learning-activity', activityData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          id: 'act-' + Date.now(),
          ...activityData,
          logged_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  /**
   * Retrieves candidate activity log
   */
  async getLearningActivities(limit = 50) {
    try {
      const response = await apiClient.get('/learners/me/learning-activity', {
        params: { limit },
      });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Gets overall remediation progress and milestone summary
   */
  async getLearningProgress() {
    try {
      const response = await apiClient.get('/learners/me/learning-progress');
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          modules_completed: 2,
          total_modules: 4,
          percent_complete: 50,
          average_mastery_gain: 0.15,
        };
      }
      throw err;
    }
  },

  // ============================================================================
  // Phase 4: Career Outcome Tracking & ML Dataset Foundation APIs
  // ============================================================================

  /**
   * Retrieves comprehensive candidate career journey overview
   */
  async getCareerJourneyOverview() {
    try {
      const response = await apiClient.get('/learners/me/career-journey');
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          events_count: 4,
          applications_count: 2,
          projects_count: 1,
          latest_status: 'PIPELINE_INTERVIEWING',
        };
      }
      throw err;
    }
  },

  /**
   * Lists chronological career events
   */
  async listCareerEvents(params = {}) {
    try {
      const response = await apiClient.get('/learners/me/career-events', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return [
          {
            id: 'ev-1',
            event_type: 'ASSESSMENT_COMPLETED',
            title: 'Diagnostic Assessment Completed',
            description: 'Achieved 88% overall on NSQF Level 6 Full-Stack diagnostic.',
            event_date: new Date().toISOString(),
          },
        ];
      }
      throw err;
    }
  },

  /**
   * Records a timestamped career journey event
   */
  async recordCareerEvent(eventData) {
    try {
      const response = await apiClient.post('/learners/me/career-events', eventData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          id: 'ev-' + Date.now(),
          ...eventData,
          created_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  /**
   * Lists candidate job/internship applications
   */
  async listCareerApplications(status = null) {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/learners/me/applications', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Creates a job/internship application
   */
  async createCareerApplication(applicationData) {
    try {
      const response = await apiClient.post('/learners/me/applications', applicationData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          id: 'app-' + Date.now(),
          ...applicationData,
          status: 'APPLIED',
          applied_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  /**
   * Updates application progression status
   */
  async updateCareerApplication(applicationId, updateData) {
    try {
      const response = await apiClient.patch(`/learners/me/applications/${applicationId}`, updateData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          id: applicationId,
          ...updateData,
          updated_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  /**
   * Lists practical project implementations
   */
  async listProjects() {
    try {
      const response = await apiClient.get('/learners/me/projects');
      return response.data;
    } catch (err) {
      if (!err.response) {
        try {
          const stored = JSON.parse(localStorage.getItem('kn_projects') || '[]');
          if (Array.isArray(stored) && stored.length > 0) return stored;
        } catch {
          // Ignore
        }
        return [
          {
            id: 'proj-1',
            title: 'Telemetry Analytics Dashboard',
            description: 'Real-time telemetry and candidate tracking application built with React.',
            technologies: 'React, Tailwind CSS, Recharts',
            github_url: 'https://github.com/example/telemetry-analytics',
          },
        ];
      }
      throw err;
    }
  },

  /**
   * Logs a portfolio project implementation
   */
  async createProject(projectData) {
    try {
      const response = await apiClient.post('/learners/me/projects', projectData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        const newProj = {
          id: 'proj-' + Date.now(),
          ...projectData,
          created_at: new Date().toISOString(),
        };
        try {
          const existing = JSON.parse(localStorage.getItem('kn_projects') || '[]');
          existing.push(newProj);
          localStorage.setItem('kn_projects', JSON.stringify(existing));
        } catch {
          // Ignore
        }
        return newProj;
      }
      throw err;
    }
  },

  /**
   * Freezes point-in-time historical feature snapshot at cutoff T
   */
  async createFeatureSnapshot(snapshotData = {}) {
    try {
      const response = await apiClient.post('/learners/me/feature-snapshots', snapshotData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          snapshot_id: 'snap-' + Date.now(),
          created_at: new Date().toISOString(),
          ...snapshotData,
        };
      }
      throw err;
    }
  },

  /**
   * Exports leakage-free supervised training dataset (Admin / Staff only)
   */
  async exportMLDataset(params = {}) {
    try {
      const response = await apiClient.get('/ml/dataset', { params });
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          features_count: 8,
          samples_count: 120,
          dataset_exported_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  /**
   * Institutional staff/admin outcome verification
   */
  async verifyOutcome(outcomeId, verifyData) {
    try {
      const response = await apiClient.patch(`/learners/outcomes/${outcomeId}/verify`, verifyData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return {
          outcome_id: outcomeId,
          verified: true,
          verified_at: new Date().toISOString(),
          ...verifyData,
        };
      }
      throw err;
    }
  },
};
