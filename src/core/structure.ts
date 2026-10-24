import type { Part } from './types.js';

/** Content provided by the user (auto mode: their children; React/Vue: props and slots). */
export type SlotName = 'pack' | 'pack-copy' | 'cards' | 'card-content' | 'card-back';

export interface PartNode {
  part: Part;
  /** Tells apart siblings of the same part (keys in React and Vue). */
  key?: string;
  tag: 'div' | 'button' | 'span' | 'p' | 'canvas';
  attrs?: Readonly<Record<string, string>>;
  /** Only rendered when this slot has content. */
  when?: SlotName;
  children?: readonly PartChild[];
}

export type PartChild = PartNode | { slot: SlotName };

const decorative = { 'aria-hidden': 'true' } as const;

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

/** The four edges of a 3D box (`depth` feature): visible depending on the view and the tilt. */
const sides = (part: 'pack-side' | 'deck-side'): PartNode[] =>
  SIDES.map((side) => ({ part, key: `${part}-${side}`, tag: 'div', attrs: { ...decorative, 'data-side': side } }));

/**
 * Structure of a pack, shared by the auto mode (DOM), React and Vue so they never drift apart.
 * Order matters only for readability: stacking is set in base.css.
 */
export const PACK_STRUCTURE: readonly PartNode[] = [
  {
    part: 'stage',
    tag: 'div',
    children: [
      { part: 'cards', tag: 'div', children: [{ slot: 'cards' }, ...sides('deck-side')] },
      {
        part: 'pack',
        tag: 'div',
        children: [
          { part: 'pack-body', tag: 'div', children: [{ slot: 'pack' }] },
          { part: 'pack-top', tag: 'div', attrs: decorative, children: [{ slot: 'pack-copy' }] },
          ...sides('pack-side'),
          { part: 'shine', tag: 'div', attrs: decorative },
          { part: 'hint', tag: 'div', attrs: decorative },
          { part: 'cut', tag: 'div', attrs: decorative },
          { part: 'burst', tag: 'div', attrs: decorative },
          { part: 'effects', tag: 'div', attrs: decorative },
          { part: 'pack-button', tag: 'button', attrs: { type: 'button' } },
          { part: 'tear-zone', tag: 'div', attrs: decorative },
          { part: 'hint-label', tag: 'p', attrs: decorative },
          { part: 'pack-description', tag: 'span' },
        ],
      },
    ],
  },
  // Particles of the magic effects (`pack-opening/magic`); hidden until an effect is loaded.
  { part: 'fx', tag: 'canvas', attrs: decorative },
  { part: 'skip', tag: 'button', attrs: { type: 'button' } },
  { part: 'announcer', tag: 'div' },
];

export const CARD_STRUCTURE: PartNode = {
  part: 'card',
  tag: 'div',
  children: [
    {
      part: 'card-flip',
      tag: 'div',
      children: [
        { part: 'card-front', tag: 'div', children: [{ slot: 'card-content' }] },
        { part: 'card-back', tag: 'div', attrs: decorative, when: 'card-back', children: [{ slot: 'card-back' }] },
      ],
    },
  ],
};

export interface TreeRenderer<N> {
  element(node: PartNode, children: N[]): N;
  slot(name: SlotName): N[] | null | undefined;
}

/** Renders the structure with any element factory (DOM, React's createElement, Vue's h). */
export function renderTree<N>(nodes: readonly PartChild[], renderer: TreeRenderer<N>): N[] {
  return nodes.flatMap((node): N[] => {
    if ('slot' in node) return renderer.slot(node.slot) ?? [];
    if (node.when && !renderer.slot(node.when)?.length) return [];
    return [renderer.element(node, renderTree(node.children ?? [], renderer))];
  });
}
