import { CARD_STRUCTURE, PACK_STRUCTURE, renderTree, type PartNode, type SlotName } from '../core/structure.js';

export interface AutoRender {
  /** Puts the user's original children back (plus any added since). */
  restore(): void;
}

/** The booster: `[data-pack]`, or the first child that is not a card. */
export function findPackSource(root: HTMLElement): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>(':scope > [data-pack]') ??
    root.querySelector<HTMLElement>(':scope > :not([data-card]):not([data-part])')
  );
}

const createElement = (node: PartNode, children: Node[]): HTMLElement => {
  const el = document.createElement(node.tag);
  el.dataset.part = node.part;
  for (const [name, value] of Object.entries(node.attrs ?? {})) el.setAttribute(name, value);
  el.append(...children);
  return el;
};

/** Copy of the booster used for the torn-off strip: no duplicate ids. */
function copyOf(node: HTMLElement): HTMLElement {
  const copy = node.cloneNode(true) as HTMLElement;
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
  return copy;
}

function cardBackImage(src: string): HTMLImageElement {
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.draggable = false;
  return img;
}

/**
 * Auto mode: builds every part around the user's children. Their nodes are moved, never
 * cloned (except the decorative copy of the booster), so listeners and state survive.
 */
export function renderAuto(root: HTMLElement, cardBack: string | null): AutoRender | null {
  const pack = findPackSource(root);
  if (!pack) return null;

  const original = Array.from(root.childNodes);
  const sources = Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-card]'));

  const cards = sources.map((source) => {
    const [card] = renderTree<Node>([CARD_STRUCTURE], {
      element: createElement,
      slot: (name: SlotName) =>
        name === 'card-content' ? [source] : name === 'card-back' && cardBack ? [cardBackImage(cardBack)] : null,
    }) as [HTMLElement];
    if (source.dataset.rarity) card.dataset.rarity = source.dataset.rarity;
    if (source.dataset.value) card.dataset.value = source.dataset.value;
    const glow = source.style.getPropertyValue('--po-card-glow');
    if (glow) card.style.setProperty('--po-card-glow', glow);
    return card;
  });

  const slots: Partial<Record<SlotName, Node[]>> = { pack: [pack], 'pack-copy': [copyOf(pack)], cards };
  const generated = renderTree<Node>(PACK_STRUCTURE, { element: createElement, slot: (name) => slots[name] ?? null });
  root.replaceChildren(...generated);

  return {
    restore() {
      const added = Array.from(root.childNodes).filter((node) => !generated.includes(node));
      root.replaceChildren(...original, ...added);
    },
  };
}
