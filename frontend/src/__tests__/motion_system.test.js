import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { transitions } from '../components/motion/transitions.js';

describe('Motion Design & Animation System Suite', () => {
  describe('1. Transition Curves & Durations Specification', () => {
    it('should define micro transition within 120-180ms for instant interaction', () => {
      assert.ok(transitions.micro);
      assert.ok(transitions.micro.duration >= 0.12 && transitions.micro.duration <= 0.18);
    });

    it('should define normal transition with exponential ease-out curve [0.16, 1, 0.3, 1]', () => {
      assert.ok(transitions.normal);
      assert.deepEqual(transitions.normal.ease, [0.16, 1, 0.3, 1]);
      assert.ok(transitions.normal.duration >= 0.2 && transitions.normal.duration <= 0.26);
    });

    it('should define page transition with duration between 240ms and 300ms', () => {
      assert.ok(transitions.page);
      assert.ok(transitions.page.duration >= 0.24 && transitions.page.duration <= 0.3);
      assert.deepEqual(transitions.page.ease, [0.16, 1, 0.3, 1]);
    });

    it('should define rapid stagger delay for data grids (<= 60ms)', () => {
      assert.ok(transitions.staggerFast <= 0.05);
      assert.ok(transitions.staggerNormal <= 0.08);
    });
  });
});
