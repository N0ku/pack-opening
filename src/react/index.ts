import {
  createContext,
  createElement,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  version,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { EVENT_HANDLER_PROPS, type EventHandlerProp } from '../core/events.js';
import { toFeature, toFeatureToken } from '../core/features.js';
import { CARD_STRUCTURE, PACK_STRUCTURE, renderTree, type PartNode, type SlotName } from '../core/structure.js';
import type {
  EventHandlers,
  Feature,
  FeatureToken,
  FxColor,
  FxFeature,
  Locale,
  Motion,
  PackOpeningApi,
  PackOpeningLabels,
  Preset,
  Rarity,
  TearDirection,
  ViewInput,
} from '../core/types.js';
import { viewToAttribute } from '../core/view.js';
import { definePackOpening } from '../element/define.js';
import type { PackOpeningElement } from '../element/pack-opening-element.js';

definePackOpening();

type Optional<T> = { [K in keyof T]?: T[K] | undefined };

export type PackOpeningProps = EventHandlers &
  Optional<{
    /** Booster artwork. Rendered twice: the pack body and the strip that gets torn off. */
    pack: ReactNode;
    /** `<PackCard>` elements — or, with `headless`, your own parts. */
    children: ReactNode;
    /** Render your own parts (`data-part="…"`) instead of the built-in structure. */
    headless: boolean;
    preset: Preset;
    /** Features to turn on, on top of the preset (`'burst'` or `'card-swipe'` / `'cardSwipe'`). */
    enable: readonly (Feature | FeatureToken)[];
    /** Features to turn off. Wins over `enable`. */
    disable: readonly (Feature | FeatureToken)[];
    /** Last word on single features. */
    features: Partial<Record<Feature, boolean>>;
    tearDirection: TearDirection;
    tearThreshold: number;
    /** Card back: an image URL or any node. Cards then come out face down and flip on tap. */
    cardBack: string | ReactNode;
    /** Angle the pack is seen from: a preset (`'top-right'`) or coordinates (`{ x: 20, y: 10 }`). */
    view: ViewInput;
    speed: number;
    motion: Motion;
    locale: Locale;
    labels: Partial<PackOpeningLabels>;
    /** Colour of the magic effects (`pack-opening/magic`): a CSS colour or a list. */
    fxColor: FxColor;
    /** Colour of single magic effects, e.g. `{ nova: ['gold', 'white'], trail: 'hotpink' }`. */
    fxColors: Partial<Record<FxFeature, FxColor>>;
    id: string;
    className: string;
    style: CSSProperties;
    'aria-label': string;
  }>;

export interface PackOpeningHandle extends PackOpeningApi {
  readonly element: PackOpeningElement | null;
}

export type PackCardProps = Optional<{
  /** `common`, `rare`, `epic`, `legendary` or your own value. */
  rarity: Rarity;
  /** Returned as `value` in the `onCardReveal` details, e.g. a card id. */
  value: string;
  children: ReactNode;
  className: string;
  style: CSSProperties;
}>;

const CardBackContext = createContext<ReactNode>(null);

// React 19 maps `className` to `class` on custom elements; earlier versions need `class`.
const CLASS_PROP = Number.parseInt(version, 10) >= 19 ? 'className' : 'class';

const tokens = (list: readonly (Feature | FeatureToken)[] | undefined): string | undefined =>
  list
    ?.map((item) => toFeature(item))
    .filter((feature): feature is Feature => feature !== null)
    .map(toFeatureToken)
    .join(' ') || undefined;

const element =
  (extra: (node: PartNode) => Record<string, unknown> = () => ({})) =>
  (node: PartNode, children: ReactNode[]): ReactNode =>
    createElement(node.tag, { key: node.key ?? node.part, 'data-part': node.part, ...node.attrs, ...extra(node) }, ...children);

/**
 * `<pack-opening>` for React. Renders the parts itself (headless element underneath), so React
 * stays in charge of every node it creates.
 *
 * ```tsx
 * <PackOpening pack={<img src="/booster.png" alt="" />} cardBack="/back.png" disable={['sparks']}
 *   onCardReveal={(card) => console.log(card.name)}>
 *   <PackCard rarity="rare"><img src="/c1.png" alt="Voltix" /></PackCard>
 * </PackOpening>
 * ```
 */
export const PackOpening = forwardRef<PackOpeningHandle, PackOpeningProps>(function PackOpening(props, ref) {
  const {
    pack,
    children,
    headless,
    preset,
    enable,
    disable,
    features,
    tearDirection,
    tearThreshold,
    cardBack,
    view,
    speed,
    motion,
    locale,
    labels,
    fxColor,
    fxColors,
    id,
    className,
    style,
    'aria-label': ariaLabel,
    ...handlers
  } = props;

  const elementRef = useRef<PackOpeningElement | null>(null);
  const handlersRef = useRef<EventHandlers>(handlers);

  useLayoutEffect(() => {
    handlersRef.current = handlers;
  });

  // Objects and functions go through the `options` property; everything else is an attribute.
  useLayoutEffect(() => {
    if (elementRef.current) elementRef.current.options = { features, labels, fxColor, fxColors };
  }, [features, labels, fxColor, fxColors]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    const entries = Object.entries(EVENT_HANDLER_PROPS) as Array<[EventHandlerProp, (typeof EVENT_HANDLER_PROPS)[EventHandlerProp]]>;
    const listeners = entries.map(([prop, type]) => {
      const listener = (event: Event) => {
        const handler = handlersRef.current[prop] as ((detail: unknown, event: Event) => void) | undefined;
        handler?.((event as CustomEvent).detail, event);
      };
      el.addEventListener(type, listener);
      return () => el.removeEventListener(type, listener);
    });
    return () => listeners.forEach((off) => off());
  }, []);

  useImperativeHandle(
    ref,
    (): PackOpeningHandle => ({
      get element() {
        return elementRef.current;
      },
      get state() {
        return elementRef.current?.state ?? 'idle';
      },
      open: (direction) => elementRef.current?.open(direction) ?? Promise.resolve(),
      next: (direction) => elementRef.current?.next(direction) ?? Promise.resolve(),
      revealAll: () => elementRef.current?.revealAll() ?? Promise.resolve(),
      reset: () => elementRef.current?.reset(),
    }),
    [],
  );

  const content = headless
    ? children
    : renderTree<ReactNode>(PACK_STRUCTURE, {
        element: element(),
        slot: (name: SlotName) =>
          name === 'pack' || name === 'pack-copy'
            ? [pack]
            : name === 'cards'
              ? [createElement(CardBackContext.Provider, { key: 'cards', value: cardBack ?? null }, children)]
              : null,
      });

  return createElement(
    'pack-opening',
    {
      ref: elementRef,
      mode: 'headless',
      id,
      [CLASS_PROP]: className,
      style,
      'aria-label': ariaLabel,
      preset,
      enable: tokens(enable),
      disable: tokens(disable),
      'tear-direction': tearDirection,
      'tear-threshold': tearThreshold,
      view: view === undefined ? undefined : viewToAttribute(view),
      speed,
      motion,
      locale,
    },
    ...(Array.isArray(content) ? content : [content]),
  );
});

/** A card of the pack. Its children are the card face (usually an `<img>` with an `alt`). */
export function PackCard({ rarity, value, children, className, style }: PackCardProps): ReactElement {
  const back = useContext(CardBackContext);
  const backContent = typeof back === 'string' ? createElement('img', { src: back, alt: '', draggable: false }) : back;
  const [card] = renderTree<ReactNode>([CARD_STRUCTURE], {
    element: element((node) =>
      node.part === 'card' ? { 'data-rarity': rarity, 'data-value': value, className, style } : {},
    ),
    slot: (name) => (name === 'card-content' ? [children] : name === 'card-back' && backContent ? [backContent] : null),
  });
  return card as ReactElement;
}

export type { PackOpeningElement };
