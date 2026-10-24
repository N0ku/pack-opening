import { describe, expect, it } from 'vitest';
import { VIEWS } from '../../src/core/types';
import { parseViewAttribute, resolveView, VIEW_PRESETS, viewToAttribute, viewToRotate } from '../../src/core/view';

type Mat = number[][];
const mul = (a: Mat, b: Mat): Mat => a.map((row) => b[0]!.map((_, j) => row.reduce((sum, v, k) => sum + v * b[k]![j]!, 0)));
const rad = (deg: number) => (deg * Math.PI) / 180;
// Same matrices as CSS rotateX / rotateY / rotateZ.
const rx = (d: number): Mat => [[1, 0, 0], [0, Math.cos(rad(d)), -Math.sin(rad(d))], [0, Math.sin(rad(d)), Math.cos(rad(d))]];
const ry = (d: number): Mat => [[Math.cos(rad(d)), 0, Math.sin(rad(d))], [0, 1, 0], [-Math.sin(rad(d)), 0, Math.cos(rad(d))]];
const rz = (d: number): Mat => [[Math.cos(rad(d)), -Math.sin(rad(d)), 0], [Math.sin(rad(d)), Math.cos(rad(d)), 0], [0, 0, 1]];

/** Matrix of a CSS `rotate: x y z <angle>deg` value (rotate3d). */
function fromRotate(value: string): Mat {
  if (value === 'none') return rx(0);
  const [x, y, z, angle] = value.replace('deg', '').split(' ').map(Number) as [number, number, number, number];
  const c = Math.cos(rad(angle));
  const s = Math.sin(rad(angle));
  const t = 1 - c;
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
  ];
}

const apply = (m: Mat, [x, y, z]: [number, number, number]) => m.map((row) => row[0]! * x + row[1]! * y + row[2]! * z);

describe('viewToRotate', () => {
  it('is the identity for the front view', () => {
    expect(viewToRotate(VIEW_PRESETS.front)).toBe('none');
  });

  it('equals rotateX(-y) rotateY(-x) rotateZ(z)', () => {
    for (const view of [{ x: 30, y: 12, z: -8 }, { x: -45, y: 60, z: 90 }, { x: 0, y: -22, z: 0 }, ...Object.values(VIEW_PRESETS)]) {
      const expected = mul(mul(rx(-view.y), ry(-view.x)), rz(view.z));
      const actual = fromRotate(viewToRotate(view));
      actual.forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(expected[i]![j]!, 3)));
    }
  });

  it('brings the expected edge toward the viewer (+z)', () => {
    const toward = (view: { x: number; y: number; z: number }, point: [number, number, number]) =>
      apply(fromRotate(viewToRotate(view)), point)[2]!;
    expect(toward(VIEW_PRESETS.right, [1, 0, 0])).toBeGreaterThan(0); // right edge
    expect(toward(VIEW_PRESETS.left, [-1, 0, 0])).toBeGreaterThan(0); // left edge
    expect(toward(VIEW_PRESETS.top, [0, -1, 0])).toBeGreaterThan(0); // top edge (CSS y points down)
    expect(toward(VIEW_PRESETS.bottom, [0, 1, 0])).toBeGreaterThan(0); // bottom edge
  });
});

describe('resolveView', () => {
  it('defaults to front and resolves every preset', () => {
    expect(resolveView(undefined)).toEqual({ x: 0, y: 0, z: 0, preset: 'front' });
    for (const view of VIEWS) expect(resolveView(view)).toEqual({ ...VIEW_PRESETS[view], preset: view });
  });

  it('fills missing coordinates and clamps them', () => {
    expect(resolveView({ x: 20 })).toEqual({ x: 20, y: 0, z: 0, preset: null });
    expect(resolveView({ x: 200, y: -200, z: 999 })).toEqual({ x: 75, y: -75, z: 180, preset: null });
    expect(resolveView({ x: Number.NaN })).toEqual({ x: 0, y: 0, z: 0, preset: null });
  });
});

describe('view attribute', () => {
  it('parses presets and coordinates', () => {
    expect(parseViewAttribute('top-right')).toEqual({ view: 'top-right', issue: null });
    expect(parseViewAttribute('20 10')).toEqual({ view: { x: 20, y: 10, z: 0 }, issue: null });
    expect(parseViewAttribute(' 20, -10, 5 ')).toEqual({ view: { x: 20, y: -10, z: 5 }, issue: null });
    expect(parseViewAttribute(null)).toEqual({ view: undefined, issue: null });
  });

  it('reports invalid values with a suggestion', () => {
    const { view, issue } = parseViewAttribute('top-rigth');
    expect(view).toBeUndefined();
    expect(issue).toContain('did you mean "top-right"');
    expect(parseViewAttribute('1 2 3 4').issue).not.toBeNull();
  });

  it('round-trips through the attribute form', () => {
    expect(viewToAttribute('left')).toBe('left');
    expect(viewToAttribute({ x: 20, y: 10 })).toBe('20 10 0');
    expect(parseViewAttribute(viewToAttribute({ x: -5, y: 3, z: 9 })).view).toEqual({ x: -5, y: 3, z: 9 });
  });
});
