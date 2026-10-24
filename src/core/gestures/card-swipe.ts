import { capturePointer } from '../utils.js';

export type CardRelease = 'tap' | 'return' | 'left' | 'right';

export interface CardSwipeOptions {
  /** Element that receives the pointer events (the cards container). */
  container: HTMLElement;
  /** Card that can be dragged or tapped right now, if any. */
  topCard(): HTMLElement | null;
  /** Whether the card follows the pointer (feature on, card face up). Taps always count. */
  canDrag(card: HTMLElement): boolean;
  onDrag(card: HTMLElement, dx: number): void;
  onRelease(card: HTMLElement, outcome: CardRelease): void;
}

const TAP_TOLERANCE = 8;
const FLING_VELOCITY = 0.6; // px/ms
const DISMISS_DISTANCE = 0.3; // share of the card width

interface Drag {
  id: number;
  card: HTMLElement;
  x0: number;
  y0: number;
  dx: number;
  moved: number;
  lastX: number;
  lastT: number;
  velocity: number;
}

/** Tap, drag and fling on the top card. Returns a function that removes the listeners. */
export function attachCardSwipe(o: CardSwipeOptions): () => void {
  const { container } = o;
  let drag: Drag | null = null;

  const onDown = (e: PointerEvent) => {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const card = o.topCard();
    if (!card?.contains(e.target as Node)) return;
    const now = performance.now();
    drag = { id: e.pointerId, card, x0: e.clientX, y0: e.clientY, dx: 0, moved: 0, lastX: e.clientX, lastT: now, velocity: 0 };
    capturePointer(container, e.pointerId);
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now();
    drag.dx = e.clientX - drag.x0;
    drag.moved = Math.max(drag.moved, Math.hypot(drag.dx, e.clientY - drag.y0));
    if (now > drag.lastT) drag.velocity = (e.clientX - drag.lastX) / (now - drag.lastT);
    drag.lastX = e.clientX;
    drag.lastT = now;
    if (o.canDrag(drag.card)) o.onDrag(drag.card, drag.dx);
  };

  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { card, moved, dx, velocity } = drag;
    drag = null;
    if (container.hasPointerCapture(e.pointerId)) container.releasePointerCapture(e.pointerId);

    if (e.type === 'pointercancel') return o.onRelease(card, 'return');
    if (moved < TAP_TOLERANCE) return o.onRelease(card, 'tap');
    if (!o.canDrag(card)) return o.onRelease(card, 'return');

    const flung = Math.abs(velocity) > FLING_VELOCITY;
    if (flung || Math.abs(dx) > card.offsetWidth * DISMISS_DISTANCE) {
      o.onRelease(card, (flung ? velocity : dx) > 0 ? 'right' : 'left');
    } else {
      o.onRelease(card, 'return');
    }
  };

  container.addEventListener('pointerdown', onDown);
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerup', onUp);
  container.addEventListener('pointercancel', onUp);
  return () => {
    drag = null;
    container.removeEventListener('pointerdown', onDown);
    container.removeEventListener('pointermove', onMove);
    container.removeEventListener('pointerup', onUp);
    container.removeEventListener('pointercancel', onUp);
  };
}
