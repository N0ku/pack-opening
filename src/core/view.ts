import {
  VIEWS,
  type ResolvedView,
  type ViewCoordinates,
  type ViewInput,
  type ViewPreset,
} from './types.js';
import { clamp, suggest } from './utils.js';

/** Coordinates of every preset. Spread one to adjust it: `{ ...VIEW_PRESETS.right, y: 12 }`. */
export const VIEW_PRESETS: Readonly<Record<ViewPreset, Readonly<ViewCoordinates>>> = Object.freeze({
  front: { x: 0, y: 0, z: 0 },
  top: { x: 0, y: 22, z: 0 },
  bottom: { x: 0, y: -22, z: 0 },
  left: { x: -24, y: 0, z: 0 },
  right: { x: 24, y: 0, z: 0 },
  'top-left': { x: -20, y: 14, z: 0 },
  'top-right': { x: 20, y: 14, z: 0 },
  'bottom-left': { x: -20, y: -14, z: 0 },
  'bottom-right': { x: 20, y: -14, z: 0 },
});

/** Beyond ±75° the pack is seen almost edge-on (and past 90° from behind). */
export const VIEW_LIMITS: Readonly<ViewCoordinates> = Object.freeze({ x: 75, y: 75, z: 180 });

export const isViewPreset = (value: unknown): value is ViewPreset =>
  typeof value === 'string' && (VIEWS as readonly string[]).includes(value);

const toNumber = (value: unknown, limit: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? clamp(value, -limit, limit) : 0;

export function resolveView(input: ViewInput | null | undefined): ResolvedView {
  if (input === null || input === undefined) return { ...VIEW_PRESETS.front, preset: 'front' };
  if (isViewPreset(input)) return { ...VIEW_PRESETS[input], preset: input };
  return {
    x: toNumber(input.x, VIEW_LIMITS.x),
    y: toNumber(input.y, VIEW_LIMITS.y),
    z: toNumber(input.z, VIEW_LIMITS.z),
    preset: null,
  };
}

export interface ViewAttributeResult {
  view: ViewInput | undefined;
  issue: string | null;
}

/** `"right"`, `"20 10"`, `"20, 10, -5"`. */
export function parseViewAttribute(value: string | null): ViewAttributeResult {
  const text = value?.trim() ?? '';
  if (!text) return { view: undefined, issue: null };
  if (isViewPreset(text)) return { view: text, issue: null };

  const parts = text.split(/[\s,]+/);
  const numbers = parts.map(Number);
  if (parts.length <= 3 && numbers.every(Number.isFinite)) {
    const [x = 0, y = 0, z = 0] = numbers;
    return { view: { x, y, z }, issue: null };
  }
  const hint = suggest(text, VIEWS);
  return {
    view: undefined,
    issue:
      `view="${text}" is not valid. Use a preset (${VIEWS.join(' | ')}) or coordinates in degrees, e.g. "20 10"` +
      `${hint ? ` (did you mean "${hint}"?)` : ''}.`,
  };
}

/**
 * Attribute form of a view: the preset name, or `"x y z"`. Strings are kept as they are (frameworks
 * such as React 19 and Vue set the property with the attribute value); the attribute parser
 * validates them.
 */
export function viewToAttribute(view: ViewInput | string): string {
  if (typeof view === 'string') return view.trim();
  const { x, y, z } = resolveView(view);
  return `${x} ${y} ${z}`;
}

type Quaternion = readonly [w: number, x: number, y: number, z: number];

const axisAngle = (axis: 0 | 1 | 2, degrees: number): Quaternion => {
  const half = (degrees * Math.PI) / 360;
  const q: [number, number, number, number] = [Math.cos(half), 0, 0, 0];
  q[axis + 1] = Math.sin(half);
  return q;
};

const multiply = ([aw, ax, ay, az]: Quaternion, [bw, bx, by, bz]: Quaternion): Quaternion => [
  aw * bw - ax * bx - ay * by - az * bz,
  aw * bx + ax * bw + ay * bz - az * by,
  aw * by - ax * bz + ay * bw + az * bx,
  aw * bz + ax * by - ay * bx + az * bw,
];

const round = (n: number, digits: number) => {
  const value = Number(n.toFixed(digits));
  return Object.is(value, -0) ? 0 : value;
};

/**
 * The view as a value of the CSS `rotate` property (`"ax ay az <angle>deg"`, or `"none"`).
 * Same as `transform: rotateX(-y) rotateY(-x) rotateZ(z)`, but as a single rotation so that it adds
 * up with the tilt and the phase animations, which use `transform`.
 */
export function viewToRotate({ x, y, z }: ViewCoordinates): string {
  // CSS: rotateY(−θ) brings the right edge forward, rotateX(−θ) the top edge.
  const [w, qx, qy, qz] = multiply(multiply(axisAngle(0, -y), axisAngle(1, -x)), axisAngle(2, z));
  const angle = 2 * Math.acos(clamp(w, -1, 1));
  const s = Math.sqrt(Math.max(0, 1 - w * w));
  if (s < 1e-6) return 'none';
  return `${round(qx / s, 4)} ${round(qy / s, 4)} ${round(qz / s, 4)} ${round((angle * 180) / Math.PI, 3)}deg`;
}
