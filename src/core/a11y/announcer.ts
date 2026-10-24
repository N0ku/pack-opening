/** Polite live region. Uses the `announcer` part when there is one, otherwise adds its own. */
export class Announcer {
  readonly #el: HTMLElement;
  readonly #owned: boolean;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(root: HTMLElement, existing: HTMLElement | null) {
    this.#owned = !existing;
    this.#el = existing ?? document.createElement('div');
    if (this.#owned) {
      this.#el.dataset.part = 'announcer';
      root.append(this.#el);
    }
    this.#el.setAttribute('aria-live', 'polite');
    this.#el.setAttribute('aria-atomic', 'true');
  }

  announce(message: string): void {
    clearTimeout(this.#timer);
    // Emptying first makes screen readers repeat a message identical to the previous one.
    this.#el.textContent = '';
    this.#timer = setTimeout(() => {
      this.#el.textContent = message;
    }, 50);
  }

  destroy(): void {
    clearTimeout(this.#timer);
    if (this.#owned) this.#el.remove();
    else this.#el.textContent = '';
  }
}
