import { describe, expect, it } from 'vitest';
import { createTearPath, seededRandom } from '../../src/core/geometry/tear-path';
import { lockDirection, tearProgress } from '../../src/core/gestures/tear';

const parsePolygon = (value: string) =>
  value
    .replace(/^polygon\(|\)$/g, '')
    .split(',')
    .map((pair) => pair.trim().split(' ').map(parseFloat) as [number, number]);

describe('createTearPath', () => {
  it('is deterministic for a given seed', () => {
    expect(createTearPath({ line: 0.14, seed: 42 })).toEqual(createTearPath({ line: 0.14, seed: 42 }));
    expect(createTearPath({ line: 0.14, seed: 1 }).top).not.toEqual(
      createTearPath({ line: 0.14, seed: 2 }).top,
    );
  });

  it('spans the full width with alternating teeth around the line', () => {
    const { points } = createTearPath({ line: 0.2, teeth: 8, jitter: 0.02, seed: 7 });
    expect(points).toHaveLength(17);
    expect(points[0]![0]).toBe(0);
    expect(points.at(-1)![0]).toBe(100);
    points.forEach(([, y], i) => {
      expect(Math.abs(y - 20)).toBeLessThanOrEqual(2);
      if (i % 2 === 0) expect(y).toBeLessThan(20);
      else expect(y).toBeGreaterThan(20);
    });
  });

  it('produces complementary clip-paths that share the tear edge', () => {
    const { top, body, points } = createTearPath({ line: 0.14, overlap: 0, seed: 3 });
    const topPoints = parsePolygon(top);
    const bodyPoints = parsePolygon(body);

    expect(topPoints.slice(0, 2)).toEqual([[0, 0], [100, 0]]);
    expect(topPoints.slice(2)).toEqual([...points].reverse());
    expect(bodyPoints.slice(0, -2)).toEqual(points);
    expect(bodyPoints.slice(-2)).toEqual([[100, 100], [0, 100]]);
  });

  it('lets the top strip overlap the body to hide the seam', () => {
    const { top, points } = createTearPath({ line: 0.14, overlap: 0.01, seed: 3 });
    const edge = parsePolygon(top).slice(2).reverse();
    edge.forEach(([, y], i) => expect(y).toBeCloseTo(points[i]![1] + 1, 3));
  });

  it('keeps every vertex inside the pack', () => {
    const { points } = createTearPath({ line: 0.005, jitter: 0.05, seed: 9 });
    points.forEach(([, y]) => expect(y).toBeGreaterThanOrEqual(0));
  });
});

describe('seededRandom', () => {
  it('returns values in [0, 1)', () => {
    const rand = seededRandom(123);
    for (let i = 0; i < 500; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('tearProgress', () => {
  it('measures travel relative to the width in the locked direction', () => {
    expect(tearProgress(100, 250, 300, 'ltr')).toBeCloseTo(0.5);
    expect(tearProgress(400, 250, 300, 'rtl')).toBeCloseTo(0.5);
  });

  it('clamps backwards moves and overshoot', () => {
    expect(tearProgress(100, 50, 300, 'ltr')).toBe(0);
    expect(tearProgress(0, 900, 300, 'ltr')).toBe(1);
    expect(tearProgress(0, 10, 0, 'ltr')).toBe(0);
  });
});

describe('lockDirection', () => {
  it('waits for the dead zone', () => {
    expect(lockDirection(5, 'any')).toBeNull();
    expect(lockDirection(-9, 'any')).toBeNull();
  });

  it('follows the pointer when any direction is allowed', () => {
    expect(lockDirection(12, 'any')).toBe('ltr');
    expect(lockDirection(-12, 'any')).toBe('rtl');
  });

  it('ignores the forbidden direction', () => {
    expect(lockDirection(-30, 'ltr')).toBeNull();
    expect(lockDirection(30, 'rtl')).toBeNull();
    expect(lockDirection(30, 'ltr')).toBe('ltr');
  });
});
