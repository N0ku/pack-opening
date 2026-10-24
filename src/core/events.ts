import type { EventHandlerName, PackOpeningEventName } from './types.js';

/** React/Vue handler prop → DOM event. Checked by the compiler against the event map. */
export const EVENT_HANDLER_PROPS = {
  onStateChange: 'po-state-change',
  onTearStart: 'po-tear-start',
  onTearProgress: 'po-tear-progress',
  onTearCancel: 'po-tear-cancel',
  onOpened: 'po-opened',
  onCardReveal: 'po-card-reveal',
  onComplete: 'po-complete',
} as const satisfies { [K in PackOpeningEventName as EventHandlerName<K>]: K };

export type EventHandlerProp = keyof typeof EVENT_HANDLER_PROPS;

/** `po-card-reveal` → `card-reveal` (Vue emits). */
export type ShortEventName<K extends PackOpeningEventName> = K extends `po-${infer Rest}` ? Rest : never;

export const shortEventName = <K extends PackOpeningEventName>(type: K): ShortEventName<K> =>
  type.slice(3) as ShortEventName<K>;
