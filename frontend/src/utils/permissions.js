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
  LEARNER: "LEARNER",
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
  [UserRole.LEARNER]: "Candidate Learner / Intern",
});

export const ROLE_DESCRIPTIONS = Object.freeze({
  [UserRole.MSDE_OFFICER]: "National policy oversight, cross-state longitudinal analytics, and central audit log access.",
  [UserRole.STATE_ADMIN]: "State-level mission monitoring, regional divergence analysis, and bridge curriculum interventions.",
  [UserRole.TRAINING_PROVIDER]: "Center-level candidate enrollment, bridge training execution, and training batch tracking.",
  [UserRole.EMPLOYER]: "Hiring mandate management, semantic candidate discovery, and EPFO retention tracking.",
  [UserRole.EVALUATOR]: "Independent third-party skill assessments, NCVET credential validation, and verification audits.",
  [UserRole.SYSTEM_ADMIN]: "Full operational governance, queue monitoring, system audit inspection, and platform administration.",
  [UserRole.LEARNER]: "Candidate intelligence portal, CV skill extraction, BKT knowledge state, and role matching.",
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
 * Normalizes user role strings (case-insensitive, aliases) to official UserRole enum.
 * @param {string} role - e.g. "MSDE_OFFICER", "msde_officer", "admin", "learner"
 * @returns {string|null}
 */
export function normalizeRole(role) {
  if (!role || typeof role !== "string") return null;
  const upper = role.trim().toUpperCase();
  if (upper === "MSDE_OFFICER" || upper === "MSDE" || upper === "OFFICER") return UserRole.MSDE_OFFICER;
  if (upper === "STATE_ADMIN" || upper === "STATE" || upper === "SSDM") return UserRole.STATE_ADMIN;
  if (upper === "TRAINING_PROVIDER" || upper === "PROVIDER" || upper === "PMKK") return UserRole.TRAINING_PROVIDER;
  if (upper === "EMPLOYER" || upper === "CORPORATE") return UserRole.EMPLOYER;
  if (upper === "EVALUATOR" || upper === "NCVET") return UserRole.EVALUATOR;
  if (upper === "SYSTEM_ADMIN" || upper === "ADMIN" || upper === "SYSADMIN" || upper === "SUPERUSER") return UserRole.SYSTEM_ADMIN;
  if (upper === "LEARNER" || upper === "STUDENT" || upper === "CANDIDATE" || upper === "INTERN") return UserRole.LEARNER;
  return upper;
}

/**
 * Returns default dashboard route according to authenticated role.
 * @param {string} role - User role
 * @param {boolean} isSuperuser - Whether user has superuser privileges
 * @returns {string}
 */
export function getRoleDashboardPath(role, isSuperuser = false) {
  const normalized = normalizeRole(role);
  if (normalized === UserRole.MSDE_OFFICER) {
    return "/msde";
  }
  if (normalized === UserRole.SYSTEM_ADMIN || normalized === UserRole.STATE_ADMIN) {
    return "/admin";
  }
  if (isSuperuser && normalized !== UserRole.LEARNER) {
    return "/msde";
  }
  if (normalized === UserRole.EMPLOYER) {
    return "/matching";
  }
  if (normalized === UserRole.TRAINING_PROVIDER) {
    return "/skill-gap";
  }
  return "/learner";
}

/**
 * Computes safe post-login destination, preventing cross-role route leaks
 * (e.g. MSDE Officer landing on /learner or Learner accessing /msde).
 * @param {Object} user - User object with role & is_superuser
 * @param {string} requestedPath - Requested path from navigation state
 * @returns {string}
 */
export function getPostLoginRedirect(user, requestedPath) {
  if (!user) return "/login";
  const normalizedRole = normalizeRole(user.role);
  const defaultPath = getRoleDashboardPath(normalizedRole, Boolean(user.is_superuser));

  if (!requestedPath || requestedPath === "/" || requestedPath === "/login" || requestedPath === "/register") {
    return defaultPath;
  }

  // Restrict Learners from administrative and governance routes
  if (normalizedRole === UserRole.LEARNER && !user.is_superuser) {
    if (
      requestedPath.startsWith("/msde") ||
      requestedPath.startsWith("/admin") ||
      requestedPath.startsWith("/dashboard") ||
      requestedPath.startsWith("/regional") ||
      requestedPath.startsWith("/skill-gap") ||
      requestedPath.startsWith("/matching")
    ) {
      return "/learner";
    }
    return requestedPath;
  }

  // Restrict Administrators from candidate learner profile
  if (normalizedRole === UserRole.SYSTEM_ADMIN || normalizedRole === UserRole.STATE_ADMIN) {
    if (requestedPath === "/learner" || requestedPath === "/learner/") {
      return "/admin";
    }
    return requestedPath;
  }

  // Restrict MSDE Officers from candidate learner profile
  if (normalizedRole === UserRole.MSDE_OFFICER || user.is_superuser) {
    if (requestedPath === "/learner" || requestedPath === "/learner/") {
      return "/msde";
    }
    return requestedPath;
  }

  return defaultPath;
}

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

  const userRole = normalizeRole(user.role);
  return allowedRoles.includes(userRole);
}

/**
 * Evaluates the full permission matrix for a given user.
 * @param {Object} user - User object
 */
export function computePermissions(user) {
  const normalizedRole = normalizeRole(user?.role);
  const isSuperuser = Boolean(user?.is_superuser);

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
    // Role checks (normalized and robust against casing differences)
    isMSDEOfficer: normalizedRole === UserRole.MSDE_OFFICER || isSuperuser,
    isStateAdmin: normalizedRole === UserRole.STATE_ADMIN,
    isTrainingProvider: normalizedRole === UserRole.TRAINING_PROVIDER,
    isEmployer: normalizedRole === UserRole.EMPLOYER,
    isEvaluator: normalizedRole === UserRole.EVALUATOR,
    isSystemAdmin: normalizedRole === UserRole.SYSTEM_ADMIN || isSuperuser,
    isLearner: normalizedRole === UserRole.LEARNER && !isSuperuser,
    isSuperuser,
    role: normalizedRole || user?.role,
    roleLabel: normalizedRole ? (ROLE_LABELS[normalizedRole] || normalizedRole) : "Unauthenticated",
  };

  const check = (permissionKey) => hasPermission(user, permissionKey);

  return { ...permissions, hasPermission: check };
}
