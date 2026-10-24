import type { LockedDirection, TearDirection } from '../types.js';
import { capturePointer, clamp } from '../utils.js';

/** How far the pointer travelled in the tear direction, relative to the pack width. */
export function tearProgress(
  startX: number,
  x: number,
  width: number,
  direction: LockedDirection,
): number {
  if (width <= 0) return 0;
  const delta = direction === 'ltr' ? x - startX : startX - x;
  return clamp(delta / width);
}

/** Decides the tear direction once the pointer has moved past the dead zone. */
export function lockDirection(
  dx: number,
  allowed: TearDirection,
  deadZone = 10,
): LockedDirection | null {
  if (Math.abs(dx) < deadZone) return null;
  const direction: LockedDirection = dx > 0 ? 'ltr' : 'rtl';
  return allowed === 'any' || allowed === direction ? direction : null;
}

export interface TearState {
  /** 0 → 1, only ever grows during a gesture. */
  progress: number;
  /** Cut extents along the tear line, as fractions of the pack width. */
  from: number;
  to: number;
  direction: LockedDirection;
}

export interface TearGestureOptions {
  /** Element whose box the progress is measured against (the pack). */
  surface: HTMLElement;
  /** Pointers that go down inside this element start a tear; a tap there calls `onTap`. */
  zone: HTMLElement;
  /** Whether the gesture listens at all (taps included). */
  enabled(): boolean;
  /** Whether moving the pointer starts a tear. When false, only taps are reported. */
  canSwipe(): boolean;
  direction(): TearDirection;
  threshold(): number;
  onStart(direction: LockedDirection): void;
  onMove(state: TearState): void;
  onComplete(state: TearState): void;
  onCancel(state: TearState): void;
  onTap(): void;
}

const TAP_TOLERANCE = 6;

/** Wires the swipe-to-tear gesture. Returns a function that removes the listeners. */
export function attachTearGesture(o: TearGestureOptions): () => void {
  const { zone } = o;
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let moved = 0;
  let rect = new DOMRect();
  let state: TearState | null = null;

  const fraction = (clientX: number) => clamp((clientX - rect.left) / rect.width);

  const release = () => {
    if (pointerId !== null && zone.hasPointerCapture(pointerId)) zone.releasePointerCapture(pointerId);
    pointerId = null;
    state = null;
  };

  const onDown = (e: PointerEvent) => {
    if (pointerId !== null || !o.enabled()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    moved = 0;
    rect = o.surface.getBoundingClientRect();
    capturePointer(zone, e.pointerId);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.hypot(dx, e.clientY - startY));

    if (!state) {
      if (!o.canSwipe()) return;
      const direction = lockDirection(dx, o.direction());
      if (!direction) return;
      const start = fraction(startX);
      state = { progress: 0, from: start, to: start, direction };
      o.onStart(direction);
    }

    const { direction } = state;
    const x = fraction(e.clientX);
    const progress = Math.max(state.progress, tearProgress(startX, e.clientX, rect.width, direction));
    state =
      direction === 'ltr'
        ? { progress, from: state.from, to: Math.max(state.to, x), direction }
        : { progress, from: Math.min(state.from, x), to: state.to, direction };
    o.onMove(state);

    if (progress >= o.threshold()) {
      const done = state;
      release();
      o.onComplete(done);
    }
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    const pending = state;
    const isTap = e.type === 'pointerup' && moved < TAP_TOLERANCE;
    release();
    if (pending) o.onCancel(pending);
    else if (isTap) o.onTap();
  };

  zone.addEventListener('pointerdown', onDown);
  zone.addEventListener('pointermove', onMove);
  zone.addEventListener('pointerup', onUp);
  zone.addEventListener('pointercancel', onUp);

  return () => {
    release();
    zone.removeEventListener('pointerdown', onDown);
    zone.removeEventListener('pointermove', onMove);
    zone.removeEventListener('pointerup', onUp);
    zone.removeEventListener('pointercancel', onUp);
  };
}
