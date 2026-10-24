// ARIA and text helpers that never overwrite what the user wrote themselves.

const owned = new WeakMap<Element, Set<string>>();
const own = (el: Element, key: string) => {
  const keys = owned.get(el) ?? new Set<string>();
  keys.add(key);
  owned.set(el, keys);
};
const isOwned = (el: Element, key: string) => owned.get(el)?.has(key) ?? false;

/** Sets an attribute unless the user already set it. `null` removes it (if it is ours). */
export function setOwnedAttribute(el: Element, name: string, value: string | null): void {
  if (el.hasAttribute(name) && !isOwned(el, name)) return;
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
  own(el, name);
}

/** Sets the text of an element we created, or of an empty one the user left for us. */
export function setOwnedText(el: Element, text: string): void {
  if (!isOwned(el, '#text') && el.textContent?.trim()) return;
  el.textContent = text;
  own(el, '#text');
}

/** Removes every attribute and text we set (used when unmounting). */
export function clearOwned(el: Element): void {
  for (const key of owned.get(el) ?? []) {
    if (key === '#text') el.textContent = '';
    else el.removeAttribute(key);
  }
  owned.delete(el);
}

/** Hidden from assistive technologies and not focusable. */
export function setInert(el: HTMLElement, inert: boolean): void {
  el.inert = inert;
  if (inert) el.setAttribute('aria-hidden', 'true');
  else el.removeAttribute('aria-hidden');
}

export const hasFocusWithin = (root: Element): boolean => root.contains(document.activeElement);

let uid = 0;
export function ensureId(el: Element, prefix: string): string {
  if (!el.id) {
    el.id = `${prefix}-${++uid}`;
    own(el, 'id');
  }
  return el.id;
}

/** Accessible name of a card's content: aria-label, image alt or text. */
export function describeContent(el: Element): string {
  return (
    el.getAttribute('aria-label') ||
    el.querySelector('[aria-label]')?.getAttribute('aria-label') ||
    (el instanceof HTMLImageElement ? el.alt : el.querySelector('img')?.alt) ||
    el.textContent?.trim() ||
    ''
  );
}
