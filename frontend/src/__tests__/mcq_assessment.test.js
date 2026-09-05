import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ASSESSMENT_DOMAINS,
  QUESTION_BANK,
  getDomainQuestions,
  simulateBKTUpdate,
} from "../data/assessmentQuestionBank.js";

describe("NSQF MCQ Diagnostic Assessment & BKT Engine Test Suite", () => {
  describe("1. National Occupational Standards (NOS) Domain Registry", () => {
    it("should export configured domains with national codes and NSQF levels", () => {
      assert.ok(ASSESSMENT_DOMAINS.length >= 5);
      ASSESSMENT_DOMAINS.forEach((domain) => {
        assert.ok(domain.id, "Domain must have an id");
        assert.ok(domain.title, "Domain must have a title");
        assert.ok(domain.code, "Domain must have a NOS code");
        assert.ok(domain.sector, "Domain must have a sector");
        assert.ok(domain.nsqfLevel, "Domain must have an NSQF level");
      });
    });

    it("should include Full-Stack, Python, and Data domains", () => {
      const ids = ASSESSMENT_DOMAINS.map((d) => d.id);
      assert.ok(ids.includes("fullstack"));
      assert.ok(ids.includes("python"));
      assert.ok(ids.includes("data"));
    });
  });

  describe("2. MCQ Question Bank Schema Integrity", () => {
    it("should provide valid multiple-choice questions for each domain", () => {
      Object.entries(QUESTION_BANK).forEach(([domain, questions]) => {
        assert.ok(questions.length > 0, `Domain ${domain} should have questions`);

        questions.forEach((q) => {
          assert.ok(q.id, "Question must have an id");
          assert.ok(q.skill_name, "Question must map to a skill competency");
          assert.ok(q.question_text, "Question must have prompt text");
          assert.ok(Array.isArray(q.options) && q.options.length >= 4, "Question must have 4 options");
          assert.ok(q.correct_answer, "Question must have a correct answer");
          assert.ok(
            q.options.includes(q.correct_answer),
            `Correct answer "${q.correct_answer}" must be one of the options in question ${q.id}`
          );
          assert.ok(q.explanation, "Question must provide a pedagogical explanation");
          assert.ok(["EASY", "MEDIUM", "HARD"].includes(q.difficulty), "Difficulty must be valid");
        });
      });
    });

    it("should retrieve limited questions via getDomainQuestions", () => {
      const qList = getDomainQuestions("fullstack", 5);
      assert.equal(qList.length, 5);

      const pyList = getDomainQuestions("python", 8);
      assert.equal(pyList.length, 8);
    });
  });

  describe("3. Bayesian Knowledge Tracing (BKT) Engine Simulation", () => {
    it("should calculate high score and mastery when all answers are correct", () => {
      const testQs = getDomainQuestions("fullstack", 5);
      const answersMap = {};
      testQs.forEach((q) => {
        answersMap[q.id] = q.correct_answer;
      });

      const result = simulateBKTUpdate(testQs, answersMap);
      assert.equal(result.score_percentage, 100);
      assert.equal(result.correct_answers, 5);
      assert.equal(result.passed, true);
      assert.ok(result.readiness_score >= 80, `Expected readiness score >= 80, got ${result.readiness_score}`);

      result.updated_masteries.forEach((m) => {
        assert.ok(m.posterior_mastery > m.prior_mastery, "Mastery should increase upon correct answers");
      });
    });

    it("should handle partial/incorrect answers with calibrated BKT posteriors", () => {
      const testQs = getDomainQuestions("fullstack", 4);
      const answersMap = {};
      // 1 correct, 3 wrong
      answersMap[testQs[0].id] = testQs[0].correct_answer;
      answersMap[testQs[1].id] = "WRONG_ANSWER_A";
      answersMap[testQs[2].id] = "WRONG_ANSWER_B";
      answersMap[testQs[3].id] = "WRONG_ANSWER_C";

      const result = simulateBKTUpdate(testQs, answersMap);
      assert.equal(result.score_percentage, 25);
      assert.equal(result.correct_answers, 1);
      assert.equal(result.passed, false);
      assert.ok(result.readiness_score < 75);
    });
  });
});