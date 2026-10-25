// Fletora Plus: what the free plan allows, what Plus adds, and its prices. The prices must match the
// Fletora Plus product in Stripe; the limits are also enforced in firestore.rules and api/handwriting.

export const PRICE = { month: '£7', year: '£60' } as const;
/** Yearly, as a saving on paying monthly for a year. */
export const YEAR_SAVING = '29%';

export const BOOKS_FREE = 10;
export const PAGES_FREE = 60, PAGES_PLUS = 300;
export const INK_FREE = 20, INK_PLUS = 500;

export const PERKS: [string, string][] = [
  ['Unlimited sketchbooks', `Free accounts have ${BOOKS_FREE}.`],
  [`Up to ${PAGES_PLUS} pages per sketchbook`, `Instead of ${PAGES_FREE}.`],
  [`${INK_PLUS} handwriting conversions a month`, `Instead of ${INK_FREE}.`],
  ['Link-only sketchbooks', 'Hidden from Explore and your profile, open to anyone you send the link to.'],
  ['Stats', 'Views, likes and saves for each sketchbook, and where visitors came from.'],
  ['Pin a sketchbook', 'Keep your best one first on your profile.'],
  ['The Plus mark', 'A small mark by your name, and early access to new features.'],
];

/** Why the upgrade sheet opened, shown as its first line. */
export const REASONS: Record<string, string> = {
  books: `Free accounts can have ${BOOKS_FREE} sketchbooks.`,
  pages: `Free sketchbooks hold up to ${PAGES_FREE} pages.`,
  ink: `You’ve used this month’s ${INK_FREE} handwriting conversions.`,
  link: 'Link-only sketchbooks are part of Plus.',
  stats: 'Stats are part of Plus.',
  pin: 'Pinning a sketchbook is part of Plus.',
};
