import { apiClient } from './client';

/**
 * Pre-configured RBAC demo accounts using the exact 6 backend UserRole values:
 * MSDE_OFFICER, STATE_ADMIN, TRAINING_PROVIDER, EMPLOYER, EVALUATOR, SYSTEM_ADMIN
 */
export const DEMO_FALLBACK_USERS = [
  {
    email: 'aman.mishra@msde.gov.in',
    user: {
      id: '233de416-b87b-4d0b-8e0b-1f82cc0bbb29',
      email: 'aman.mishra@msde.gov.in',
      full_name: 'Aman Mishra',
      role: 'MSDE_OFFICER',
      is_active: true,
      is_superuser: true,
    },
  },
  {
    email: 'director.upssdm@up.gov.in',
    user: {
      id: 'state-admin-upssdm-01',
      email: 'director.upssdm@up.gov.in',
      full_name: 'State Administrator (UP-SDM)',
      role: 'STATE_ADMIN',
      is_active: true,
      is_superuser: false,
    },
  },
  {
    email: 'head.varanasi@pmkk-apex.org',
    user: {
      id: 'pmkk-lead-varanasi-01',
      email: 'head.varanasi@pmkk-apex.org',
      full_name: 'PMKK Center Lead',
      role: 'TRAINING_PROVIDER',
      is_active: true,
      is_superuser: false,
    },
  },
  {
    email: 'talent@tcs.com',
    user: {
      id: 'employer-hr-tcs-01',
      email: 'talent@tcs.com',
      full_name: 'Corporate Talent Partner',
      role: 'EMPLOYER',
      is_active: true,
      is_superuser: false,
    },
  },
  {
    email: 'evaluator.up@assessment.gov.in',
    user: {
      id: 'evaluator-lead-up-01',
      email: 'evaluator.up@assessment.gov.in',
      full_name: 'Regional Assessment Evaluator',
      role: 'EVALUATOR',
      is_active: true,
      is_superuser: false,
    },
  },
  {
    email: 'sysadmin@kaushalnexus.gov.in',
    user: {
      id: 'sysadmin-root-01',
      email: 'sysadmin@kaushalnexus.gov.in',
      full_name: 'Platform Operations Admin',
      role: 'SYSTEM_ADMIN',
      is_active: true,
      is_superuser: true,
    },
  },
  {
    email: 'learner.demo@kaushalnexus.gov.in',
    user: {
      id: 'KN-2026-9812',
      email: 'learner.demo@kaushalnexus.gov.in',
      full_name: 'Candidate Learner',
      role: 'LEARNER',
      is_active: true,
      is_superuser: false,
    },
  },
];

export const authApi = {
  /**
   * Authenticates user via email and password with offline-resilient fallback
   * @param {Object} credentials - { email, password }
   * @returns {Promise<{ access_token, refresh_token, token_type, user }>}
   */
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const data = response.data;
      if (data.access_token) {
        localStorage.setItem('kn_access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('kn_refresh_token', data.refresh_token);
        }
        if (data.user) {
          localStorage.setItem('kn_user', JSON.stringify(data.user));
        }
      }
      return data;
    } catch (err) {
      // If backend is offline (Network Error), check if credentials match a preset demo user or newly registered learner
      if (!err.response) {
        const demoMatch = DEMO_FALLBACK_USERS.find(
          (u) => u.email.toLowerCase() === credentials.email?.trim().toLowerCase()
        );
        let userToLogin = demoMatch?.user;
        if (!userToLogin) {
          const storedLearner = JSON.parse(localStorage.getItem('kn_current_learner') || '{}');
          userToLogin = {
            id: storedLearner.id || `usr-${Date.now()}`,
            email: credentials.email,
            full_name: storedLearner.full_name || credentials.email.split('@')[0],
            role: 'LEARNER',
            is_active: true,
            is_superuser: false,
          };
        }

        console.warn('Backend offline; using client-side demo session for', userToLogin.role);
        const fallbackData = {
          access_token: `demo-token-${userToLogin.role.toLowerCase()}-${Date.now()}`,
          token_type: 'bearer',
          expires_in_seconds: 86400,
          user: userToLogin,
        };
        localStorage.setItem('kn_access_token', fallbackData.access_token);
        localStorage.setItem('kn_user', JSON.stringify(fallbackData.user));
        return fallbackData;
      }
      throw err;
    }
  },

  /**
   * Registers a new institutional user
   * @param {Object} userData - { email, password, full_name, role }
   */
  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        const fallbackUser = {
          id: `usr-${Date.now()}`,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role || 'LEARNER',
          is_active: true,
          is_superuser: false,
        };
        const nowYear = new Date().getFullYear();
        const randId = Math.floor(1000 + Math.random() * 9000);
        const learnerId = `KN-${nowYear}-${randId}`;
        const fallbackLearner = {
          id: learnerId,
          full_name: userData.full_name,
          email: userData.email,
          phone: userData.phone || '',
          education_level: userData.education_level || 'B.Tech (Computer Science)',
          institution: userData.institution || 'National Skill Development Center',
          district_id: userData.district_id || 'UP-LUCKNOW',
          aspiring_role_id: userData.aspiring_role_id || 'role-fullstack',
          target_domain: userData.target_domain || 'fullstack',
          employment_readiness_score: 55,
          overall_progress: 10,
          status: 'In Training',
          created_at: new Date().toISOString(),
        };
        localStorage.setItem('kn_current_learner', JSON.stringify(fallbackLearner));
        return fallbackUser;
      }
      throw err;
    }
  },

  /**
   * Exchanges a 7-day refresh token for a fresh access token
   * @param {string} refreshToken
   */
  async refreshToken(refreshToken) {
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Retrieves profile for the currently authenticated user
   */
  async getMe() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (err) {
      if (!err.response) {
        const cachedUser = this.getCurrentUser();
        if (cachedUser) return cachedUser;
      }
      throw err;
    }
  },

  /**
   * Authenticates or auto-registers user via verified Phone Number & Firebase ID Token
   * @param {Object} payload - { phone, firebase_id_token, full_name, role }
   */
  async phoneLogin(payload) {
    try {
      const response = await apiClient.post('/auth/phone-login', payload);
      const data = response.data;
      if (data?.access_token) {
        localStorage.setItem('kn_access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('kn_refresh_token', data.refresh_token);
        }
        if (data.user) {
          localStorage.setItem('kn_user', JSON.stringify(data.user));
        }
      }
      return data;
    } catch (err) {
      if (!err.response) {
        // Offline / demo fallback for phone authentication
        const fallbackUser = {
          id: `usr-phone-${Date.now()}`,
          email: `${payload.phone.replace(/[^0-9]/g, '')}@phone.kaushalnexus.gov.in`,
          full_name: payload.full_name || `Candidate (${payload.phone.slice(-4)})`,
          role: payload.role || 'LEARNER',
          is_active: true,
          is_superuser: false,
        };
        const fallbackData = {
          access_token: `demo-token-phone-${Date.now()}`,
          token_type: 'bearer',
          expires_in_seconds: 86400,
          user: fallbackUser,
        };
        localStorage.setItem('kn_access_token', fallbackData.access_token);
        localStorage.setItem('kn_user', JSON.stringify(fallbackData.user));
        return fallbackData;
      }
      throw err;
    }
  },

  /**
   * Logs out user by clearing stored tokens and session state
   */
  logout() {
    localStorage.removeItem('kn_access_token');
    localStorage.removeItem('kn_refresh_token');
    localStorage.removeItem('kn_user');
  },

  /**
   * Retrieves current user cached in localStorage
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('kn_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Checks if user is currently authenticated
   */
  isAuthenticated() {
    return Boolean(localStorage.getItem('kn_access_token'));
  },

  /**
   * Returns current access token if authenticated, or null
   */
  async ensureAuthenticated() {
    if (this.isAuthenticated()) {
      return localStorage.getItem('kn_access_token');
    }
    return null;
  },
};
