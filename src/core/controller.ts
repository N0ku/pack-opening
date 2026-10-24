import { Announcer } from './a11y/announcer.js';
import {
  clearOwned,
  describeContent,
  ensureId,
  hasFocusWithin,
  setOwnedAttribute,
  setOwnedText,
} from './a11y/dom.js';
import { vibrate } from './effects/haptics.js';
import { attachPointerLight, clearPointerLight } from './effects/pointer-light.js';
import { onEffectRegistered, registeredEffects, type Effect, type EffectFactory, type EffectHost } from './effects/registry.js';
import { spawnSparks } from './effects/sparks.js';
import { featureTokens, toFeatureToken } from './features.js';
import { createTearPath } from './geometry/tear-path.js';
import { attachCardSwipe } from './gestures/card-swipe.js';
import { attachTearGesture, type TearState } from './gestures/tear.js';
import { StateMachine } from './machine.js';
import type { PackParts } from './parts.js';
import { commitStyles, waitForAnimations } from './phases.js';
import { CardReveal, cleanCard } from './reveal.js';
import {
  FX_FEATURES,
  type CardInfo,
  type LockedDirection,
  type PackOpeningEventDetailMap,
  type PackOpeningEventName,
  type PackState,
  type Phase,
  type ResolvedOptions,
} from './types.js';
import { readNumber, wait, warnOnce, whenVisible, type Visibility } from './utils.js';
import { viewToRotate } from './view.js';

export interface ControllerHost {
  root: HTMLElement;
  parts: PackParts;
  emit<K extends PackOpeningEventName>(type: K, detail: PackOpeningEventDetailMap[K]): void;
}

const ROOT_DATA = ['state', 'phase', 'features', 'motion', 'dir', 'tearDirection', 'view', 'fx'] as const;
const PACK_VARS = ['--po-progress', '--po-cut-from', '--po-cut-to', '--po-clip-top', '--po-clip-body', '--po-pack-art'] as const;
/** Colours of the magic effects, from the `fxColor` / `fxColors` options (first colour of each list). */
const FX_VARS = ['--po-fx-color', ...FX_FEATURES.map((effect) => `--po-fx-${toFeatureToken(effect)}-color`)] as const;
/** Share of the component that must be in view before the `appear` feature summons the pack. */
const APPEAR_THRESHOLD = 0.35;

type EffectHook = Exclude<keyof Effect, 'destroy'>;
type HookArgs<K extends EffectHook> = Parameters<NonNullable<Effect[K]>>;

/**
 * The engine behind `<pack-opening>`, shared by the auto and headless modes. It never creates
 * the structure and never writes styles: only state attributes, CSS variables and ARIA.
 */
export class PackOpeningController {
  readonly #host: ControllerHost;
  readonly #machine: StateMachine;
  readonly #announcer: Announcer;
  readonly #reveal: CardReveal;
  readonly #tearLine: number;
  #options: ResolvedOptions;
  #listeners: Array<() => void> = [];
  #detachLight: (() => void) | null = null;
  #opening: Promise<void> | null = null;
  #tear: TearState = { progress: 0, from: 0, to: 0, direction: 'ltr' };
  #destroyed = false;
  readonly #effects = new Map<string, Effect>();
  #appearing: Promise<void> | null = null;
  #visibility: Visibility | null = null;

  constructor(host: ControllerHost, options: ResolvedOptions) {
    this.#host = host;
    this.#options = options;
    const { root, parts } = host;

    this.#machine = new StateMachine((state, previous) => {
      root.dataset.state = state;
      this.#syncBusy(state);
      this.#notify('state', state, previous);
      host.emit('po-state-change', { state, previous });
    });
    root.dataset.state = 'idle';
    this.#announcer = new Announcer(root, parts.announcer);
    this.#tearLine = readNumber(root, '--po-tear-line', 0.14);
    this.#reveal = new CardReveal({
      root,
      container: parts.cards,
      cards: parts.cardList,
      maxDepth: () => readNumber(root, '--po-stack-depth', 4),
      timeout: () => this.#timeout(),
      labels: () => this.#options.labels,
      info: (index) => this.#info(index),
      onReveal: (index, silent) => this.#onReveal(index, silent),
      onFlip: (index) => this.#notify('flip', parts.cardList[index]!),
      onLeave: (index, direction) => this.#notify('leave', parts.cardList[index]!, direction),
      onDone: (hadFocus) => this.#finish(hadFocus),
    });

    this.#prepare();
    this.#apply();
    this.#listen();
    this.#attachEffects();
    this.#appearing = this.#appear();
  }

  get state(): PackState {
    return this.#machine.state;
  }

  update(options: ResolvedOptions): void {
    this.#options = options;
    this.#apply();
    if (!options.effective.appear) this.#skipAppear();
    this.#notify('update');
  }

  open(direction: LockedDirection = 'ltr'): Promise<void> {
    // In `idle`, a pending `#opening` is an auto-open waiting for the summoning to end.
    if (this.state !== 'idle' || this.#opening) return this.#opening ?? Promise.resolve();
    this.#opening = this.#autoOpen(direction);
    return this.#opening;
  }

  next(direction: 1 | -1 = 1): Promise<void> {
    if (this.state === 'idle') return this.open(direction === 1 ? 'ltr' : 'rtl');
    if (this.state === 'revealing') return this.#reveal.next(direction);
    return Promise.resolve();
  }

  async revealAll(): Promise<void> {
    if (this.state === 'idle') await this.open();
    else if (this.#opening) await this.#opening;
    if (!this.#destroyed && this.state === 'revealing') this.#reveal.all();
  }

  destroy(): void {
    this.#destroyed = true;
    const { root, parts } = this.#host;
    this.#listeners.forEach((off) => off());
    this.#listeners = [];
    this.#visibility?.cancel();
    for (const [name, effect] of this.#effects) this.#run(name, 'destroy', () => effect.destroy());
    this.#effects.clear();
    this.#detachLight?.();
    this.#announcer.destroy();
    parts.effects?.querySelectorAll('[data-part="spark"]').forEach((spark) => spark.remove());
    parts.cardList.forEach(({ card }) => cleanCard(card));
    for (const key of ROOT_DATA) delete root.dataset[key];
    root.removeAttribute('aria-busy');
    root.style.removeProperty('--po-speed');
    root.style.removeProperty('--po-view-rotate');
    for (const name of FX_VARS) root.style.removeProperty(name);
    for (const name of PACK_VARS) parts.pack.style.removeProperty(name);
    for (const name of ['--po-total', '--po-remaining', '--po-tuck-y', '--po-peek-y']) parts.cards.style.removeProperty(name);
    for (const el of [root, parts.cards, parts.packButton, parts.packDescription, parts.hintLabel, parts.skip]) {
      if (el) clearOwned(el);
    }
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  #prepare(): void {
    const { parts } = this.#host;
    const path = createTearPath({ line: this.#tearLine, seed: (Math.random() * 2 ** 31) | 0 });
    parts.pack.style.setProperty('--po-clip-top', path.top);
    parts.pack.style.setProperty('--po-clip-body', path.body);
    parts.cards.style.setProperty('--po-total', String(parts.cardList.length));

    // The booster artwork as a CSS image: keeps the foil reflection inside its silhouette
    // (transparent PNGs) and textures the sides of the pack with the `depth` feature.
    const art = parts.packBody.querySelector('img');
    if (art?.src) {
      const url = `url("${art.src.replace(/"/g, '%22')}")`;
      parts.pack.style.setProperty('--po-pack-art', url);
      parts.shine?.style.setProperty('--po-pack-mask', url);
    }
    parts.cards.style.setProperty('--po-remaining', String(parts.cardList.length));
    if (parts.packButton && parts.packDescription) {
      setOwnedAttribute(parts.packButton, 'aria-describedby', ensureId(parts.packDescription, 'po-description'));
    }
  }

  /** Applies the options: features, motion, speed and texts. Safe to call again on update. */
  #apply(): void {
    const { root, parts } = this.#host;
    const { effective: features, labels } = this.#options;

    root.dataset.features = featureTokens(features);
    root.dataset.tearDirection = this.#options.tearDirection;
    if (this.#options.reducedMotion) root.dataset.motion = 'reduce';
    else delete root.dataset.motion;
    root.style.setProperty('--po-speed', String(this.#options.speed));
    const { view } = this.#options;
    root.dataset.view = view.preset ?? 'custom';
    root.style.setProperty('--po-view-rotate', viewToRotate(view));
    const { fxColor, fxColors } = this.#options;
    FX_VARS.forEach((name, i) => {
      const color = i === 0 ? fxColor?.[0] : (fxColors[FX_FEATURES[i - 1]!] ?? fxColor)?.[0];
      if (color) root.style.setProperty(name, color);
      else root.style.removeProperty(name);
    });

    setOwnedAttribute(root, 'role', 'group');
    setOwnedAttribute(root, 'aria-label', labels.root);
    const context = { swipe: features.swipe, tap: features.tap };
    if (parts.packButton && !parts.packButton.textContent?.trim()) {
      setOwnedAttribute(parts.packButton, 'aria-label', labels.openPack);
    }
    if (parts.packDescription) setOwnedText(parts.packDescription, labels.openHint(context));
    if (parts.hintLabel) setOwnedText(parts.hintLabel, labels.hintLabel(context));
    if (parts.skip) setOwnedText(parts.skip, labels.revealAll);
    if (this.state === 'complete' && features.summary) setOwnedAttribute(parts.cards, 'aria-label', labels.summary);
    if (this.state === 'revealing') this.#reveal.refresh();

    const wantsLight = features.tilt || features.shine;
    if (wantsLight && !this.#detachLight) {
      this.#detachLight = attachPointerLight(parts.pack, () => this.state === 'idle');
    } else if (!wantsLight && this.#detachLight) {
      this.#detachLight();
      this.#detachLight = null;
    }
  }

  #listen(): void {
    const { root, parts } = this.#host;
    const on = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement,
      type: K,
      listener: (event: HTMLElementEventMap[K]) => void,
    ) => {
      target.addEventListener(type, listener);
      this.#listeners.push(() => target.removeEventListener(type, listener));
    };

    this.#listeners.push(
      attachTearGesture({
        surface: parts.pack,
        zone: parts.tearZone ?? parts.pack,
        enabled: () => this.state === 'idle' && root.dataset.phase !== 'appear',
        canSwipe: () => this.#options.effective.swipe,
        direction: () => this.#options.tearDirection,
        threshold: () => this.#options.tearThreshold,
        onStart: (direction) => this.#startTear(direction),
        onMove: (state) => {
          this.#setTear(state);
          this.#host.emit('po-tear-progress', { progress: state.progress });
        },
        onComplete: (state) => {
          this.#opening = this.#openSequence(state.direction);
        },
        onCancel: (state) => void this.#cancelTear(state),
        onTap: () => {
          if (this.#options.effective.tap) void this.open();
        },
      }),
      attachCardSwipe({
        container: parts.cards,
        topCard: () => (this.state === 'revealing' && !this.#reveal.busy ? (this.#reveal.top?.card ?? null) : null),
        canDrag: (card) => this.#options.effective.cardSwipe && card.dataset.face !== 'down',
        onDrag: (card, dx) => this.#reveal.drag(card, dx),
        onRelease: (card, outcome) => this.#reveal.release(card, outcome),
      }),
    );

    if (parts.packButton) {
      // Keyboard activation (detail 0) always works; pointer clicks follow the `tap` feature.
      on(parts.packButton, 'click', (event) => {
        if (event.detail === 0 || this.#options.effective.tap) void this.open();
      });
    }
    if (parts.skip) on(parts.skip, 'click', () => void this.revealAll());

    on(root, 'keydown', (event) => {
      const top = this.#reveal.top;
      if (this.state !== 'revealing' || !top || event.target !== top.card) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        void this.#reveal.next(1);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        void this.#reveal.next(event.key === 'ArrowRight' ? 1 : -1);
      }
    });

    // Native image dragging would steal the pointer from the gestures.
    on(root, 'dragstart', (event) => event.preventDefault());
  }

  // -------------------------------------------------------------------------
  // Effects (registerEffect) and summoning
  // -------------------------------------------------------------------------

  #attachEffects(): void {
    for (const [name, factory] of registeredEffects()) this.#addEffect(name, factory);
    this.#listeners.push(onEffectRegistered((name, factory) => this.#addEffect(name, factory)));
  }

  #addEffect(name: string, factory: EffectFactory): void {
    const { root, parts } = this.#host;
    const previous = this.#effects.get(name);
    if (previous) this.#run(name, 'destroy', () => previous.destroy());
    this.#effects.delete(name);
    const controller = this;
    const host: EffectHost = {
      root,
      parts,
      get options() {
        return controller.#options;
      },
      get state() {
        return controller.state;
      },
    };
    const effect = this.#run(name, 'setup', () => factory(host));
    if (effect) this.#effects.set(name, effect);
    if (this.#effects.size) root.dataset.fx = [...this.#effects.keys()].join(' ');
    else delete root.dataset.fx;
  }

  /** Runs one effect's code: an error is reported once and never stops the component. */
  #run<T>(name: string, hook: string, fn: () => T): T | undefined {
    try {
      return fn();
    } catch (error) {
      warnOnce(this.#host.root, `Effect "${name}" failed in ${hook}(): ${String(error)}`);
      return undefined;
    }
  }

  /** Calls a hook on every effect; returns the promises some of them hand back. */
  #notify<K extends EffectHook>(hook: K, ...args: HookArgs<K>): Promise<void>[] {
    const pending: Promise<void>[] = [];
    for (const [name, effect] of this.#effects) {
      const result = this.#run(name, hook, () =>
        (effect[hook] as ((...a: HookArgs<K>) => Promise<void> | void) | undefined)?.apply(effect, args),
      );
      if (result instanceof Promise) {
        pending.push(result.catch((error: unknown) => warnOnce(this.#host.root, `Effect "${name}" failed in ${hook}(): ${String(error)}`)));
      }
    }
    return pending;
  }

  /** `appear` feature: the pack waits out of sight, then is summoned once it comes into view. */
  async #appear(): Promise<void> {
    if (!this.#options.effective.appear) return;
    const { root, parts } = this.#host;
    root.dataset.phase = 'appear-wait';
    this.#visibility = whenVisible(root, APPEAR_THRESHOLD);
    const visible = await this.#visibility.promise;
    this.#visibility = null;
    if (!visible || this.#destroyed) return;
    await this.#phase('appear', [parts.stage]);
    if (this.#destroyed || root.dataset.phase !== 'appear') return;
    delete root.dataset.phase;
  }

  /** A swipe or `open()` before the pack came into view: no summoning. */
  #skipAppear(): void {
    if (!this.#visibility) return;
    this.#visibility.cancel();
    if (this.#host.root.dataset.phase === 'appear-wait') delete this.#host.root.dataset.phase;
  }

  // -------------------------------------------------------------------------
  // Tearing
  // -------------------------------------------------------------------------

  #setTear(state: TearState): void {
    this.#tear = state;
    const { pack } = this.#host.parts;
    pack.style.setProperty('--po-progress', state.progress.toFixed(4));
    pack.style.setProperty('--po-cut-from', state.from.toFixed(4));
    pack.style.setProperty('--po-cut-to', state.to.toFixed(4));
  }

  #startTear(direction: LockedDirection): void {
    const { root, parts } = this.#host;
    this.#skipAppear();
    this.#machine.to('tearing');
    root.dataset.dir = direction;
    clearPointerLight(parts.pack);
    this.#host.emit('po-tear-start', { direction });
  }

  async #phase(phase: Exclude<Phase, 'appear-wait'>, targets: readonly Element[], apply?: () => void): Promise<void> {
    this.#host.root.dataset.phase = phase;
    apply?.();
    const timeout = this.#timeout();
    // Effects first: animations they start right away are then picked up with the CSS ones.
    const effects = this.#notify('phase', phase);
    await Promise.all([
      waitForAnimations(targets, timeout),
      effects.length ? Promise.race([Promise.all(effects), wait(timeout)]) : undefined,
    ]);
  }

  #timeout(): number {
    return Math.max(1500, 4000 / this.#options.speed);
  }

  async #cancelTear(state: TearState): Promise<void> {
    const { root, parts } = this.#host;
    const edge = state.direction === 'ltr' ? state.from : state.to;
    await this.#phase('cancel', [parts.pack], () =>
      this.#setTear({ progress: 0, from: edge, to: edge, direction: state.direction }),
    );
    if (this.#destroyed) return;
    delete root.dataset.phase;
    this.#machine.to('idle');
    this.#host.emit('po-tear-cancel', { progress: state.progress });
  }

  /** `open()`, a tap or the keyboard: plays the cut along the line, then opens. */
  async #autoOpen(direction: LockedDirection): Promise<void> {
    const { pack } = this.#host.parts;
    this.#skipAppear();
    await this.#appearing;
    if (this.#destroyed) return;
    this.#startTear(direction);
    const edge = direction === 'ltr' ? 0 : 1;
    this.#setTear({ progress: 0, from: edge, to: edge, direction });
    commitStyles(pack);
    await this.#phase('auto-cut', [pack], () => this.#setTear({ progress: 1, from: 0, to: 1, direction }));
    if (this.#destroyed) return;
    this.#host.emit('po-tear-progress', { progress: 1 });
    await this.#openSequence(direction);
  }

  // -------------------------------------------------------------------------
  // Opening choreography — each phase is styled in theme.css
  // -------------------------------------------------------------------------

  async #openSequence(direction: LockedDirection): Promise<void> {
    const { root, parts } = this.#host;
    const hadFocus = hasFocusWithin(root);
    const total = parts.cardList.length;
    this.#machine.to('opening');

    // 1. Finish the cut across the whole width.
    await this.#phase('cut', [parts.pack], () => this.#setTear({ ...this.#tear, progress: 1, from: 0, to: 1, direction }));
    if (this.#destroyed) return;

    // 2. The strip flies off (flash, sparks) while the cards peek out of the opening.
    const features = this.#options.effective;
    if (features.haptics) vibrate();
    this.#placeCards();
    const sparks =
      features.sparks && parts.effects ? spawnSparks(parts.effects, readNumber(root, '--po-spark-count', 14)) : [];
    this.#host.emit('po-opened', { total });
    this.#announcer.announce(this.#options.labels.opened(total));
    await this.#phase('open', [parts.pack, parts.cards]);
    sparks.forEach((spark) => spark.remove());
    if (this.#destroyed) return;

    // 3. The empty pack slides away and the cards settle in the middle.
    await this.#phase('settle', [parts.pack, parts.cards]);
    if (this.#destroyed) return;

    if (!total) {
      this.#finish(hadFocus);
      delete root.dataset.phase;
      return;
    }
    this.#machine.to('revealing');
    delete root.dataset.phase;
    this.#reveal.start();
    if (hadFocus) this.#reveal.top?.card.focus({ preventScroll: true });
  }

  /** Offsets that tuck the cards just below the tear line, then show their top third. */
  #placeCards(): void {
    const { pack, cards } = this.#host.parts;
    const packTop = pack.offsetTop;
    const packH = pack.offsetHeight;
    const cardsH = cards.offsetHeight;
    const tearY = packTop + packH * this.#tearLine;
    const tuck = Math.min(tearY + packH * 0.05, packTop + packH - cardsH) - cards.offsetTop;
    const peek = tearY - cardsH * 0.35 - cards.offsetTop;
    cards.style.setProperty('--po-tuck-y', `${tuck.toFixed(1)}px`);
    cards.style.setProperty('--po-peek-y', `${peek.toFixed(1)}px`);
  }

  // -------------------------------------------------------------------------
  // Reveal & summary
  // -------------------------------------------------------------------------

  #info(index: number): CardInfo {
    const { cardList } = this.#host.parts;
    const { card, front } = cardList[index]!;
    const rarity = card.dataset.rarity || null;
    return {
      index,
      total: cardList.length,
      name: describeContent(front) || `#${index + 1}`,
      rarity,
      rarityLabel: rarity ? (this.#options.labels.rarity[rarity] ?? rarity) : null,
    };
  }

  #onReveal(index: number, silent: boolean): void {
    const info = this.#info(index);
    const { card } = this.#host.parts.cardList[index]!;
    if (!silent) this.#announcer.announce(this.#options.labels.revealed(info));
    this.#notify('reveal', this.#host.parts.cardList[index]!, info, silent);
    this.#host.emit('po-card-reveal', { ...info, card, value: card.dataset.value ?? null });
  }

  #finish(hadFocus: boolean): void {
    const { root, parts } = this.#host;
    const { labels, effective } = this.#options;
    this.#machine.to('complete');

    const summary = effective.summary && parts.cardList.length > 0;
    if (summary) {
      for (const { card } of parts.cardList) {
        delete card.dataset.stack;
        card.style.removeProperty('--po-depth');
        card.inert = false;
        card.removeAttribute('aria-hidden');
        setOwnedAttribute(card, 'role', 'listitem');
        setOwnedAttribute(card, 'tabindex', null);
        setOwnedAttribute(card, 'aria-label', null);
      }
      setOwnedAttribute(parts.cards, 'role', 'list');
      setOwnedAttribute(parts.cards, 'aria-label', labels.summary);
      setOwnedAttribute(parts.cards, 'tabindex', '-1');
    }
    if (hadFocus) {
      if (!summary) setOwnedAttribute(root, 'tabindex', '-1');
      (summary ? parts.cards : root).focus({ preventScroll: true });
    }
    this.#announcer.announce(labels.complete);
    this.#notify('complete');
    this.#host.emit('po-complete', { cards: parts.cardList.map(({ card }) => card) });
  }

  #syncBusy(state: PackState): void {
    if (state === 'opening') this.#host.root.setAttribute('aria-busy', 'true');
    else this.#host.root.removeAttribute('aria-busy');
  }
}
