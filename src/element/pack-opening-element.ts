import { PackOpeningController } from '../core/controller.js';
import { detectLocale } from '../core/labels.js';
import { resolveOptions } from '../core/options.js';
import { partSelector, queryParts } from '../core/parts.js';
import { registeredEffects } from '../core/effects/registry.js';
import { toFeature, toFeatureToken } from '../core/features.js';
import {
  FX_FEATURES,
  type Feature,
  type FeatureToken,
  type FxColor,
  type Locale,
  type LockedDirection,
  type Mode,
  type Motion,
  type PackOpeningApi,
  type PackOpeningEventMap,
  type PackOpeningInit,
  type PackState,
  type Preset,
  type ResolvedOptions,
  type TearDirection,
  type ViewInput,
} from '../core/types.js';
import { viewToAttribute } from '../core/view.js';
import { emit, warnOnce } from '../core/utils.js';
import { renderAuto, type AutoRender } from '../dom/render.js';
import { OBSERVED_ATTRIBUTES, STRUCTURAL_ATTRIBUTES, readAttributes, type PackOpeningAttribute } from './attributes.js';

// Lets the module be imported during SSR without crashing on `HTMLElement`.
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** A feature list as a property value: `['sparks', 'card-swipe']` or `"sparks card-swipe"`. */
export type FeatureList = string | readonly (Feature | FeatureToken)[];

const listToAttribute = (value: FeatureList | null): string | null => {
  if (value === null || typeof value === 'string') return value;
  // Unknown names are kept so that the attribute parser reports them.
  return value.map((item) => { const feature = toFeature(item); return feature ? toFeatureToken(feature) : item; }).join(' ');
};

/**
 * Booster pack opening: swipe across the top to tear it open, then flip and swipe through the cards.
 *
 * @tag pack-opening
 * @summary Animated booster pack opening, with an auto and a headless mode.
 *
 * @attr {'auto' | 'headless'} mode - `auto` builds the structure from `[data-pack]` and `[data-card]` children; `headless` uses the parts you wrote. Default `auto`.
 * @attr {'full' | 'minimal' | 'none'} preset - Starting set of features. Default `full`.
 * @attr {string} enable - Space-separated features to turn on, e.g. `"burst rarity"`.
 * @attr {string} disable - Space-separated features to turn off, e.g. `"sparks tilt haptics"`. Wins over `enable`.
 * @attr {'any' | 'ltr' | 'rtl'} tear-direction - Allowed swipe direction. Default `any`.
 * @attr {number} tear-threshold - Share of the pack width to swipe across (0.2–1). Default `0.75`.
 * @attr {string} card-back - Image of the card backs. Cards then come out face down and flip on tap.
 * @attr {'front' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | string} view - Angle the pack is seen from: a preset, or coordinates in degrees `"x y z"` (x > 0 shows the right side, y > 0 the top, z rolls it). Default `front`.
 * @attr {number} speed - Speed multiplier of every animation. Default `1`.
 * @attr {'auto' | 'reduce'} motion - `reduce` removes the animations even without `prefers-reduced-motion`.
 * @attr {'en' | 'fr'} locale - Language of the built-in texts. Default: closest `lang`, else `en`.
 * @attr {string} fx-color - Colour of the magic effects (`pack-opening/magic`): a CSS colour, or several separated by spaces or commas.
 *
 * @fires {CustomEvent<{ state: PackState; previous: PackState }>} po-state-change - The state changed.
 * @fires {CustomEvent<{ direction: LockedDirection }>} po-tear-start - A tear started.
 * @fires {CustomEvent<{ progress: number }>} po-tear-progress - The tear progressed (0–1).
 * @fires {CustomEvent<{ progress: number }>} po-tear-cancel - The swipe stopped too early; the pack closed back.
 * @fires {CustomEvent<{ total: number }>} po-opened - The strip has just been torn off.
 * @fires {CustomEvent<CardInfo & { card: HTMLElement; value: string | null }>} po-card-reveal - A card is now face up.
 * @fires {CustomEvent<{ cards: HTMLElement[] }>} po-complete - Every card has been seen.
 */
export class PackOpeningElement extends Base implements PackOpeningApi {
  static readonly observedAttributes: readonly PackOpeningAttribute[] = OBSERVED_ATTRIBUTES;

  #init: PackOpeningInit = {};
  #controller: PackOpeningController | null = null;
  #auto: AutoRender | null = null;
  #observer: MutationObserver | null = null;
  #media: MediaQueryList | null = null;
  #pendingReset = false;

  /**
   * Options set from JS (they win over attributes). Reading it returns the resolved options:
   * defaults, preset, lists, locale and reduced motion applied.
   */
  get options(): ResolvedOptions {
    return this.#resolve();
  }

  set options(init: PackOpeningInit) {
    const structural = (init.cardBack ?? null) !== (this.#init.cardBack ?? null);
    this.#init = { ...init };
    if (structural) this.reset();
    else this.#controller?.update(this.#resolve());
  }

  // Properties reflect their attribute, so frameworks that set properties (React 19, Vue) and
  // plain JS (`el.preset = 'minimal'`) behave like the HTML attributes.

  get mode(): Mode {
    return readAttributes(this).mode;
  }
  set mode(value: Mode | null) {
    this.#reflect('mode', value);
  }

  get preset(): Preset | null {
    return readAttributes(this).init.preset ?? null;
  }
  set preset(value: Preset | null) {
    this.#reflect('preset', value);
  }

  /** Features turned on by the `enable` attribute. Set it with a list or a space-separated string. */
  get enable(): Feature[] {
    return readAttributes(this).enable;
  }
  set enable(value: FeatureList | null) {
    this.#reflect('enable', listToAttribute(value));
  }

  /** Features turned off by the `disable` attribute. */
  get disable(): Feature[] {
    return readAttributes(this).disable;
  }
  set disable(value: FeatureList | null) {
    this.#reflect('disable', listToAttribute(value));
  }

  get tearDirection(): TearDirection | null {
    return readAttributes(this).init.tearDirection ?? null;
  }
  set tearDirection(value: TearDirection | null) {
    this.#reflect('tear-direction', value);
  }

  get tearThreshold(): number | null {
    return readAttributes(this).init.tearThreshold ?? null;
  }
  set tearThreshold(value: number | null) {
    this.#reflect('tear-threshold', value);
  }

  get cardBack(): string | null {
    return this.getAttribute('card-back');
  }
  set cardBack(value: string | null) {
    this.#reflect('card-back', value);
  }

  /** A preset (`"right"`) or coordinates (`{ x: 20, y: 10 }`); reflected as `view="right"` / `view="20 10 0"`. */
  get view(): ViewInput | null {
    return readAttributes(this).init.view ?? null;
  }
  set view(value: ViewInput | string | null) {
    this.#reflect('view', value === null ? null : viewToAttribute(value));
  }

  get speed(): number | null {
    return readAttributes(this).init.speed ?? null;
  }
  set speed(value: number | null) {
    this.#reflect('speed', value);
  }

  get motion(): Motion | null {
    return readAttributes(this).init.motion ?? null;
  }
  set motion(value: Motion | null) {
    this.#reflect('motion', value);
  }

  get locale(): Locale | null {
    return readAttributes(this).init.locale ?? null;
  }
  set locale(value: Locale | null) {
    this.#reflect('locale', value);
  }

  /** Colour(s) of the magic effects; a list is reflected as `fx-color="#b968ff, #6fd8ff"`. Per effect: `options.fxColors`. */
  get fxColor(): string | null {
    return this.getAttribute('fx-color');
  }
  set fxColor(value: FxColor | null) {
    this.#reflect('fx-color', value === null || typeof value === 'string' ? value : value.join(', '));
  }

  get state(): PackState {
    return this.#controller?.state ?? 'idle';
  }

  connectedCallback(): void {
    this.#media ??= typeof matchMedia === 'function' ? matchMedia(REDUCED_MOTION) : null;
    this.#media?.addEventListener('change', this.#onMediaChange);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.#tryMount(), { once: true });
    } else {
      // Lets code that creates the element and then appends its children finish first.
      queueMicrotask(() => this.#tryMount());
    }
  }

  disconnectedCallback(): void {
    this.#media?.removeEventListener('change', this.#onMediaChange);
    // A move in the DOM disconnects and reconnects in the same task: keep the state then.
    queueMicrotask(() => {
      if (!this.isConnected) this.#unmount();
    });
  }

  attributeChangedCallback(name: string, previous: string | null, value: string | null): void {
    if (previous === value || !this.#controller) return;
    if ((STRUCTURAL_ATTRIBUTES as readonly string[]).includes(name)) this.reset();
    else this.#controller.update(this.#resolve());
  }

  open(direction?: LockedDirection): Promise<void> {
    this.#tryMount();
    return this.#controller?.open(direction) ?? Promise.resolve();
  }

  next(direction?: 1 | -1): Promise<void> {
    this.#tryMount();
    return this.#controller?.next(direction) ?? Promise.resolve();
  }

  revealAll(): Promise<void> {
    this.#tryMount();
    return this.#controller?.revealAll() ?? Promise.resolve();
  }

  reset(): void {
    this.#unmount();
    this.#tryMount();
  }

  // -------------------------------------------------------------------------

  #reflect(name: PackOpeningAttribute, value: string | number | null | undefined): void {
    if (value === null || value === undefined || value === '') this.removeAttribute(name);
    else this.setAttribute(name, String(value));
  }

  #onMediaChange = (): void => {
    this.#controller?.update(this.#resolve());
  };

  #resolve(): ResolvedOptions {
    const { init, enable, disable, issues } = readAttributes(this);
    for (const issue of issues) warnOnce(this, issue);
    const fromProperty = Object.fromEntries(Object.entries(this.#init).filter(([, value]) => value !== undefined));
    const options = resolveOptions(
      { ...init, ...fromProperty, enable, disable },
      { locale: detectLocale(this), prefersReducedMotion: this.#media?.matches ?? false },
    );
    for (const color of [...(options.fxColor ?? []), ...Object.values(options.fxColors).flat()]) {
      if (typeof CSS !== 'undefined' && !CSS.supports('color', color)) warnOnce(this, `"${color}" is not a valid CSS colour.`);
    }
    const magic = enable.filter((feature) => (FX_FEATURES as readonly Feature[]).includes(feature));
    if (magic.length && !registeredEffects().size) {
      warnOnce(this, `"${magic.map(toFeatureToken).join(' ')}" need the magic effects: import 'pack-opening/magic'.`);
    }
    if (!options.features.swipe && !options.features.tap) {
      warnOnce(
        this,
        'Both "swipe" and "tap" are disabled: pointer users need another control calling open() (WCAG 2.5.7).',
      );
    }
    return options;
  }

  #tryMount(): void {
    if (this.#controller || !this.isConnected) return;
    const options = this.#resolve();
    const { mode } = readAttributes(this);

    if (mode === 'auto') {
      this.#auto = renderAuto(this, options.cardBack);
      if (!this.#auto) return this.#observe('waiting');
    }

    const { parts, missing } = queryParts(this);
    if (!parts) {
      warnOnce(
        this,
        `Missing part(s): ${missing.map((part) => `[data-part="${part}"]`).join(', ')}. ` +
          'In headless mode, write every required part (see the Headless docs).',
      );
      return this.#observe('waiting');
    }

    if (mode === 'headless' && !parts.packButton) {
      warnOnce(this, 'No [data-part="pack-button"]: keyboard and screen-reader users cannot open the pack.');
    }
    this.#controller = new PackOpeningController(
      { root: this, parts, emit: (type, detail) => emit(this, type, detail) },
      options,
    );
    this.#observe(mode === 'headless' ? 'cards' : 'children');
  }

  #unmount(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#controller?.destroy();
    this.#controller = null;
    this.#auto?.restore();
    this.#auto = null;
  }

  /**
   * `waiting`: no booster or parts yet (children added later by a script or a framework).
   * `children` (auto): a `[data-pack]` / `[data-card]` added later rebuilds the component.
   * `cards` (headless): cards added or removed by a framework rebuild the component.
   */
  #observe(reason: 'waiting' | 'children' | 'cards'): void {
    this.#observer?.disconnect();
    this.#observer = new MutationObserver((records) => {
      if (reason === 'waiting') return queueMicrotask(() => this.#tryMount());
      const relevant = records.some((record) =>
        [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            node instanceof HTMLElement &&
            (reason === 'cards'
              ? node.matches(partSelector('card')) || !!node.querySelector(partSelector('card'))
              : node.matches('[data-pack], [data-card]')),
        ),
      );
      if (relevant && !this.#pendingReset) {
        this.#pendingReset = true;
        queueMicrotask(() => {
          this.#pendingReset = false;
          this.reset();
        });
      }
    });
    this.#observer.observe(this, { childList: true, subtree: reason !== 'children' });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pack-opening': PackOpeningElement;
  }
  interface HTMLElementEventMap extends PackOpeningEventMap {}
}
