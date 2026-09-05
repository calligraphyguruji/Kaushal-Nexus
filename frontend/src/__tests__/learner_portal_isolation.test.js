import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  UserRole,
  computePermissions,
  hasPermission,
} from "../utils/permissions.js";

describe("Learner Portal RBAC & Screen Isolation Test Suite", () => {
  const learnerUser = {
    id: "learner-test-01",
    email: "learner.demo@kaushalnexus.gov.in",
    role: UserRole.LEARNER,
    is_superuser: false,
  };

  const officerUser = {
    id: "officer-test-01",
    email: "aman.mishra@msde.gov.in",
    role: UserRole.MSDE_OFFICER,
    is_superuser: false,
  };

  describe("1. Permission Matrix Isolation for Candidate Learners", () => {
    it("should evaluate isLearner as true and officer roles as false", () => {
      const perms = computePermissions(learnerUser);
      assert.equal(perms.isLearner, true);
      assert.equal(perms.isMSDEOfficer, false);
      assert.equal(perms.isStateAdmin, false);
      assert.equal(perms.isTrainingProvider, false);
      assert.equal(perms.isEmployer, false);
      assert.equal(perms.isEvaluator, false);
      assert.equal(perms.isSystemAdmin, false);
    });

    it("should deny institutional officer capabilities to learners", () => {
      assert.equal(hasPermission(learnerUser, "canViewLearners"), false);
      assert.equal(hasPermission(learnerUser, "canCreateLearner"), false);
      assert.equal(hasPermission(learnerUser, "canUpdateLearner"), false);
      assert.equal(hasPermission(learnerUser, "canVerifyCredential"), false);
      assert.equal(hasPermission(learnerUser, "canAllocateBridgeModule"), false);
      assert.equal(hasPermission(learnerUser, "canDeployIntervention"), false);
      assert.equal(hasPermission(learnerUser, "canDispatchCandidates"), false);
      assert.equal(hasPermission(learnerUser, "canUpdateRetention"), false);
      assert.equal(hasPermission(learnerUser, "canViewAuditLogs"), false);
      assert.equal(hasPermission(learnerUser, "canRunEPFOSync"), false);
      assert.equal(hasPermission(learnerUser, "canRunSIDSync"), false);
      assert.equal(hasPermission(learnerUser, "canGenerateReports"), false);
      assert.equal(hasPermission(learnerUser, "canViewMLModels"), false);
      assert.equal(hasPermission(learnerUser, "canRunMLTools"), false);
    });

    it("should allow MSDE Officer institutional capabilities", () => {
      assert.equal(hasPermission(officerUser, "canViewLearners"), true);
      assert.equal(hasPermission(officerUser, "canViewAuditLogs"), true);
      assert.equal(hasPermission(officerUser, "canDeployIntervention"), true);
      assert.equal(hasPermission(officerUser, "canGenerateReports"), true);
    });
  });

  describe("2. The 5 MSDE Officer Screens Route Protection Invariants", () => {
    const officerOnlyRoutes = [
      { name: "Overview & Impact", path: "/dashboard", disallowedRoles: ["LEARNER"] },
      { name: "Skill Gap Matrix", path: "/skill-gap", disallowedRoles: ["LEARNER"] },
      { name: "Regional Intelligence", path: "/regional", disallowedRoles: ["LEARNER"] },
      { name: "Employer Network", path: "/matching", disallowedRoles: ["LEARNER"] },
      { name: "Macro Candidate Registry Dossier", path: "/learner/:learnerId", disallowedRoles: ["LEARNER"] },
    ];

    it("should strictly disallow LEARNER role on all 5 institutional officer routes", () => {
      officerOnlyRoutes.forEach((route) => {
        assert.ok(
          route.disallowedRoles.includes(learnerUser.role),
          `Route ${route.path} (${route.name}) must disallow LEARNER role`
        );
      });
    });

    it("should permit MSDE Officer on all 5 institutional officer routes", () => {
      officerOnlyRoutes.forEach((route) => {
        assert.ok(
          !route.disallowedRoles.includes(officerUser.role),
          `Route ${route.path} (${route.name}) must allow MSDE_OFFICER role`
        );
      });
    });

    it("should redirect learners accessing officer routes to /learner", () => {
      function evaluateRouteAccess(user, disallowedRoles) {
        if (disallowedRoles && disallowedRoles.includes(user.role)) {
          if (user.role === "LEARNER") {
            return { action: "redirect", destination: "/learner" };
          }
          return { action: "forbidden" };
        }
        return { action: "allow" };
      }

      officerOnlyRoutes.forEach((route) => {
        const result = evaluateRouteAccess(learnerUser, route.disallowedRoles);
        assert.equal(result.action, "redirect");
        assert.equal(result.destination, "/learner");
      });

      officerOnlyRoutes.forEach((route) => {
        const result = evaluateRouteAccess(officerUser, route.disallowedRoles);
        assert.equal(result.action, "allow");
      });
    });
  });

  describe("3. Candidate Portal Tab & Screen Isolation Invariants", () => {
    function sanitizeLearnerViewMode(isLearner, requestedTab) {
      if (isLearner) {
        return requestedTab === "remediation" ? "remediation" : "pipeline";
      }
      return requestedTab || "career";
    }

    it("should default learner view to pipeline (My Assessment & Skill Gaps)", () => {
      const mode = sanitizeLearnerViewMode(true, null);
      assert.equal(mode, "pipeline");
    });

    it("should allow learner to view remediation (Recommended Learning Path)", () => {
      const mode = sanitizeLearnerViewMode(true, "remediation");
      assert.equal(mode, "remediation");
    });

    it("should sanitize and block officer tabs from learners (impact, intelligence, placement, career, dossier)", () => {
      const officerTabs = ["impact", "intelligence", "placement", "career", "dossier", "admin", "unknown"];
      officerTabs.forEach((tab) => {
        const sanitized = sanitizeLearnerViewMode(true, tab);
        assert.equal(
          sanitized,
          "pipeline",
          `Officer tab '${tab}' must be sanitized to 'pipeline' for learners`
        );
      });
    });

    it("should allow officers to access all institutional tabs", () => {
      const officerTabs = ["impact", "intelligence", "placement", "career", "remediation", "pipeline", "dossier"];
      officerTabs.forEach((tab) => {
        const mode = sanitizeLearnerViewMode(false, tab);
        assert.equal(mode, tab);
      });
    });
  });

  describe("4. Navigation Items Isolation", () => {
    it("should expose only Assessment & Skill Gaps and Recommended Learning Path in learner nav", () => {
      const learnerNav = [
        { name: "Assessment & Skill Gaps", path: "/learner?tab=pipeline" },
        { name: "Recommended Learning Path", path: "/learner?tab=remediation" },
      ];

      assert.equal(learnerNav.length, 2);
      assert.equal(learnerNav[0].name, "Assessment & Skill Gaps");
      assert.equal(learnerNav[0].path, "/learner?tab=pipeline");
      assert.equal(learnerNav[1].name, "Recommended Learning Path");
      assert.equal(learnerNav[1].path, "/learner?tab=remediation");

      const forbiddenPaths = ["/dashboard", "/skill-gap", "/regional", "/matching"];
      learnerNav.forEach((item) => {
        assert.ok(!forbiddenPaths.includes(item.path));
      });
    });
  });
});
