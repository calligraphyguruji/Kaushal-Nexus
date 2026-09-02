/**
 * Exact authoritative RBAC roles matching backend UserRole enum.
 * Never introduce legacy role names (STATE_DIRECTOR, TRAINING_PARTNER, LEARNER).
 */
export const UserRole = Object.freeze({
  MSDE_OFFICER: "MSDE_OFFICER",
  STATE_ADMIN: "STATE_ADMIN",
  TRAINING_PROVIDER: "TRAINING_PROVIDER",
  EMPLOYER: "EMPLOYER",
  EVALUATOR: "EVALUATOR",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
});

/**
 * Official Indian Governance & Institutional Titles
 */
export const ROLE_LABELS = Object.freeze({
  [UserRole.MSDE_OFFICER]: "National Policy View (MSDE)",
  [UserRole.STATE_ADMIN]: "State Skill Mission (SSDM)",
  [UserRole.TRAINING_PROVIDER]: "PMKK / Training Provider",
  [UserRole.EMPLOYER]: "Corporate Employer Partner",
  [UserRole.EVALUATOR]: "Assessment & Evaluation Agency",
  [UserRole.SYSTEM_ADMIN]: "System Administrator",
});

export const ROLE_DESCRIPTIONS = Object.freeze({
  [UserRole.MSDE_OFFICER]: "National policy oversight, cross-state longitudinal analytics, and central audit log access.",
  [UserRole.STATE_ADMIN]: "State-level mission monitoring, regional divergence analysis, and bridge curriculum interventions.",
  [UserRole.TRAINING_PROVIDER]: "Center-level candidate enrollment, bridge training execution, and training batch tracking.",
  [UserRole.EMPLOYER]: "Hiring mandate management, semantic candidate discovery, and EPFO retention tracking.",
  [UserRole.EVALUATOR]: "Independent third-party skill assessments, NCVET credential validation, and verification audits.",
  [UserRole.SYSTEM_ADMIN]: "Full operational governance, queue monitoring, system audit inspection, and platform administration.",
});

/**
 * UI Action Permission Matrix mapping exact backend RBAC capabilities to roles.
 * NOTE: Frontend permissions are strictly for UI/UX gating; backend remains the authoritative boundary.
 */
export const ROLE_PERMISSIONS = Object.freeze({
  canViewLearners: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
  ],
  canCreateLearner: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.SYSTEM_ADMIN,
  ],
  canUpdateLearner: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.SYSTEM_ADMIN,
  ],
  canVerifyCredential: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
  ],
  canAllocateBridgeModule: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.SYSTEM_ADMIN,
  ],
  canDeployIntervention: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.SYSTEM_ADMIN,
  ],
  canDispatchCandidates: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.SYSTEM_ADMIN,
  ],
  canUpdateRetention: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.EMPLOYER,
    UserRole.TRAINING_PROVIDER,
    UserRole.SYSTEM_ADMIN,
  ],
  canViewAuditLogs: [
    UserRole.MSDE_OFFICER,
    UserRole.SYSTEM_ADMIN,
  ],
  canRunEPFOSync: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.EMPLOYER,
    UserRole.SYSTEM_ADMIN,
  ],
  canRunSIDSync: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.SYSTEM_ADMIN,
  ],
  canGenerateReports: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.SYSTEM_ADMIN,
  ],
  canViewMLModels: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
  ],
  canRunMLTools: [
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.EMPLOYER,
    UserRole.SYSTEM_ADMIN,
  ],
});

/**
 * Checks if a user object holds a specific UI permission.
 * Superusers bypass all permission checks.
 * @param {Object} user - User object with { role, is_superuser }
 * @param {string} permissionKey - Key from ROLE_PERMISSIONS
 * @returns {boolean}
 */
export function hasPermission(user, permissionKey) {
  if (!user) return false;
  if (user.is_superuser === true) return true;

  const allowedRoles = ROLE_PERMISSIONS[permissionKey];
  if (!allowedRoles) return false;

  return allowedRoles.includes(user.role);
}

/**
 * Evaluates the full permission matrix for a given user.
 * @param {Object} user - User object
 */
export function computePermissions(user) {
  const permissions = {
    canViewLearners: hasPermission(user, "canViewLearners"),
    canCreateLearner: hasPermission(user, "canCreateLearner"),
    canUpdateLearner: hasPermission(user, "canUpdateLearner"),
    canVerifyCredential: hasPermission(user, "canVerifyCredential"),
    canAllocateBridgeModule: hasPermission(user, "canAllocateBridgeModule"),
    canDeployIntervention: hasPermission(user, "canDeployIntervention"),
    canDispatchCandidates: hasPermission(user, "canDispatchCandidates"),
    canUpdateRetention: hasPermission(user, "canUpdateRetention"),
    canViewAuditLogs: hasPermission(user, "canViewAuditLogs"),
    canRunEPFOSync: hasPermission(user, "canRunEPFOSync"),
    canRunSIDSync: hasPermission(user, "canRunSIDSync"),
    canGenerateReports: hasPermission(user, "canGenerateReports"),
    canViewMLModels: hasPermission(user, "canViewMLModels"),
    canRunMLTools: hasPermission(user, "canRunMLTools"),
    // Role checks
    isMSDEOfficer: user?.role === UserRole.MSDE_OFFICER || user?.is_superuser === true,
    isStateAdmin: user?.role === UserRole.STATE_ADMIN,
    isTrainingProvider: user?.role === UserRole.TRAINING_PROVIDER,
    isEmployer: user?.role === UserRole.EMPLOYER,
    isEvaluator: user?.role === UserRole.EVALUATOR,
    isSystemAdmin: user?.role === UserRole.SYSTEM_ADMIN || user?.is_superuser === true,
    isSuperuser: Boolean(user?.is_superuser),
    role: user?.role,
    roleLabel: user?.role ? (ROLE_LABELS[user.role] || user.role) : "Unauthenticated",
  };

  const check = (permissionKey) => hasPermission(user, permissionKey);

  return { ...permissions, hasPermission: check };
}
