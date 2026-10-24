import { wait } from './utils.js';

/**
 * Finite animations and transitions currently running on `targets` and their descendants.
 * `getAnimations()` flushes styles first, so animations started by an attribute change
 * made just before are included. Looping animations (hint glint, holo) are ignored.
 */
export function runningAnimations(targets: readonly Element[]): Animation[] {
  return targets
    .flatMap((target) => target.getAnimations({ subtree: true }))
    .filter((animation) => {
      if (animation.playState === 'finished' || animation.playState === 'idle') return false;
      const end = animation.effect?.getComputedTiming().endTime;
      return typeof end === 'number' && Number.isFinite(end);
    });
}

/**
 * Waits until the animations of `targets` are done. Motion lives in CSS: when a theme removes
 * an animation there is simply nothing to wait for, and `timeout` guards against stuck ones.
 */
export async function waitForAnimations(targets: readonly Element[], timeout: number): Promise<void> {
  const animations = runningAnimations(targets);
  if (!animations.length) return;
  await Promise.race([Promise.all(animations.map((a) => a.finished.catch(() => undefined))), wait(timeout)]);
}

/** Forces a style recalculation so that values set before a transition are committed. */
export function commitStyles(el: Element): void {
  void getComputedStyle(el).getPropertyValue('--po-progress');
}
