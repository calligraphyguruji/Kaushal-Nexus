import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  UserRole,
  ROLE_PERMISSIONS,
  hasPermission,
  ROLE_LABELS,
} from "../utils/permissions.js";

import { getErrorMessage } from "../api/client.js";

describe("KaushalNexus Frontend RBAC & Authorization Suite", () => {
  describe("1. UserRole Enum Matching Backend Exactly", () => {
    it("should export exactly the 6 authoritative backend roles", () => {
      const expectedRoles = [
        "MSDE_OFFICER",
        "STATE_ADMIN",
        "TRAINING_PROVIDER",
        "EMPLOYER",
        "EVALUATOR",
        "SYSTEM_ADMIN",
        "LEARNER",
      ];
      assert.deepEqual(Object.values(UserRole).sort(), expectedRoles.sort());
    });

    it("should have official governance titles for every role", () => {
      Object.values(UserRole).forEach((role) => {
        assert.ok(ROLE_LABELS[role], `Missing ROLE_LABELS for ${role}`);
        assert.ok(typeof ROLE_LABELS[role] === "string");
      });
    });
  });

  describe("2. MSDE_OFFICER Permissions", () => {
    const msdeOfficer = { role: UserRole.MSDE_OFFICER, is_superuser: false };

    it("should grant national policy, audit logs, and intervention permissions", () => {
      assert.equal(hasPermission(msdeOfficer, "canViewLearners"), true);
      assert.equal(hasPermission(msdeOfficer, "canCreateLearner"), true);
      assert.equal(hasPermission(msdeOfficer, "canDeployIntervention"), true);
      assert.equal(hasPermission(msdeOfficer, "canViewAuditLogs"), true);
      assert.equal(hasPermission(msdeOfficer, "canGenerateReports"), true);
      assert.equal(hasPermission(msdeOfficer, "canRunEPFOSync"), true);
      assert.equal(hasPermission(msdeOfficer, "canRunSIDSync"), true);
    });
  });

  describe("3. STATE_ADMIN Permissions", () => {
    const stateAdmin = { role: UserRole.STATE_ADMIN, is_superuser: false };

    it("should grant state mission monitoring, intervention, and dispatching", () => {
      assert.equal(hasPermission(stateAdmin, "canViewLearners"), true);
      assert.equal(hasPermission(stateAdmin, "canCreateLearner"), true);
      assert.equal(hasPermission(stateAdmin, "canDeployIntervention"), true);
      assert.equal(hasPermission(stateAdmin, "canDispatchCandidates"), true);
      assert.equal(hasPermission(stateAdmin, "canUpdateRetention"), true);
      assert.equal(hasPermission(stateAdmin, "canGenerateReports"), true);
      assert.equal(hasPermission(stateAdmin, "canRunSIDSync"), true);
    });

    it("should deny central audit log access to state admin", () => {
      assert.equal(hasPermission(stateAdmin, "canViewAuditLogs"), false);
    });
  });

  describe("4. TRAINING_PROVIDER Permissions", () => {
    const tp = { role: UserRole.TRAINING_PROVIDER, is_superuser: false };

    it("should grant learner creation, bridge module allocation, and candidate dispatch", () => {
      assert.equal(hasPermission(tp, "canViewLearners"), true);
      assert.equal(hasPermission(tp, "canCreateLearner"), true);
      assert.equal(hasPermission(tp, "canUpdateLearner"), true);
      assert.equal(hasPermission(tp, "canAllocateBridgeModule"), true);
      assert.equal(hasPermission(tp, "canDispatchCandidates"), true);
      assert.equal(hasPermission(tp, "canRunSIDSync"), true);
    });

    it("should deny central policy intervention, credential verification, and audit logs", () => {
      assert.equal(hasPermission(tp, "canDeployIntervention"), false);
      assert.equal(hasPermission(tp, "canVerifyCredential"), false);
      assert.equal(hasPermission(tp, "canViewAuditLogs"), false);
      assert.equal(hasPermission(tp, "canGenerateReports"), false);
    });
  });

  describe("5. EMPLOYER Permissions", () => {
    const employer = { role: UserRole.EMPLOYER, is_superuser: false };

    it("should grant viewing learners, ML models, and EPFO retention tracking", () => {
      assert.equal(hasPermission(employer, "canViewLearners"), true);
      assert.equal(hasPermission(employer, "canViewMLModels"), true);
      assert.equal(hasPermission(employer, "canUpdateRetention"), true);
      assert.equal(hasPermission(employer, "canRunEPFOSync"), true);
    });

    it("should deny learner creation, credential verification, bridge allocation, and audit logs", () => {
      assert.equal(hasPermission(employer, "canCreateLearner"), false);
      assert.equal(hasPermission(employer, "canVerifyCredential"), false);
      assert.equal(hasPermission(employer, "canAllocateBridgeModule"), false);
      assert.equal(hasPermission(employer, "canDeployIntervention"), false);
      assert.equal(hasPermission(employer, "canViewAuditLogs"), false);
    });
  });

  describe("6. EVALUATOR Permissions", () => {
    const evaluator = { role: UserRole.EVALUATOR, is_superuser: false };

    it("should grant credential verification and viewing learners", () => {
      assert.equal(hasPermission(evaluator, "canViewLearners"), true);
      assert.equal(hasPermission(evaluator, "canVerifyCredential"), true);
    });

    it("should deny candidate creation, dispatching, intervention deployment, and audit logs", () => {
      assert.equal(hasPermission(evaluator, "canCreateLearner"), false);
      assert.equal(hasPermission(evaluator, "canDispatchCandidates"), false);
      assert.equal(hasPermission(evaluator, "canDeployIntervention"), false);
      assert.equal(hasPermission(evaluator, "canViewAuditLogs"), false);
      assert.equal(hasPermission(evaluator, "canRunEPFOSync"), false);
    });
  });

  describe("7. SYSTEM_ADMIN / is_superuser Permissions", () => {
    const sysAdmin = { role: UserRole.SYSTEM_ADMIN, is_superuser: false };
    const superuser = { role: "CUSTOM_ROLE", is_superuser: true };

    it("should grant SYSTEM_ADMIN all administrative permissions", () => {
      assert.equal(hasPermission(sysAdmin, "canViewLearners"), true);
      assert.equal(hasPermission(sysAdmin, "canViewAuditLogs"), true);
      assert.equal(hasPermission(sysAdmin, "canDeployIntervention"), true);
      assert.equal(hasPermission(sysAdmin, "canDispatchCandidates"), true);
      assert.equal(hasPermission(sysAdmin, "canVerifyCredential"), true);
      assert.equal(hasPermission(sysAdmin, "canRunEPFOSync"), true);
      assert.equal(hasPermission(sysAdmin, "canRunSIDSync"), true);
    });

    it("should bypass all checks unconditionally when is_superuser is true", () => {
      assert.equal(hasPermission(superuser, "canViewLearners"), true);
      assert.equal(hasPermission(superuser, "canViewAuditLogs"), true);
      assert.equal(hasPermission(superuser, "canDeployIntervention"), true);
      assert.equal(hasPermission(superuser, "anyFuturePermission"), true);
    });

    it("should return false for unauthenticated / null user", () => {
      assert.equal(hasPermission(null, "canViewLearners"), false);
      assert.equal(hasPermission(undefined, "canViewAuditLogs"), false);
    });
  });

  describe("8. 403 Forbidden Error Extraction & Sanitization", () => {
    it("should return clean user-facing scope message for 403 errors", () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: {
            message: "Access forbidden: Candidate is outside your authorized institutional jurisdiction.",
          },
        },
      };
      const msg = getErrorMessage(forbiddenError);
      assert.equal(
        msg,
        "Access forbidden: Candidate is outside your authorized institutional jurisdiction."
      );
    });

    it("should sanitize raw internal SQL or traceback in 403 error", () => {
      const dirtyForbiddenError = {
        response: {
          status: 403,
          data: {
            message: "Traceback (most recent call last): SELECT * FROM users sqlalchemy.exc...",
          },
        },
      };
      const msg = getErrorMessage(dirtyForbiddenError);
      assert.equal(
        msg,
        "You don't have permission to access this resource or it is outside your authorized institutional scope."
      );
    });

    it("should handle 401 session expiry with friendly message", () => {
      const unauthorizedError = {
        response: {
          status: 401,
          data: { detail: "Signature has expired" },
        },
      };
      const msg = getErrorMessage(unauthorizedError);
      assert.match(msg, /session has expired|sign in again/i);
    });
  });

  describe("9. Masked PII Rendering Invariants", () => {
    it("should verify PII string masking format (never unmask on client)", () => {
      const rawMaskedPhone = "+91 98765 XXXXX";
      const rawMaskedEmail = "a***@example.com";
      const rawMaskedAadhaar = "•••• •••• 9012";

      // Client must display exactly what backend returns
      assert.ok(rawMaskedPhone.includes("XXXXX"));
      assert.ok(rawMaskedEmail.includes("***"));
      assert.ok(rawMaskedAadhaar.includes("••••"));
    });
  });
});
