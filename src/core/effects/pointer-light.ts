import { clamp } from '../utils.js';

const VARS = ['--po-pointer-x', '--po-pointer-y'] as const;

/**
 * Tracks the mouse over the pack for the `tilt` and `shine` features. Writes only
 * `--po-pointer-x` / `--po-pointer-y` (0–1) and `data-hover`; the theme turns them into motion.
 */
export function attachPointerLight(pack: HTMLElement, isActive: () => boolean): () => void {
  const reset = () => {
    delete pack.dataset.hover;
    for (const name of VARS) pack.style.removeProperty(name);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !isActive()) return;
    const rect = pack.getBoundingClientRect();
    pack.dataset.hover = '';
    pack.style.setProperty('--po-pointer-x', clamp((e.clientX - rect.left) / rect.width).toFixed(3));
    pack.style.setProperty('--po-pointer-y', clamp((e.clientY - rect.top) / rect.height).toFixed(3));
  };

  pack.addEventListener('pointermove', onMove);
  pack.addEventListener('pointerleave', reset);
  return () => {
    pack.removeEventListener('pointermove', onMove);
    pack.removeEventListener('pointerleave', reset);
    reset();
  };
}

export function clearPointerLight(pack: HTMLElement): void {
  delete pack.dataset.hover;
  for (const name of VARS) pack.style.removeProperty(name);
}
