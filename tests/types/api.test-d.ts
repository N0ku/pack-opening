import { describe, expectTypeOf, it } from 'vitest';
import type {
  CardInfo,
  EventHandlers,
  FeatureToken,
  FxFeature,
  KebabCase,
  PackOpeningEventMap,
  PackOpeningInit,
  PackState,
} from '../../src';
import { PackOpeningElement } from '../../src';
import type { PackOpeningHandle, PackOpeningProps } from '../../src/react';

describe('public types', () => {
  it('derives the HTML feature tokens from the features', () => {
    expectTypeOf<KebabCase<'cardSwipe'>>().toEqualTypeOf<'card-swipe'>();
    expectTypeOf<'card-swipe'>().toExtend<FeatureToken>();
    expectTypeOf<'cardSwipe'>().not.toExtend<FeatureToken>();
  });

  it('derives the React/Vue handler names and details from the event map', () => {
    expectTypeOf<keyof EventHandlers>().toEqualTypeOf<
      'onStateChange' | 'onTearStart' | 'onTearProgress' | 'onTearCancel' | 'onOpened' | 'onCardReveal' | 'onComplete'
    >();
    type Reveal = NonNullable<EventHandlers['onCardReveal']>;
    expectTypeOf<Parameters<Reveal>[0]>().toEqualTypeOf<CardInfo & { card: HTMLElement; value: string | null }>();
    expectTypeOf<Parameters<Reveal>[1]>().toEqualTypeOf<PackOpeningEventMap['po-card-reveal']>();
  });

  it('types addEventListener on the element', () => {
    const el = new PackOpeningElement();
    el.addEventListener('po-complete', (event) => {
      expectTypeOf(event.detail.cards).toEqualTypeOf<HTMLElement[]>();
    });
    el.addEventListener('po-state-change', (event) => {
      expectTypeOf(event.detail.state).toEqualTypeOf<PackState>();
    });
    expectTypeOf(document.createElement('pack-opening')).toEqualTypeOf<PackOpeningElement>();
  });

  it('only accepts known values', () => {
    expectTypeOf<{ preset: 'full' }>().toExtend<PackOpeningInit>();
    expectTypeOf<{ preset: 'maximal' }>().not.toExtend<PackOpeningInit>();
    expectTypeOf<{ features: { sparks: false } }>().toExtend<PackOpeningInit>();
    expectTypeOf<{ features: { confetti: true } }>().not.toExtend<PackOpeningInit>();
    expectTypeOf<{ view: 'top-right' }>().toExtend<PackOpeningInit>();
    expectTypeOf<{ view: { x: 20; y: 10 } }>().toExtend<PackOpeningInit>();
    expectTypeOf<{ view: 'diagonal' }>().not.toExtend<PackOpeningInit>();
    expectTypeOf<{ view: { pitch: 10 } }>().not.toExtend<PackOpeningInit>();
    // `undefined` is accepted so that optional values can be forwarded as is.
    expectTypeOf<{ cardBack: undefined }>().toExtend<PackOpeningInit>();
  });

  it('types the React props and ref', () => {
    expectTypeOf<{ disable: ['sparks', 'card-swipe'] }>().toExtend<PackOpeningProps>();
    expectTypeOf<{ disable: ['confetti'] }>().not.toExtend<PackOpeningProps>();
    expectTypeOf<PackOpeningHandle['open']>().parameters.toEqualTypeOf<[direction?: 'ltr' | 'rtl' | undefined]>();
    expectTypeOf<PackOpeningHandle['state']>().toEqualTypeOf<PackState>();
  });

  it('types the reflected properties', () => {
    const el = new PackOpeningElement();
    el.disable = ['sparks', 'card-swipe'];
    el.disable = 'sparks tilt';
    el.preset = 'minimal';
    // @ts-expect-error unknown preset
    el.preset = 'maximal';
    expectTypeOf(el.enable).toEqualTypeOf<Array<
      | 'swipe' | 'tap' | 'cardSwipe' | 'skip' | 'hint' | 'tilt' | 'shine' | 'sparks' | 'burst' | 'haptics' | 'rarity'
      | 'stack' | 'depth' | 'summary' | 'appear' | 'aura' | 'trail' | 'nova' | 'dissolve' | 'glimmer' | 'wake' | 'shimmer'
    >>();
    el.fxColor = ['#b968ff', 'oklch(0.8 0.1 200)'];
    el.fxColor = 'gold';
    // Read back as the reflected attribute.
    expectTypeOf(new PackOpeningElement().fxColor).toEqualTypeOf<string | null>();
  });

  it('types the magic colours', () => {
    expectTypeOf<{ fxColor: '#b968ff' }>().toExtend<PackOpeningInit>();
    expectTypeOf<{ fxColor: ['#b968ff', 'gold'] }>().toExtend<PackOpeningInit>();
    expectTypeOf<{ fxColors: { nova: ['gold', 'white']; trail: 'hotpink' } }>().toExtend<PackOpeningInit>();
    expectTypeOf<{ fxColors: { sparks: 'gold' } }>().not.toExtend<PackOpeningInit>();
    expectTypeOf<{ fxColors: { glimmer: 'gold' } }>().toExtend<PackOpeningProps>();
    expectTypeOf<FxFeature>().toEqualTypeOf<'appear' | 'aura' | 'trail' | 'nova' | 'dissolve' | 'glimmer' | 'wake' | 'shimmer'>();
  });
});
