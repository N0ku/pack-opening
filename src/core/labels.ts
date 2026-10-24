import { LOCALES, type CardInfo, type Locale, type PackOpeningLabels } from './types.js';

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);
const withRarity = (card: CardInfo) => (card.rarityLabel ? `${card.name}, ${card.rarityLabel}` : card.name);

const en: PackOpeningLabels = {
  root: 'Booster pack',
  openPack: 'Open the pack',
  openHint: ({ swipe, tap }) =>
    swipe && tap
      ? 'Swipe along the top edge or tap the pack to open it. You can also press Enter.'
      : swipe
        ? 'Swipe along the top edge to tear the pack open, or press Enter.'
        : tap
          ? 'Tap the pack or press Enter to open it.'
          : 'Press Enter to open the pack.',
  hintLabel: ({ swipe, tap }) => (swipe ? 'Swipe to open' : tap ? 'Tap to open' : ''),
  flipCard: (card) => `Flip card ${card.index + 1} of ${card.total}`,
  nextCard: (card) => `${withRarity(card)}. Card ${card.index + 1} of ${card.total}. Next card`,
  revealAll: 'Reveal all',
  summary: 'Cards in this pack',
  opened: (total) => `Pack opened, ${total} ${plural(total, 'card', 'cards')}`,
  revealed: (card) => `Card ${card.index + 1} of ${card.total}: ${withRarity(card)}`,
  complete: 'All cards revealed',
  rarity: { common: 'common', rare: 'rare', epic: 'epic', legendary: 'legendary' },
};

const fr: PackOpeningLabels = {
  root: 'Booster de cartes',
  openPack: 'Ouvrir le booster',
  openHint: ({ swipe, tap }) =>
    swipe && tap
      ? 'Glissez le long du bord supérieur ou touchez le booster pour l’ouvrir. Vous pouvez aussi appuyer sur Entrée.'
      : swipe
        ? 'Glissez le long du bord supérieur pour déchirer le booster, ou appuyez sur Entrée.'
        : tap
          ? 'Touchez le booster ou appuyez sur Entrée pour l’ouvrir.'
          : 'Appuyez sur Entrée pour ouvrir le booster.',
  hintLabel: ({ swipe, tap }) => (swipe ? 'Glisse pour ouvrir' : tap ? 'Touche pour ouvrir' : ''),
  flipCard: (card) => `Retourner la carte ${card.index + 1} sur ${card.total}`,
  nextCard: (card) => `${withRarity(card)}. Carte ${card.index + 1} sur ${card.total}. Carte suivante`,
  revealAll: 'Tout révéler',
  summary: 'Cartes du booster',
  opened: (total) => `Booster ouvert, ${total} ${plural(total, 'carte', 'cartes')}`,
  revealed: (card) => `Carte ${card.index + 1} sur ${card.total} : ${withRarity(card)}`,
  complete: 'Toutes les cartes sont révélées',
  rarity: { common: 'commune', rare: 'rare', epic: 'épique', legendary: 'légendaire' },
};

export const BUILT_IN_LABELS: Readonly<Record<Locale, PackOpeningLabels>> = { en, fr };

/** Locale of the closest `lang` attribute, if it is one we ship. */
export function detectLocale(el: Element): Locale {
  const lang = el.closest('[lang]')?.getAttribute('lang')?.toLowerCase() ?? '';
  return LOCALES.find((locale) => lang === locale || lang.startsWith(`${locale}-`)) ?? 'en';
}

export function resolveLabels(locale: Locale, overrides: Partial<PackOpeningLabels> = {}): PackOpeningLabels {
  const base = BUILT_IN_LABELS[locale];
  return { ...base, ...overrides, rarity: { ...base.rarity, ...overrides.rarity } };
}
