import { PackOpeningElement } from './pack-opening-element.js';

/** Registers `<pack-opening>`. Safe to call several times (and during SSR, where it does nothing). */
export function definePackOpening(): void {
  if (typeof customElements !== 'undefined' && !customElements.get('pack-opening')) {
    customElements.define('pack-opening', PackOpeningElement);
  }
}
