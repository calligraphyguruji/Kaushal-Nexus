import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  UserRole,
  normalizeRole,
  getRoleDashboardPath,
  getPostLoginRedirect,
  computePermissions,
} from '../utils/permissions.js';
import { DEMO_FALLBACK_USERS } from '../api/auth.js';

describe('Role-Based Authentication & Routing Suite', () => {
  describe('1. Role Normalization (normalizeRole)', () => {
    it('should normalize uppercase and lowercase MSDE Officer roles', () => {
      assert.equal(normalizeRole('msde_officer'), UserRole.MSDE_OFFICER);
      assert.equal(normalizeRole('MSDE_OFFICER'), UserRole.MSDE_OFFICER);
      assert.equal(normalizeRole('msde'), UserRole.MSDE_OFFICER);
      assert.equal(normalizeRole('officer'), UserRole.MSDE_OFFICER);
    });

    it('should normalize uppercase and lowercase Administrator roles', () => {
      assert.equal(normalizeRole('admin'), UserRole.SYSTEM_ADMIN);
      assert.equal(normalizeRole('SYSTEM_ADMIN'), UserRole.SYSTEM_ADMIN);
      assert.equal(normalizeRole('system_admin'), UserRole.SYSTEM_ADMIN);
      assert.equal(normalizeRole('sysadmin'), UserRole.SYSTEM_ADMIN);
    });

    it('should normalize uppercase and lowercase Learner roles', () => {
      assert.equal(normalizeRole('learner'), UserRole.LEARNER);
      assert.equal(normalizeRole('LEARNER'), UserRole.LEARNER);
      assert.equal(normalizeRole('candidate'), UserRole.LEARNER);
      assert.equal(normalizeRole('student'), UserRole.LEARNER);
    });

    it('should return null for invalid or empty inputs', () => {
      assert.equal(normalizeRole(null), null);
      assert.equal(normalizeRole(''), null);
      assert.equal(normalizeRole(undefined), null);
    });
  });

  describe('2. Role Dashboard Path Mapping (getRoleDashboardPath)', () => {
    it('should map MSDE_OFFICER to /msde', () => {
      assert.equal(getRoleDashboardPath('MSDE_OFFICER'), '/msde');
      assert.equal(getRoleDashboardPath('msde_officer'), '/msde');
    });

    it('should map superuser to /msde if not a learner', () => {
      assert.equal(getRoleDashboardPath('MSDE_OFFICER', true), '/msde');
      assert.equal(getRoleDashboardPath('SYSTEM_ADMIN', true), '/admin');
    });

    it('should map SYSTEM_ADMIN and STATE_ADMIN to /admin', () => {
      assert.equal(getRoleDashboardPath('SYSTEM_ADMIN'), '/admin');
      assert.equal(getRoleDashboardPath('admin'), '/admin');
      assert.equal(getRoleDashboardPath('STATE_ADMIN'), '/admin');
    });

    it('should map LEARNER to /learner', () => {
      assert.equal(getRoleDashboardPath('LEARNER'), '/learner');
      assert.equal(getRoleDashboardPath('learner'), '/learner');
    });
  });

  describe('3. Post-Login Redirect Security (getPostLoginRedirect)', () => {
    const msdeOfficerUser = {
      email: 'aman.mishra@msde.gov.in',
      role: 'MSDE_OFFICER',
      is_superuser: true,
    };

    const msdeOfficerLowercase = {
      email: 'officer@msde.gov.in',
      role: 'msde_officer',
      is_superuser: false,
    };

    const adminUser = {
      email: 'admin@kaushalnexus.gov.in',
      role: 'SYSTEM_ADMIN',
      is_superuser: true,
    };

    const learnerUser = {
      email: 'candidate@example.com',
      role: 'LEARNER',
      is_superuser: false,
    };

    it('should redirect MSDE Officer to /msde when no destination or / is specified', () => {
      assert.equal(getPostLoginRedirect(msdeOfficerUser, null), '/msde');
      assert.equal(getPostLoginRedirect(msdeOfficerUser, '/'), '/msde');
      assert.equal(getPostLoginRedirect(msdeOfficerUser, '/login'), '/msde');
    });

    it('CRITICAL: should NEVER redirect MSDE Officer to /learner even if state.from was /learner', () => {
      assert.equal(getPostLoginRedirect(msdeOfficerUser, '/learner'), '/msde');
      assert.equal(getPostLoginRedirect(msdeOfficerUser, '/learner/'), '/msde');
      assert.equal(getPostLoginRedirect(msdeOfficerLowercase, '/learner'), '/msde');
    });

    it('should redirect Admin to /admin when state.from was /learner or /', () => {
      assert.equal(getPostLoginRedirect(adminUser, '/'), '/admin');
      assert.equal(getPostLoginRedirect(adminUser, '/learner'), '/admin');
    });

    it('CRITICAL: should redirect Learner to /learner and block access to /msde and /admin', () => {
      assert.equal(getPostLoginRedirect(learnerUser, null), '/learner');
      assert.equal(getPostLoginRedirect(learnerUser, '/msde'), '/learner');
      assert.equal(getPostLoginRedirect(learnerUser, '/admin'), '/learner');
      assert.equal(getPostLoginRedirect(learnerUser, '/dashboard'), '/learner');
    });

    it('should preserve valid deep links for authorized roles', () => {
      assert.equal(getPostLoginRedirect(msdeOfficerUser, '/regional'), '/regional');
      assert.equal(getPostLoginRedirect(msdeOfficerUser, '/skill-gap'), '/skill-gap');
      assert.equal(getPostLoginRedirect(learnerUser, '/assessment'), '/assessment');
      assert.equal(getPostLoginRedirect(learnerUser, '/internships'), '/internships');
    });
  });

  describe('4. Demo Fallback Accounts & Email Variant Coverage', () => {
    it('should support both aman.mishra@msde.gov.in and amanmishra@msde.gov.in as MSDE_OFFICER', () => {
      const withDot = DEMO_FALLBACK_USERS.find(
        (u) => u.email === 'aman.mishra@msde.gov.in'
      );
      const withoutDot = DEMO_FALLBACK_USERS.find(
        (u) => u.email === 'amanmishra@msde.gov.in'
      );

      assert.ok(withDot, 'aman.mishra@msde.gov.in should exist in demo users');
      assert.equal(withDot.user.role, 'MSDE_OFFICER');

      assert.ok(withoutDot, 'amanmishra@msde.gov.in should exist in demo users');
      assert.equal(withoutDot.user.role, 'MSDE_OFFICER');
    });
  });

  describe('5. Permissions Evaluation Casing Interoperability', () => {
    it('should recognize isMSDEOfficer regardless of role casing', () => {
      const upper = computePermissions({ role: 'MSDE_OFFICER', is_superuser: false });
      assert.equal(upper.isMSDEOfficer, true);
      assert.equal(upper.isLearner, false);

      const lower = computePermissions({ role: 'msde_officer', is_superuser: false });
      assert.equal(lower.isMSDEOfficer, true);
      assert.equal(lower.isLearner, false);
    });

    it('should recognize isLearner only for true learners without superuser', () => {
      const learner = computePermissions({ role: 'LEARNER', is_superuser: false });
      assert.equal(learner.isLearner, true);
      assert.equal(learner.isMSDEOfficer, false);

      const superuserLearner = computePermissions({ role: 'LEARNER', is_superuser: true });
      assert.equal(superuserLearner.isLearner, false);
      assert.equal(superuserLearner.isMSDEOfficer, true);
    });
  });
});
