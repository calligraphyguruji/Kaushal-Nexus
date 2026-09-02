import { apiClient } from './client';

export const aiApi = {
  /**
   * Generates AI Skill Gap Analysis & Personalized Learning Roadmap using Google Gemini AI
   * @param {Object} payload - {
   *   learner_id,
   *   full_name,
   *   target_occupation,
   *   current_skills,
   *   completed_courses,
   *   education_level,
   *   nsqf_level,
   *   district_name,
   *   employment_readiness_score,
   *   overall_progress,
   *   existing_gaps
   * }
   */
  async analyzeSkillGap(payload) {
    try {
      const response = await apiClient.post('/ai/skill-gap-analysis', payload);
      return response.data;
    } catch (err) {
      if (!err.response) {
        // High-fidelity fallback if backend is offline
        const name = payload.full_name || 'Candidate';
        const role = payload.target_occupation || 'Full Stack Web Developer';
        const score = payload.employment_readiness_score || 82;
        const skills = payload.current_skills || [];
        const strengths = skills
          .filter((s) => (s.score_percentage || 0) >= 80)
          .map((s) => s.name);

        return {
          learner_id: payload.learner_id || 'KN-DEMO-001',
          full_name: name,
          target_occupation: role,
          summary: `Candidate ${name} demonstrates verified competencies in ${
            strengths.length > 0 ? strengths.join(', ') : 'Vocational Core Skills'
          }. To strengthen technical alignment for '${role}', targeted remediation in containerization and automated testing is recommended.`,
          strengths:
            strengths.length > 0
              ? strengths
              : ['Component Architecture', 'Modern JavaScript / Python', 'Database Query Design'],
          skill_gaps: [
            {
              skill: 'Cloud Deployment & Containerization (Docker)',
              priority: 'Critical',
              reason:
                'Containerization and cloud deployment are core technical requirements for modern software engineering roles.',
              suggested_action:
                'Complete practical containerization exercises and build multi-stage Docker deployment configurations.',
            },
            {
              skill: 'Automated Test Coverage & CI/CD Pipelines',
              priority: 'High',
              reason:
                'Automated testing and continuous validation ensure software reliability in production environments.',
              suggested_action:
                'Implement comprehensive unit and integration test suites on portfolio projects.',
            },
            {
              skill: 'API Security & OAuth2 Token Lifecycle',
              priority: 'Moderate',
              reason:
                'Enterprise applications mandate secure authentication, refresh token rotation, and RBAC authorization.',
              suggested_action:
                'Implement JWT refresh token rotation and security middleware in a capstone service.',
            },
          ],
          priority_skill_gaps: [
            'Cloud Deployment & Containerization (Docker)',
            'Automated Test Coverage & CI/CD Pipelines',
          ],
          roadmap: [
            {
              phase: 1,
              title: 'Phase 1: Architecture & Automated Test Hardening',
              duration: 'Weeks 1–2 (Self-Paced / 20–25 Hours recommended)',
              skills: ['Unit Testing', 'Integration Testing', 'Schema Validation'],
              activities: [
                'Write comprehensive unit tests with code coverage',
                'Implement strict request and response schema validation',
              ],
              expected_outcome:
                'Passing test suite with verified automated coverage across critical endpoints.',
            },
            {
              phase: 2,
              title: 'Phase 2: Containerization & Cloud CI/CD Pipelines',
              duration: 'Weeks 3–4 (Self-Paced / 25–30 Hours recommended)',
              skills: ['Docker Multi-Stage Builds', 'GitHub Actions', 'Cloud Deployment'],
              activities: [
                'Containerize frontend and backend into lightweight Docker images',
                'Configure GitHub Actions pipeline for automated linting and deployment',
              ],
              expected_outcome:
                'Verified live cloud deployment container URL.',
            },
            {
              phase: 3,
              title: 'Phase 3: Production Security & Recruiter Interview Drills',
              duration: 'Weeks 5–6 (Self-Paced / 15–20 Hours recommended)',
              skills: ['JWT Security & RBAC', 'Rate Limiting', 'Technical Presentation'],
              activities: [
                'Implement security headers, rate limiting, and token rotation',
                'Complete timed mock technical interview coding drills',
              ],
              expected_outcome:
                'Documented, recruiter-ready portfolio project with verifiable deployment.',
            },
          ],
          recommended_sequence: [
            '1. Automated Testing & Code Quality Assurance',
            '2. Multi-Stage Docker Container Packaging',
            '3. GitHub Actions CI/CD Deployment Automation',
            '4. Production Security & Token Lifecycle Hardening',
            '5. Capstone Recruiter Portfolio Presentation',
          ],
          projects: [
            {
              title: 'Cloud-Native Full-Stack Microservices Platform',
              description:
                'A secure, containerized web application with JWT authentication, automated CI/CD pipeline, and PostgreSQL database.',
              skills_applied: ['React', 'FastAPI', 'Docker', 'PostgreSQL'],
              complexity: 'Intermediate',
            },
            {
              title: 'Automated Code Quality & Security Sentinel',
              description:
                'An automated pipeline tool that inspects, tests, and benchmarks microservices before cloud deployment.',
              skills_applied: ['CI/CD', 'Docker', 'Pytest / Jest', 'REST APIs'],
              complexity: 'Advanced',
            },
          ],
          job_readiness: {
            readiness_level: score >= 80 ? 'High Market Fit' : 'Moderate Readiness',
            estimated_time_to_ready: '3–4 Weeks with Bridge Module',
            recommended_target_roles: [role, `Associate ${role}`, `${role} Specialist`],
            key_advice:
              'Complete the containerization bridge coursework and highlight verified portfolio projects on your candidate resume.',
          },
          is_ai_generated: false,
          model_used: 'Deterministic Fallback Engine',
          generated_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },
};
