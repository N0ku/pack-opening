import {
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  type InjectionKey,
  type PropType,
  type VNode,
} from 'vue';
import { EVENT_HANDLER_PROPS, shortEventName, type ShortEventName } from '../core/events.js';
import { toFeature, toFeatureToken } from '../core/features.js';
import { CARD_STRUCTURE, PACK_STRUCTURE, renderTree, type PartNode } from '../core/structure.js';
import type {
  Feature,
  FeatureToken,
  FxColor,
  FxFeature,
  Locale,
  Motion,
  PackOpeningApi,
  PackOpeningEventDetailMap,
  PackOpeningEventName,
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

/** Card back content for the `<PackCard>` children: the `#back` slot or the `cardBack` image. */
const CARD_BACK: InjectionKey<() => VNode[] | null> = Symbol('pack-opening-card-back');

const tokens = (list: readonly (Feature | FeatureToken)[] | undefined): string | undefined =>
  list
    ?.map((item) => toFeature(item))
    .filter((feature): feature is Feature => feature !== null)
    .map(toFeatureToken)
    .join(' ') || undefined;

const element =
  (extra: (node: PartNode) => Record<string, unknown> = () => ({})) =>
  (node: PartNode, children: VNode[]): VNode =>
    h(node.tag, { key: node.key ?? node.part, 'data-part': node.part, ...node.attrs, ...extra(node) }, children);

type Emits = {
  [K in PackOpeningEventName as ShortEventName<K>]: (detail: PackOpeningEventDetailMap[K]) => true;
};

const emits = Object.fromEntries(
  Object.values(EVENT_HANDLER_PROPS).map((type) => [shortEventName(type), () => true]),
) as unknown as Emits;

export type PackOpeningExposed = PackOpeningApi & { readonly element: PackOpeningElement | null };

/**
 * `<pack-opening>` for Vue 3. Slots: `#pack` (booster artwork), default (`<PackCard>`s, or your own
 * parts with `headless`), `#back` (custom card back). Emits `card-reveal`, `complete`, …
 */
export const PackOpening = defineComponent({
  name: 'PackOpening',
  props: {
    /** Render your own parts (`data-part="…"`) in the default slot. */
    headless: { type: Boolean, default: false },
    preset: String as PropType<Preset>,
    enable: Array as PropType<readonly (Feature | FeatureToken)[]>,
    disable: Array as PropType<readonly (Feature | FeatureToken)[]>,
    features: Object as PropType<Partial<Record<Feature, boolean>>>,
    tearDirection: String as PropType<TearDirection>,
    tearThreshold: Number,
    /** Image of the card backs. Use the `#back` slot for any other content. */
    cardBack: String,
    /** Angle the pack is seen from: a preset (`'top-right'`) or coordinates (`{ x: 20, y: 10 }`). */
    view: [String, Object] as PropType<ViewInput>,
    speed: Number,
    motion: String as PropType<Motion>,
    locale: String as PropType<Locale>,
    labels: Object as PropType<Partial<PackOpeningLabels>>,
    /** Colour of the magic effects (`pack-opening/magic`): a CSS colour or a list. */
    fxColor: [String, Array] as PropType<FxColor>,
    /** Colour of single magic effects, e.g. `{ nova: ['gold', 'white'], trail: 'hotpink' }`. */
    fxColors: Object as PropType<Partial<Record<FxFeature, FxColor>>>,
  },
  emits,
  setup(props, { slots, emit, expose }) {
    const el = ref<PackOpeningElement | null>(null);

    provide(CARD_BACK, () =>
      slots.back ? slots.back() : props.cardBack ? [h('img', { src: props.cardBack, alt: '', draggable: false })] : null,
    );

    const applyOptions = () => {
      if (el.value) {
        el.value.options = { features: props.features, labels: props.labels, fxColor: props.fxColor, fxColors: props.fxColors };
      }
    };
    watch(() => [props.features, props.labels, props.fxColor, props.fxColors], applyOptions, { deep: true });

    const removers: Array<() => void> = [];
    onMounted(() => {
      applyOptions();
      const target = el.value;
      if (!target) return;
      for (const type of Object.values(EVENT_HANDLER_PROPS)) {
        const listener = (event: Event) =>
          (emit as (name: string, detail: unknown) => void)(shortEventName(type), (event as CustomEvent).detail);
        target.addEventListener(type, listener);
        removers.push(() => target.removeEventListener(type, listener));
      }
    });
    onBeforeUnmount(() => removers.splice(0).forEach((off) => off()));

    const exposed: PackOpeningExposed = {
      get element() {
        return el.value;
      },
      get state() {
        return el.value?.state ?? 'idle';
      },
      open: (direction) => el.value?.open(direction) ?? Promise.resolve(),
      next: (direction) => el.value?.next(direction) ?? Promise.resolve(),
      revealAll: () => el.value?.revealAll() ?? Promise.resolve(),
      reset: () => el.value?.reset(),
    };
    expose(exposed);

    return () =>
      h(
        'pack-opening',
        {
          ref: el,
          mode: 'headless',
          preset: props.preset,
          enable: tokens(props.enable),
          disable: tokens(props.disable),
          'tear-direction': props.tearDirection,
          'tear-threshold': props.tearThreshold,
          view: props.view === undefined ? undefined : viewToAttribute(props.view),
          speed: props.speed,
          motion: props.motion,
          locale: props.locale,
        },
        props.headless
          ? slots.default?.()
          : renderTree<VNode>(PACK_STRUCTURE, {
              element: element(),
              slot: (name) =>
                name === 'pack' || name === 'pack-copy'
                  ? (slots.pack?.() ?? [])
                  : name === 'cards'
                    ? (slots.default?.() ?? [])
                    : null,
            }),
      );
  },
});

/** A card of the pack. Its default slot is the card face (usually an `<img>` with an `alt`). */
export const PackCard = defineComponent({
  name: 'PackCard',
  props: {
    /** `common`, `rare`, `epic`, `legendary` or your own value. */
    rarity: String as PropType<Rarity>,
    /** Returned as `value` in the `card-reveal` details, e.g. a card id. */
    value: String,
  },
  setup(props, { slots }) {
    const back = inject(CARD_BACK, () => null);
    return () => {
      const backContent = back();
      return renderTree<VNode>([CARD_STRUCTURE], {
        element: element((node) => (node.part === 'card' ? { 'data-rarity': props.rarity, 'data-value': props.value } : {})),
        slot: (name) =>
          name === 'card-content' ? (slots.default?.() ?? []) : name === 'card-back' ? backContent : null,
      })[0]!;
    };
  },
});

export type { PackOpeningElement };
