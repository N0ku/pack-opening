import { expect, waitFor } from 'storybook/test';
import type { PackOpeningElement } from '../src/element/pack-opening-element';
import type { PackState, Part } from '../src/core/types';

export function getPack(canvasElement: HTMLElement): PackOpeningElement {
  const el = canvasElement.querySelector('pack-opening');
  if (!el) throw new Error('No <pack-opening> in the story');
  return el;
}

export const part = (root: Element, name: Part): HTMLElement => {
  const el = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!el) throw new Error(`No [data-part="${name}"]`);
  return el;
};

export const waitForState = (el: PackOpeningElement, state: PackState, timeout = 6000) =>
  waitFor(() => expect(el.state).toBe(state), { timeout });

export const waitForMount = (el: PackOpeningElement) => waitFor(() => expect(el.dataset.state).toBeDefined());

/** Drags a mouse pointer along the tear zone, from `from` to `to` (fractions of its width). */
export async function swipe(el: PackOpeningElement, from: number, to: number, steps = 8): Promise<void> {
  const zone = part(el, 'tear-zone');
  const rect = zone.getBoundingClientRect();
  const y = rect.top + rect.height / 2;
  const at = (t: number) => rect.left + rect.width * t;
  const fire = (type: string, x: number) =>
    zone.dispatchEvent(
      new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1 }),
    );
  fire('pointerdown', at(from));
  for (let i = 1; i <= steps; i++) {
    fire('pointermove', at(from + ((to - from) * i) / steps));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  fire('pointerup', at(to));
}

/** Records the elements added under `target` while `run` executes. */
export async function recordAdded(target: Element, run: () => Promise<void>): Promise<Element[]> {
  const added: Element[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) added.push(node);
  });
  observer.observe(target, { childList: true, subtree: true });
  await run();
  observer.disconnect();
  return added;
}
