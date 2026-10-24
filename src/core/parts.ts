import type { Part } from './types.js';

/** Parts without which the component cannot work (headless mode warns when one is missing). */
export const REQUIRED_PARTS = ['stage', 'pack', 'pack-body', 'pack-top', 'cards'] as const satisfies readonly Part[];

export const partSelector = (part: Part): string => `[data-part="${part}"]`;

export interface CardParts {
  card: HTMLElement;
  /** Element turned in 3D; the card itself when there is no `card-flip`. */
  flip: HTMLElement;
  front: HTMLElement;
  back: HTMLElement | null;
}

export interface PackParts {
  root: HTMLElement;
  stage: HTMLElement;
  pack: HTMLElement;
  packBody: HTMLElement;
  packTop: HTMLElement;
  cards: HTMLElement;
  cardList: CardParts[];
  packButton: HTMLElement | null;
  packDescription: HTMLElement | null;
  tearZone: HTMLElement | null;
  cut: HTMLElement | null;
  hint: HTMLElement | null;
  hintLabel: HTMLElement | null;
  shine: HTMLElement | null;
  burst: HTMLElement | null;
  effects: HTMLElement | null;
  skip: HTMLElement | null;
  announcer: HTMLElement | null;
  /** Canvas of the magic effects. */
  fx: HTMLCanvasElement | null;
}

export type QueryResult = { parts: PackParts; missing: [] } | { parts: null; missing: Part[] };

/** Finds the parts of `root`, ignoring those of nested `<pack-opening>` elements. */
export function queryParts(root: HTMLElement): QueryResult {
  const owned = (el: Element) => el.closest('pack-opening') === root || !root.matches('pack-opening');
  const find = (part: Part, scope: Element = root) =>
    Array.from(scope.querySelectorAll<HTMLElement>(partSelector(part))).find(owned) ?? null;

  const missing = REQUIRED_PARTS.filter((part) => !find(part));
  if (missing.length) return { parts: null, missing };

  const cards = find('cards')!;
  const fx = find('fx');
  const cardList = Array.from(cards.querySelectorAll<HTMLElement>(partSelector('card')))
    .filter((card) => owned(card) && card.parentElement?.closest(partSelector('cards')) === cards)
    .map((card): CardParts => {
      const flip = find('card-flip', card) ?? card;
      return { card, flip, front: find('card-front', card) ?? flip, back: find('card-back', card) };
    });

  return {
    missing: [],
    parts: {
      root,
      stage: find('stage')!,
      pack: find('pack')!,
      packBody: find('pack-body')!,
      packTop: find('pack-top')!,
      cards,
      cardList,
      packButton: find('pack-button'),
      packDescription: find('pack-description'),
      tearZone: find('tear-zone'),
      cut: find('cut'),
      hint: find('hint'),
      hintLabel: find('hint-label'),
      shine: find('shine'),
      burst: find('burst'),
      effects: find('effects'),
      skip: find('skip'),
      announcer: find('announcer'),
      fx: fx instanceof HTMLCanvasElement ? fx : null,
    },
  };
}
