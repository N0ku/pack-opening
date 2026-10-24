// Public contract of pack-opening. Everything else (element, React, Vue) derives its types from here.

/**
 * Every optional behaviour, in camelCase (JS/TS) — `KebabCase<Feature>` in HTML lists.
 * Keyboard support and screen-reader announcements are not listed: they are always on.
 */
export const FEATURES = [
  /** Swipe along the tear line to open the pack. */
  'swipe',
  /** A single tap or click on the pack opens it (pointer alternative to the swipe, WCAG 2.5.7). */
  'tap',
  /** Drag the top card sideways to send it away. Tapping a card always works. */
  'cardSwipe',
  /** "Reveal all" button while the cards are being revealed. */
  'skip',
  /** Dashed cut line, glint and instruction text on the sealed pack. */
  'hint',
  /** 3D tilt that follows the mouse. */
  'tilt',
  /** Foil reflection that follows the mouse. */
  'shine',
  /** Sparks when the strip is torn off. */
  'sparks',
  /** Flash of light when the strip is torn off. */
  'burst',
  /** Short vibration when the pack opens (devices that support it). */
  'haptics',
  /** Glow and holographic sweep on cards with a `rarity`. */
  'rarity',
  /** Depth offset of the cards under the top one. */
  'stack',
  /** 3D pack and deck seen slightly from the side: thickness, rounded corners, card edges. */
  'depth',
  /** Every card side by side once they have all been seen. */
  'summary',
  // Magic effects: they run once `pack-opening/magic` is loaded (CSS layers: `css/magic.css`).
  /** The pack is summoned when it comes into view: magic circle, converging particles, materialisation. */
  'appear',
  /** Fireflies floating around the sealed pack. */
  'aura',
  /** Stardust following the tip of the cut. */
  'trail',
  /** Translucent shockwaves and a shower of stars when the strip is torn off. */
  'nova',
  /** The empty pack dissolves into particles while the cards come out of a veil of light. */
  'dissolve',
  /** Burst of particles around a card when it is revealed (rarity colour). */
  'glimmer',
  /** Trail of particles behind a card sent away. */
  'wake',
  /** Glittering wave over the cards of the summary. */
  'shimmer',
] as const;

export type Feature = (typeof FEATURES)[number];
export type FeatureFlags = Readonly<Record<Feature, boolean>>;

/** `cardSwipe` → `card-swipe`. */
export type KebabCase<S extends string> = S extends `${infer Head}${infer Tail}`
  ? `${Head extends Lowercase<Head> ? Head : `-${Lowercase<Head>}`}${KebabCase<Tail>}`
  : S;

/** A feature as written in the `enable` / `disable` attributes. */
export type FeatureToken = KebabCase<Feature>;

/** Starting point the `enable` / `disable` lists apply to. */
export const PRESETS = ['full', 'minimal', 'none'] as const;
export type Preset = (typeof PRESETS)[number];

/** Magic effects, run by `pack-opening/magic`. Each one has its own colour (`fxColors`). */
export const FX_FEATURES = [
  'appear',
  'aura',
  'trail',
  'nova',
  'dissolve',
  'glimmer',
  'wake',
  'shimmer',
] as const satisfies readonly Feature[];
export type FxFeature = (typeof FX_FEATURES)[number];

/** Features turned off when the user prefers reduced motion. */
export const MOTION_FEATURES = ['tilt', 'shine', 'sparks', 'burst', ...FX_FEATURES] as const satisfies readonly Feature[];

/** A CSS colour, or several: the particles of an effect pick among them. */
export type FxColor = string | readonly string[];

export const MODES = ['auto', 'headless'] as const;
/** `auto`: the component builds its structure from `[data-pack]` / `[data-card]` children.
 *  `headless`: you write every part yourself (`data-part="…"`), the component only adds behaviour. */
export type Mode = (typeof MODES)[number];

export const TEAR_DIRECTIONS = ['any', 'ltr', 'rtl'] as const;
export type TearDirection = (typeof TEAR_DIRECTIONS)[number];
export type LockedDirection = Exclude<TearDirection, 'any'>;

export const MOTIONS = ['auto', 'reduce'] as const;
/** `auto` follows `prefers-reduced-motion`; `reduce` always removes the animations. */
export type Motion = (typeof MOTIONS)[number];

export const LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

/** Built-in rarities have their own colour token; any other value uses the default glow. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | (string & {});

/** Named camera positions around the pack, on a 3×3 grid. `front` is the default. */
export const VIEWS = [
  'front',
  'top',
  'bottom',
  'left',
  'right',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;
export type ViewPreset = (typeof VIEWS)[number];

/** Where the viewer stands, in degrees, as a camera orbiting the pack. */
export interface ViewCoordinates {
  /** Horizontal angle: > 0 shows the right side, < 0 the left one (−75 to 75). */
  x: number;
  /** Vertical angle: > 0 shows the top, < 0 the bottom (−75 to 75). */
  y: number;
  /** Roll of the pack in its own plane, clockwise (−180 to 180). */
  z: number;
}

/** A preset name, or coordinates (missing ones are 0). */
export type ViewInput = ViewPreset | Partial<ViewCoordinates>;

export interface ResolvedView extends ViewCoordinates {
  /** Name of the preset, or `null` for custom coordinates. */
  preset: ViewPreset | null;
}

export const STATES = ['idle', 'tearing', 'opening', 'revealing', 'complete'] as const;
export type PackState = (typeof STATES)[number];

/** Value of `data-phase` while an animation step runs. Each one is styled in theme.css (magic.css for `appear*`).
 *  `appear-wait`: the `appear` feature waits for the pack to come into view. */
export type Phase = 'appear-wait' | 'appear' | 'cut' | 'auto-cut' | 'cancel' | 'open' | 'settle';

export interface CardInfo {
  /** 0-based position in the pack. */
  index: number;
  total: number;
  /** Accessible name of the card (its `alt`, `aria-label` or text). */
  name: string;
  rarity: Rarity | null;
  /** Localised rarity name, e.g. "légendaire". */
  rarityLabel: string | null;
}

export interface OpenHintContext {
  swipe: boolean;
  tap: boolean;
}

/** Every text the component shows or announces. Override any of them with `labels`. */
export interface PackOpeningLabels {
  /** Accessible name of the whole component. */
  root: string;
  /** Accessible name of the pack button. */
  openPack: string;
  /** Description of the pack button: how to open it with the enabled interactions. */
  openHint: (context: OpenHintContext) => string;
  /** Visible instruction under the sealed pack. */
  hintLabel: (context: OpenHintContext) => string;
  /** Accessible name of a face-down top card. */
  flipCard: (card: CardInfo) => string;
  /** Accessible name of a revealed top card. */
  nextCard: (card: CardInfo) => string;
  revealAll: string;
  /** Accessible name of the summary list. */
  summary: string;
  opened: (total: number) => string;
  revealed: (card: CardInfo) => string;
  complete: string;
  rarity: Readonly<Record<string, string>>;
}

export interface PackOpeningOptions {
  /** Starting set of features. @default 'full' */
  preset: Preset;
  /** Turns single features on or off, on top of the preset and the `enable` / `disable` lists. */
  features: Partial<Record<Feature, boolean>>;
  /** Allowed swipe direction. @default 'any' */
  tearDirection: TearDirection;
  /** Share of the pack width to swipe across before it opens (0.2–1). @default 0.75 */
  tearThreshold: number;
  /** Image of the card backs. When set, cards come out face down and flip on tap. */
  cardBack: string | null;
  /** Angle the pack and the deck are seen from: a preset or coordinates. @default 'front' */
  view: ViewInput;
  /** Speed multiplier of every animation. @default 1 */
  speed: number;
  /** @default 'auto' */
  motion: Motion;
  /** Language of the built-in texts. @default closest `lang` attribute, else 'en' */
  locale: Locale;
  /** Overrides of the built-in texts. */
  labels: Partial<PackOpeningLabels>;
  /** Colour of every magic effect: a CSS colour or a list. @default the `--po-fx-color` token */
  fxColor: FxColor | null;
  /** Colour of single magic effects, over `fxColor`. Without one, `glimmer` and `wake` use the card's rarity colour. */
  fxColors: Partial<Record<FxFeature, FxColor>>;
}

/** Options as accepted from users: everything optional, `undefined` allowed. */
export type PackOpeningInit = { [K in keyof PackOpeningOptions]?: PackOpeningOptions[K] | undefined };

/** Options after defaults, presets and locale have been applied. */
export interface ResolvedOptions
  extends Omit<PackOpeningOptions, 'preset' | 'features' | 'labels' | 'view' | 'fxColor' | 'fxColors'> {
  preset: Preset;
  view: ResolvedView;
  /** What the user asked for. */
  features: FeatureFlags;
  /** What actually runs: `features` minus the motion effects when motion is reduced. */
  effective: FeatureFlags;
  reducedMotion: boolean;
  labels: PackOpeningLabels;
  /** `null`: the CSS tokens decide. */
  fxColor: readonly string[] | null;
  fxColors: Readonly<Partial<Record<FxFeature, readonly string[]>>>;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface PackOpeningEventDetailMap {
  'po-state-change': { state: PackState; previous: PackState };
  'po-tear-start': { direction: LockedDirection };
  'po-tear-progress': { progress: number };
  'po-tear-cancel': { progress: number };
  'po-opened': { total: number };
  'po-card-reveal': CardInfo & { card: HTMLElement; value: string | null };
  'po-complete': { cards: HTMLElement[] };
}

export type PackOpeningEventName = keyof PackOpeningEventDetailMap;

export type PackOpeningEventMap = {
  [K in PackOpeningEventName]: CustomEvent<PackOpeningEventDetailMap[K]>;
};

type PascalCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Capitalize<Head>}${PascalCase<Tail>}`
  : Capitalize<S>;

/** `po-card-reveal` → `onCardReveal`. Used by the React and Vue wrappers. */
export type EventHandlerName<K extends PackOpeningEventName> = K extends `po-${infer Rest}`
  ? `on${PascalCase<Rest>}`
  : never;

export type EventHandlers = {
  [K in PackOpeningEventName as EventHandlerName<K>]?: (
    detail: PackOpeningEventDetailMap[K],
    event: PackOpeningEventMap[K],
  ) => void;
};

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

/** Values of `data-part`: the styling and headless-markup contract. */
export const PARTS = [
  'stage',
  'pack',
  'pack-body',
  'pack-top',
  'pack-side',
  'pack-button',
  'pack-description',
  'tear-zone',
  'cut',
  'hint',
  'hint-label',
  'shine',
  'burst',
  'effects',
  'spark',
  'cards',
  'deck-side',
  'card',
  'card-flip',
  'card-front',
  'card-back',
  'skip',
  'announcer',
  'fx',
] as const;
export type Part = (typeof PARTS)[number];

/** Methods shared by the element and the framework wrappers' refs. */
export interface PackOpeningApi {
  readonly state: PackState;
  /** Tears the pack open without a gesture. Resolves once the cards are out. */
  open(direction?: LockedDirection): Promise<void>;
  /** Opens the pack, flips the top card or sends it away, whichever comes next. */
  next(direction?: 1 | -1): Promise<void>;
  /** Skips to the end: every card is revealed. */
  revealAll(): Promise<void>;
  /** Back to a sealed pack. */
  reset(): void;
}
