import { describe, expect, it } from 'vitest';
import { BUILT_IN_LABELS, resolveLabels } from '../../src/core/labels';
import { TRANSITIONS, StateMachine } from '../../src/core/machine';
import { DEFAULT_OPTIONS, resolveOptions } from '../../src/core/options';
import { CARD_STRUCTURE, PACK_STRUCTURE, renderTree, type PartNode } from '../../src/core/structure';
import { LOCALES, PARTS, type CardInfo, type PackState } from '../../src/core/types';
import { levenshtein, suggest } from '../../src/core/utils';

const context = { locale: 'en', prefersReducedMotion: false } as const;

describe('resolveOptions', () => {
  it('applies the defaults', () => {
    const options = resolveOptions({}, context);
    const { view, ...defaults } = DEFAULT_OPTIONS;
    expect(options).toMatchObject({ ...defaults, locale: 'en', reducedMotion: false });
    expect(view).toBe('front');
    expect(options.view).toEqual({ x: 0, y: 0, z: 0, preset: 'front' });
    expect(options.labels).toEqual(BUILT_IN_LABELS.en);
  });

  it('clamps the threshold and ignores invalid speeds', () => {
    expect(resolveOptions({ tearThreshold: 5 }, context).tearThreshold).toBe(1);
    expect(resolveOptions({ tearThreshold: 0 }, context).tearThreshold).toBe(0.2);
    expect(resolveOptions({ tearThreshold: Number.NaN }, context).tearThreshold).toBe(0.75);
    expect(resolveOptions({ speed: -2 }, context).speed).toBe(1);
    expect(resolveOptions({ speed: 2 }, context).speed).toBe(2);
  });

  it('turns motion effects off with motion "reduce" or the media query', () => {
    expect(resolveOptions({ motion: 'reduce' }, context).effective.sparks).toBe(false);
    expect(resolveOptions({}, { ...context, prefersReducedMotion: true }).effective.tilt).toBe(false);
    expect(resolveOptions({}, context).effective.tilt).toBe(true);
    // What the user asked for is kept apart from what runs.
    expect(resolveOptions({ motion: 'reduce' }, context).features.sparks).toBe(true);
  });

  it('prefers the locale option over the detected one', () => {
    expect(resolveOptions({ locale: 'fr' }, context).labels.revealAll).toBe('Tout révéler');
  });

  it('treats an empty card back as none', () => {
    expect(resolveOptions({ cardBack: '' }, context).cardBack).toBeNull();
  });

  it('resolves the magic colours into lists', () => {
    const options = resolveOptions(
      { fxColor: '#b968ff oklch(0.8 0.1 200)', fxColors: { nova: ['gold', ' white '], trail: 'hotpink', aura: '' } },
      context,
    );
    expect(options.fxColor).toEqual(['#b968ff', 'oklch(0.8 0.1 200)']);
    expect(options.fxColors).toEqual({ nova: ['gold', 'white'], trail: ['hotpink'] });
    expect(resolveOptions({}, context)).toMatchObject({ fxColor: null, fxColors: {} });
  });
});

describe('labels', () => {
  const card: CardInfo = { index: 2, total: 5, name: 'Voltix', rarity: 'rare', rarityLabel: 'rare' };

  it('provides every text in every locale', () => {
    for (const locale of LOCALES) {
      const labels = BUILT_IN_LABELS[locale];
      expect(labels.flipCard(card)).toContain('3');
      expect(labels.revealed(card)).toContain('Voltix');
      expect(labels.opened(1)).not.toEqual(labels.opened(2));
      expect(labels.openHint({ swipe: false, tap: false })).toMatch(/Ent/);
    }
  });

  it('merges overrides, rarity names included', () => {
    const labels = resolveLabels('fr', { revealAll: 'Voir tout', rarity: { mythic: 'mythique' } });
    expect(labels.revealAll).toBe('Voir tout');
    expect(labels.rarity).toMatchObject({ mythic: 'mythique', legendary: 'légendaire' });
  });

  it('hides the visible hint when neither swipe nor tap can open the pack', () => {
    expect(BUILT_IN_LABELS.en.hintLabel({ swipe: false, tap: false })).toBe('');
  });
});

describe('StateMachine', () => {
  it('follows the allowed transitions only', () => {
    const changes: string[] = [];
    const machine = new StateMachine((state, previous) => changes.push(`${previous}→${state}`));
    expect(machine.to('revealing')).toBe(false);
    expect(machine.to('tearing')).toBe(true);
    expect(machine.to('idle')).toBe(true);
    expect(machine.to('tearing') && machine.to('opening') && machine.to('revealing') && machine.to('complete')).toBe(true);
    expect(machine.to('idle')).toBe(false);
    expect(changes).toEqual(['idle→tearing', 'tearing→idle', 'idle→tearing', 'tearing→opening', 'opening→revealing', 'revealing→complete']);
  });

  it('lets every state be reached from idle', () => {
    const reached = new Set<PackState>(['idle']);
    const queue: PackState[] = ['idle'];
    while (queue.length) for (const next of TRANSITIONS[queue.shift()!]) if (!reached.has(next)) reached.add(next) && queue.push(next);
    expect(reached.size).toBe(Object.keys(TRANSITIONS).length);
  });
});

describe('structure', () => {
  const parts = (nodes: readonly PartNode[]): string[] =>
    nodes.flatMap((node) => [node.part, ...parts((node.children ?? []).filter((c): c is PartNode => 'part' in c))]);

  it('only uses known parts', () => {
    for (const part of parts([...PACK_STRUCTURE, CARD_STRUCTURE])) expect(PARTS).toContain(part);
  });

  it('renders slots and skips optional nodes without content', () => {
    const render = (back: boolean) =>
      renderTree<string>([CARD_STRUCTURE], {
        element: (node, children) => `${node.part}(${children.join(',')})`,
        slot: (name) => (name === 'card-content' ? ['IMG'] : name === 'card-back' && back ? ['BACK'] : null),
      });
    expect(render(false)).toEqual(['card(card-flip(card-front(IMG)))']);
    expect(render(true)).toEqual(['card(card-flip(card-front(IMG),card-back(BACK)))']);
  });
});

describe('suggestions', () => {
  it('computes edit distances', () => {
    expect(levenshtein('sparks', 'sparks')).toBe(0);
    expect(levenshtein('sprks', 'sparks')).toBe(1);
    expect(levenshtein('', 'abc')).toBe(3);
  });

  it('suggests the closest candidate within the limit', () => {
    expect(suggest('minimall', ['full', 'minimal', 'none'])).toBe('minimal');
    expect(suggest('xyz', ['full', 'minimal', 'none'])).toBeNull();
  });
});
