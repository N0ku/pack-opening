export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => (ms > 0 ? setTimeout(resolve, ms) : resolve()));

export function emit<T>(target: EventTarget, type: string, detail: T): void {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

/** `setPointerCapture` throws if the pointer is already gone (e.g. released mid-frame). */
export function capturePointer(target: Element, pointerId: number): void {
  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Not capturing only means moves outside the element are missed.
  }
}

/** Reads a unitless custom property (e.g. a `number` token), with a fallback. */
export function readNumber(el: Element, name: string, fallback: number): number {
  const value = parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

/** Reads a duration custom property (`420ms`, `1.4s`) in milliseconds, with a fallback. */
export function readDuration(el: Element, name: string, fallback: number): number {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return /\ds$/.test(value) ? parsed * 1000 : parsed;
}

export interface Visibility {
  /** `true` once `threshold` of the element is in the viewport, `false` if cancelled first. */
  promise: Promise<boolean>;
  cancel(): void;
}

/** Waits for an element to come into view. Resolves at once without IntersectionObserver. */
export function whenVisible(el: Element, threshold: number): Visibility {
  if (typeof IntersectionObserver === 'undefined') return { promise: Promise.resolve(true), cancel: () => {} };
  let done: (visible: boolean) => void = () => {};
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= threshold)) done(true);
    },
    { threshold },
  );
  const promise = new Promise<boolean>((resolve) => {
    done = (visible) => {
      observer.disconnect();
      resolve(visible);
    };
  });
  observer.observe(el);
  return { promise, cancel: () => done(false) };
}

/** Edit distance, used to suggest the right name after a typo. */
export function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length]!;
}

/** Closest candidate within `maxDistance` edits, or `null`. */
export function suggest<T extends string>(input: string, candidates: readonly T[], maxDistance = 2): T | null {
  let best: T | null = null;
  let bestDistance = maxDistance + 1;
  for (const candidate of candidates) {
    const distance = levenshtein(input.toLowerCase(), candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

const warned = new WeakMap<object, Set<string>>();

/** `console.warn` once per element and message. */
export function warnOnce(owner: object, message: string): void {
  const seen = warned.get(owner) ?? new Set<string>();
  if (seen.has(message)) return;
  seen.add(message);
  warned.set(owner, seen);
  console.warn(`[pack-opening] ${message}`, owner);
}
