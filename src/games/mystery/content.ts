/**
 * Public catalogue only. Clues, answers and endings live in the database
 * (migration 20261027000700) and are served per player by get_mystery().
 */
export const CASES = [
  {
    id: 'lighthouse-letter',
    title: 'The Lighthouse Letter',
    blurb: 'An anniversary letter vanishes from a hotel reception desk. Three chapters.',
  },
  {
    id: 'orchard-photograph',
    title: 'The Orchard Photograph',
    blurb: 'A prize-winning photograph disappears before judging at a summer fair. Three chapters.',
  },
] as const;
