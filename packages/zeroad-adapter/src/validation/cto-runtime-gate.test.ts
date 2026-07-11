/**
 * Tests for Story 60.2 — CTO Runtime Gate
 *
 * Verifies:
 * - All 7 capability questions are answered
 * - Readiness score calculation is correct
 * - Blockers are identified
 * - Report is properly formatted
 */

import { describe, it, expect } from 'vitest';
import {
  performCTOGate,
  formatCTOGateReport,
  type CTOGateResult,
} from './cto-runtime-gate.js';

describe('CTO Runtime Gate', () => {
  describe('capability assessment', () => {
    it('should answer all 7 questions', () => {
      const result = performCTOGate();

      expect(result.questions.length).toBe(7);

      // All questions should have answers
      for (const q of result.questions) {
        expect(['YES', 'NO', 'PARTIAL']).toContain(q.answer);
        expect(q.evidence).toBeTruthy();
        expect(q.evidence.length).toBeGreaterThan(20);
      }
    });

    it('should have evidence for each question', () => {
      const result = performCTOGate();

      for (const q of result.questions) {
        // Evidence should be meaningful and substantive (all are)
        expect(q.evidence.length).toBeGreaterThan(30);
      }
    });

    it('should have risks documented for partial answers', () => {
      const result = performCTOGate();

      // Find questions with PARTIAL answers
      const partialQuestions = result.questions.filter(
        (q) => q.answer === 'PARTIAL'
      );

      expect(partialQuestions.length).toBeGreaterThan(0);

      for (const q of partialQuestions) {
        expect(q.risks).toBeDefined();
        expect(q.risks!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('readiness scoring', () => {
    it('should calculate readiness score', () => {
      const result = performCTOGate();

      expect(result.readinessScore).toBeGreaterThanOrEqual(0);
      expect(result.readinessScore).toBeLessThanOrEqual(100);
    });

    it('should score YES = 100%, PARTIAL = 50%, NO = 0%', () => {
      const result = performCTOGate();

      const yesCount = result.questions.filter(
        (q) => q.answer === 'YES'
      ).length;
      const partialCount = result.questions.filter(
        (q) => q.answer === 'PARTIAL'
      ).length;
      const noCount = result.questions.filter(
        (q) => q.answer === 'NO'
      ).length;

      const expectedScore = Math.round(
        (yesCount * 100 + partialCount * 50 + noCount * 0) / 7
      );

      expect(result.readinessScore).toBe(expectedScore);
    });

    it('should approve if score >= 70%', () => {
      const result = performCTOGate();

      // Current assessment should be approved (6 YES + 1 PARTIAL = 78%)
      expect(result.readinessScore).toBeGreaterThanOrEqual(70);
      expect(result.approved).toBe(true);
    });
  });

  describe('blocker identification', () => {
    it('should identify blockers from PARTIAL answers', () => {
      const result = performCTOGate();

      const partialWithBlockers = result.questions.filter(
        (q) => q.answer === 'PARTIAL' && q.blockerIfNo
      );

      // Should have blockers
      expect(partialWithBlockers.length).toBeGreaterThan(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it('should have effort and priority for blockers', () => {
      const result = performCTOGate();

      for (const blocker of result.blockers) {
        expect(['SMALL', 'MEDIUM', 'LARGE']).toContain(blocker.effort);
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(blocker.priority);
        expect(blocker.title).toBeTruthy();
        expect(blocker.question).toBeTruthy();
      }
    });
  });

  describe('report formatting', () => {
    it('should generate readable report', () => {
      const result = performCTOGate();
      const report = formatCTOGateReport(result);

      expect(report.length).toBeGreaterThan(500);
      expect(report).toContain('CTO RUNTIME GATE ASSESSMENT');
      expect(report).toContain('Readiness Score');
      expect(report).toContain('CAPABILITY QUESTIONS');
    });

    it('should include all questions in report', () => {
      const result = performCTOGate();
      const report = formatCTOGateReport(result);

      for (let i = 1; i <= 7; i++) {
        expect(report).toContain(`Q${i}`);
      }
    });

    it('should include blockers section if blockers exist', () => {
      const result = performCTOGate();
      const report = formatCTOGateReport(result);

      if (result.blockers.length > 0) {
        expect(report).toContain('BLOCKERS');
      }
    });

    it('should include next steps', () => {
      const result = performCTOGate();
      const report = formatCTOGateReport(result);

      expect(report).toContain('NEXT STEPS');
    });
  });

  describe('acceptance criteria', () => {
    it('criterion: match completion detection', () => {
      const result = performCTOGate();
      const q = result.questions.find((q) => q.id === '1');

      expect(q).toBeDefined();
      expect(q!.answer).toBe('YES');
      expect(q!.evidence).toContain('player.state');
    });

    it('criterion: failure isolation and recovery', () => {
      const result = performCTOGate();
      const q = result.questions.find((q) => q.id === '2');

      expect(q).toBeDefined();
      expect(q!.answer).toBe('YES');
      expect(q!.evidence).toContain('ArenaSupervisor');
    });

    it('criterion: memory stability validation', () => {
      const result = performCTOGate();
      const q = result.questions.find((q) => q.id === '3');

      expect(q).toBeDefined();
      // Can be YES or PARTIAL (depends on testing)
      expect(['YES', 'PARTIAL']).toContain(q!.answer);
      expect(q!.evidence).toContain('memory leak');
    });

    it('criterion: match variety sufficient', () => {
      const result = performCTOGate();
      const q = result.questions.find((q) => q.id === '4');

      expect(q).toBeDefined();
      expect(q!.answer).toBe('YES');
      expect(q!.evidence).toContain('594');
    });

    it('criterion: failure reporting', () => {
      const result = performCTOGate();
      const q = result.questions.find((q) => q.id === '5');

      expect(q).toBeDefined();
      expect(q!.answer).toBe('YES');
      expect(q!.evidence).toContain('success rate');
    });

    it('criterion: team maintainability', () => {
      const result = performCTOGate();
      const q = result.questions.find((q) => q.id === '6');

      expect(q).toBeDefined();
      expect(q!.answer).toBe('YES');
      // Should reference team size or maintainability aspects
      expect(q!.evidence.length).toBeGreaterThan(50);
    });

    it('criterion: operator deployment', () => {
      const result = performCTOGate();
      const q = result.questions.find((q) => q.id === '7');

      expect(q).toBeDefined();
      // Can be YES or PARTIAL (setup is semi-automated)
      expect(['YES', 'PARTIAL']).toContain(q!.answer);
      // Should mention configuration or deployment aspects
      expect(q!.evidence.length).toBeGreaterThan(50);
    });

    it('criterion: readiness >= 70%', () => {
      const result = performCTOGate();

      expect(result.readinessScore).toBeGreaterThanOrEqual(70);
    });

    it('criterion: documented blockers', () => {
      const result = performCTOGate();

      // Should have blockers documented
      if (result.blockers.length > 0) {
        expect(result.blockers[0].title).toBeTruthy();
        expect(result.blockers[0].effort).toBeTruthy();
        expect(result.blockers[0].priority).toBeTruthy();
      }
    });

    it('criterion: clear approval status', () => {
      const result = performCTOGate();

      expect(typeof result.approved).toBe('boolean');
      expect(result.summary).toContain(result.approved ? 'APPROVED' : 'NOT APPROVED');
    });
  });
});
