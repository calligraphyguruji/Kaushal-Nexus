import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ALL_INTERNSHIPS,
  INTERNSHIP_DOMAINS,
  calculateInternshipMatch,
  queryInternships,
} from "../data/internshipsData.js";
import { internshipsApi } from "../api/internships.js";

// Polyfill localStorage for Node.js test environment if absent
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

describe("KaushalNexus Dynamic Internship Directory & Matching Engine Test Suite", () => {
  describe("1. Dataset Invariant: 10+ Internships Per Domain Interest", () => {
    it("should provide at least 9 distinct interest tracks", () => {
      assert.ok(INTERNSHIP_DOMAINS.length >= 9, "Expected at least 9 domain tracks");
    });

    it("should guarantee every interest track contains at least 10+ verified internships", () => {
      INTERNSHIP_DOMAINS.forEach((domain) => {
        const domainId = domain.id;
        const matches = ALL_INTERNSHIPS.filter((i) => i.interest === domainId);
        assert.ok(
          matches.length >= 10,
          `Track '${domainId}' (${domain.label}) has ${matches.length} internships, expected at least 10+`
        );
      });
    });

    it("should have total internships exceeding 90+ openings", () => {
      assert.ok(
        ALL_INTERNSHIPS.length >= 90,
        `Expected at least 90 total internships across all domains, found ${ALL_INTERNSHIPS.length}`
      );
    });

    it("should validate all internship objects conform to schema invariants", () => {
      ALL_INTERNSHIPS.forEach((item) => {
        assert.ok(item.id, "Internship must have an id");
        assert.ok(item.interest, "Internship must have an interest domain");
        assert.ok(item.title, "Internship must have a title");
        assert.ok(item.company, "Internship must have a company");
        assert.ok(item.location, "Internship must have a location");
        assert.ok(["Remote", "Hybrid", "On-site"].includes(item.workMode), "Work mode must be valid");
        assert.ok(item.stipendInr >= 15000, "Stipend should be at least ₹15,000 / month");
        assert.ok(Array.isArray(item.requiredSkills) && item.requiredSkills.length > 0, "Must have required skills");
        assert.ok(item.openings >= 1, "Must have at least 1 opening");
        assert.ok(item.nsqfLevel, "Must specify NSQF level");
      });
    });
  });

  describe("2. Dynamic Competency & Skill Match Calculation", () => {
    it("should award high match score when candidate skills align with required competencies", () => {
      const sample = ALL_INTERNSHIPS.find((i) => i.interest === "fullstack");
      const learner = {
        target_domain: "fullstack",
        employment_readiness_score: 85,
        masteries: [
          { skill_name: "React State Architecture", is_mastered: true, posterior_mastery: 0.9 },
          { skill_name: "REST API Design", is_mastered: true, posterior_mastery: 0.88 },
          { skill_name: "SQL & Relational DBs", is_mastered: true, posterior_mastery: 0.82 },
        ],
      };

      const result = calculateInternshipMatch(sample, learner, []);
      assert.ok(result.matchScore >= 80, `Expected matchScore >= 80, got ${result.matchScore}`);
      assert.equal(result.isPrimaryInterest, true);
      assert.ok(result.matchedSkills.length > 0);
      assert.equal(result.missingSkills.length, 0);
    });

    it("should detect missing competencies when candidate has active skill gaps", () => {
      const sample = ALL_INTERNSHIPS.find((i) => i.id === "int-fs-01");
      const learner = {
        target_domain: "fullstack",
        employment_readiness_score: 55,
      };
      const activeGaps = [
        { skill_name: "REST API Design", severity: "HIGH" },
      ];

      const result = calculateInternshipMatch(sample, learner, activeGaps);
      assert.ok(result.missingSkills.includes("REST API Design"));
      assert.ok(result.matchScore < 90);
    });

    it("should differentiate primary domain track from secondary tracks", () => {
      const fsInternship = ALL_INTERNSHIPS.find((i) => i.interest === "fullstack");
      const pyInternship = ALL_INTERNSHIPS.find((i) => i.interest === "python");

      const fsLearner = { target_domain: "fullstack", employment_readiness_score: 70 };

      const fsMatch = calculateInternshipMatch(fsInternship, fsLearner);
      const pyMatch = calculateInternshipMatch(pyInternship, fsLearner);

      assert.equal(fsMatch.isPrimaryInterest, true);
      assert.equal(pyMatch.isPrimaryInterest, false);
      assert.ok(fsMatch.matchScore > pyMatch.matchScore);
    });
  });

  describe("3. Multi-Criteria Querying & Filtering Engine", () => {
    it("should filter internships by interest track", () => {
      const fullstackOnly = queryInternships({ interest: "fullstack" });
      assert.ok(fullstackOnly.length >= 10);
      fullstackOnly.forEach((item) => {
        assert.equal(item.interest, "fullstack");
      });

      const pythonOnly = queryInternships({ interest: "python" });
      assert.ok(pythonOnly.length >= 10);
      pythonOnly.forEach((item) => {
        assert.equal(item.interest, "python");
      });

      const dataOnly = queryInternships({ interest: "data" });
      assert.ok(dataOnly.length >= 10);
      dataOnly.forEach((item) => {
        assert.equal(item.interest, "data");
      });
    });

    it("should filter internships by work mode", () => {
      const remote = queryInternships({ workMode: "Remote" });
      assert.ok(remote.length > 0);
      remote.forEach((item) => {
        assert.equal(item.workMode.toLowerCase(), "remote");
      });
    });

    it("should filter internships by minimum stipend", () => {
      const highStipend = queryInternships({ minStipend: 35000 });
      assert.ok(highStipend.length > 0);
      highStipend.forEach((item) => {
        assert.ok(item.stipendInr >= 35000);
      });
    });

    it("should search internships by keyword in company, role, and skills", () => {
      const razorpay = queryInternships({ search: "Razorpay" });
      assert.ok(razorpay.length >= 1);
      assert.ok(razorpay[0].company.includes("Razorpay"));

      const pythonSkillSearch = queryInternships({ search: "FastAPI" });
      assert.ok(pythonSkillSearch.length >= 1);
    });

    it("should sort internships by stipend descending", () => {
      const sorted = queryInternships({ sortBy: "stipend" });
      assert.ok(sorted.length > 1);
      assert.ok(sorted[0].stipendInr >= sorted[1].stipendInr);
    });
  });

  describe("4. API Client & Local Fallback Layer", () => {
    it("should return domain summaries with at least 10 openings each via getDomains", async () => {
      const domains = await internshipsApi.getDomains();
      assert.ok(domains.length >= 9);
      domains.forEach((d) => {
        assert.ok(d.total_openings_count >= 10);
        assert.equal(d.has_minimum_ten, true);
      });
    });

    it("should retrieve single internship by id via getById", async () => {
      const item = await internshipsApi.getById("int-fs-01");
      assert.equal(item.id, "int-fs-01");
      assert.equal(item.company, "Razorpay Software Pvt Ltd");
    });

    it("should throw error for non-existent internship id", async () => {
      await assert.rejects(async () => {
        await internshipsApi.getById("invalid-id-xyz-999");
      });
    });

    it("should support candidate application submission via applyToInternship", async () => {
      const submission = await internshipsApi.applyToInternship("int-fs-01", {
        learner_id: "KN-2026-UNITTEST",
        learner_name: "Test Candidate",
        learner_email: "test@example.com",
        cover_note: "Test application submission",
      });

      assert.ok(submission.application_id);
      assert.equal(submission.internship_id, "int-fs-01");
      assert.equal(submission.status, "SUBMITTED");

      // Verify stored applications
      const myApps = internshipsApi.getMyApplications();
      assert.ok(myApps.length > 0);
      assert.ok(myApps.some((a) => a.internship_id === "int-fs-01"));
    });
  });
});
