import { hasFocusWithin, setInert, setOwnedAttribute } from './a11y/dom.js';
import type { CardRelease } from './gestures/card-swipe.js';
import type { CardParts } from './parts.js';
import { waitForAnimations } from './phases.js';
import type { CardInfo, PackOpeningLabels } from './types.js';
import { clamp } from './utils.js';

export interface CardRevealHost {
  root: HTMLElement;
  /** The cards container: receives `--po-remaining` (cards left in the deck). */
  container: HTMLElement;
  cards: readonly CardParts[];
  maxDepth(): number;
  timeout(): number;
  labels(): PackOpeningLabels;
  info(index: number): CardInfo;
  /** `silent`: revealed by `revealAll()`, so no announcement per card. */
  onReveal(index: number, silent: boolean): void;
  /** A face-down card starts turning over. */
  onFlip(index: number): void;
  /** The top card starts leaving the deck. */
  onLeave(index: number, direction: 1 | -1): void;
  onDone(hadFocus: boolean): void;
}

const CARD_VARS = ['--po-depth', '--po-drag-x', '--po-drag-ratio'] as const;
const CARD_DATA = ['stack', 'face', 'revealed', 'leaving', 'dragging'] as const;

/** Removes everything the reveal wrote on a card (also used when unmounting). */
export function cleanCard(card: HTMLElement): void {
  for (const key of CARD_DATA) delete card.dataset[key];
  for (const name of CARD_VARS) card.style.removeProperty(name);
  card.style.removeProperty('--po-index');
  setInert(card, false);
  for (const name of ['role', 'tabindex', 'aria-label']) setOwnedAttribute(card, name, null);
}

/**
 * The stack of cards once the pack is open. State lives in data attributes
 * (`data-stack`, `data-face`, `data-revealed`, `data-leaving`, `data-dragging`) and CSS variables;
 * every movement is a CSS transition or animation this class waits for.
 */
export class CardReveal {
  readonly #host: CardRevealHost;
  #index = 0;
  #busy = false;

  constructor(host: CardRevealHost) {
    this.#host = host;
    host.cards.forEach(({ card, back }, i) => {
      cleanCard(card);
      card.style.setProperty('--po-index', String(i));
      if (back) card.dataset.face = 'down';
      setInert(card, true);
    });
  }

  get top(): CardParts | null {
    return this.#host.cards[this.#index] ?? null;
  }

  get busy(): boolean {
    return this.#busy;
  }

  start(): void {
    this.#layout();
    this.#revealIfFaceUp();
  }

  /** Flips the top card if it is face down, otherwise sends it away. */
  async next(direction: 1 | -1 = 1): Promise<void> {
    const top = this.top;
    if (this.#busy || !top) return;
    if (top.card.dataset.face === 'down') return this.#flip(top);
    return this.#dismiss(top, direction);
  }

  /** Reveals every remaining card at once. */
  all(): void {
    const hadFocus = hasFocusWithin(this.#host.root);
    const { cards } = this.#host;
    for (let i = this.#index; i < cards.length; i++) {
      const { card } = cards[i]!;
      if (card.dataset.face === 'down') card.dataset.face = 'up';
      if (!('revealed' in card.dataset)) this.#markRevealed(i, true);
      card.dataset.stack = 'gone';
      delete card.dataset.leaving;
      delete card.dataset.dragging;
    }
    this.#index = cards.length;
    this.#busy = false;
    this.#layout();
    this.#host.onDone(hadFocus);
  }

  drag(card: HTMLElement, dx: number): void {
    card.dataset.dragging = '';
    card.style.setProperty('--po-drag-x', `${dx.toFixed(1)}px`);
    card.style.setProperty('--po-drag-ratio', (dx / (card.offsetWidth || 1)).toFixed(3));
  }

  release(card: HTMLElement, outcome: CardRelease): void {
    delete card.dataset.dragging;
    if (outcome === 'tap') {
      void this.next(1);
    } else if (outcome === 'return') {
      // Back to 0: the theme's transition on `transform` brings the card home.
      card.style.setProperty('--po-drag-x', '0px');
      card.style.setProperty('--po-drag-ratio', '0');
    } else {
      const top = this.top;
      if (top?.card === card) void this.#dismiss(top, outcome === 'left' ? -1 : 1);
    }
  }

  /** Re-applies the accessible names (e.g. after a locale change). */
  refresh(): void {
    this.#layout();
  }

  #layout(): void {
    const { cards, labels, info, maxDepth } = this.#host;
    const strings = labels();
    const depthLimit = maxDepth();
    this.#host.container.style.setProperty('--po-remaining', String(Math.max(0, cards.length - this.#index)));
    cards.forEach(({ card }, i) => {
      const depth = i - this.#index;
      const isTop = depth === 0;
      card.dataset.stack = depth < 0 ? 'gone' : isTop ? 'top' : 'below';
      card.style.setProperty('--po-depth', String(clamp(depth, 0, depthLimit)));
      setInert(card, !isTop);
      setOwnedAttribute(card, 'role', isTop ? 'button' : null);
      setOwnedAttribute(card, 'tabindex', isTop ? '0' : null);
      const name = isTop ? (card.dataset.face === 'down' ? strings.flipCard(info(i)) : strings.nextCard(info(i))) : null;
      setOwnedAttribute(card, 'aria-label', name);
    });
  }

  #revealIfFaceUp(): void {
    const top = this.top;
    if (!top || top.card.dataset.face === 'down' || 'revealed' in top.card.dataset) return;
    this.#markRevealed(this.#index, false);
    this.#layout();
  }

  #markRevealed(index: number, silent: boolean): void {
    this.#host.cards[index]!.card.dataset.revealed = '';
    this.#host.onReveal(index, silent);
  }

  async #flip(top: CardParts): Promise<void> {
    this.#busy = true;
    top.card.dataset.face = 'up';
    this.#host.onFlip(this.#index);
    await waitForAnimations([top.flip], this.#host.timeout());
    this.#busy = false;
    if (this.top !== top) return;
    this.#markRevealed(this.#index, false);
    this.#layout();
  }

  async #dismiss(top: CardParts, direction: 1 | -1): Promise<void> {
    const { root, cards } = this.#host;
    const hadFocus = hasFocusWithin(root);
    this.#busy = true;
    delete top.card.dataset.dragging;
    top.card.dataset.leaving = direction < 0 ? 'left' : 'right';
    this.#host.onLeave(this.#index, direction);
    await waitForAnimations([top.card], this.#host.timeout());
    if (this.top !== top) return;

    top.card.dataset.stack = 'gone';
    delete top.card.dataset.leaving;
    top.card.style.setProperty('--po-drag-x', '0px');
    top.card.style.setProperty('--po-drag-ratio', '0');
    this.#index++;
    this.#busy = false;
    this.#layout();

    if (this.#index >= cards.length) {
      this.#host.onDone(hadFocus);
      return;
    }
    this.#revealIfFaceUp();
    if (hadFocus) this.top?.card.focus({ preventScroll: true });
  }
}
