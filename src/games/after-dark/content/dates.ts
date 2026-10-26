export interface DateDimension {
  id: string;
  label: string;
  options: string[];
  /** Turns the chosen option into a sentence fragment. */
  phrase: (o: string) => string;
}

export const DATE_DIMENSIONS: DateDimension[] = [
  { id: 'location', label: 'Location', options: ['A rooftop', 'A quiet beach', 'Home, transformed', 'A cabin in the hills', 'A hotel suite'], phrase: (o) => `at ${o.toLowerCase()}` },
  { id: 'atmosphere', label: 'Atmosphere', options: ['Candlelit', 'Starry and open-air', 'Cosy and warm', 'Glamorous', 'Playful and light'], phrase: (o) => `with a ${o.toLowerCase()} feel` },
  { id: 'music', label: 'Music', options: ['Slow jazz', 'Our song on repeat', 'Acoustic covers', 'Old Bollywood romance', 'Silence and the sea'], phrase: (o) => `${o.toLowerCase()} playing` },
  { id: 'food', label: 'Food', options: ['A dinner we cook together', 'A tasting menu', 'Street food and dessert', 'A picnic', 'Breakfast for dinner'], phrase: (o) => o.toLowerCase() },
  { id: 'dress', label: 'Dress code', options: ['Dressed up', 'Smart casual', 'Matching outfits', 'Cosy loungewear', 'Something the other picks'], phrase: (o) => `${o.toLowerCase()}` },
  { id: 'activity', label: 'Activity', options: ['Slow dancing', 'Stargazing', 'A long walk', 'A game for two', 'Writing each other notes'], phrase: (o) => o.toLowerCase() },
  { id: 'budget', label: 'Budget', options: ['Free', 'Small', 'Moderate', 'A treat', 'Splurge'], phrase: (o) => `a ${o.toLowerCase()} budget` },
  { id: 'surprise', label: 'Surprise element', options: ['A handwritten letter', 'A secret playlist', 'A small gift', 'A blindfolded arrival', 'A question saved for the end'], phrase: (o) => o.toLowerCase() },
];

/** Deterministic concept from both players' picks (no AI involved). */
export function buildConcept(picks: Record<1 | 2, Record<string, number>>, names: Record<1 | 2, string>): string {
  const pick = (dim: DateDimension, seat: 1 | 2) => dim.options[picks[seat][dim.id] ?? 0] ?? dim.options[0]!;
  const both = (dim: DateDimension) => {
    const a = pick(dim, 1);
    const b = pick(dim, 2);
    return a === b ? { same: true, a, b } : { same: false, a, b };
  };
  const [loc, atm, mus, food, dress, act, budget, surp] = DATE_DIMENSIONS.map(both) as ReturnType<typeof both>[];
  const L = DATE_DIMENSIONS;
  const lines: string[] = [];
  lines.push(
    loc!.same
      ? `An evening ${L[0]!.phrase(loc!.a)}, ${L[1]!.phrase(atm!.a)}.`
      : `Start ${L[0]!.phrase(loc!.a)} (${names[1]}'s pick) and end ${L[0]!.phrase(loc!.b)} (${names[2]}'s pick), ${L[1]!.phrase(atm!.same ? atm!.a : `${atm!.a} then ${atm!.b}`)}.`,
  );
  lines.push(mus!.same ? `Music: ${mus!.a.toLowerCase()}.` : `Music: ${mus!.a.toLowerCase()} first, then ${mus!.b.toLowerCase()}.`);
  lines.push(food!.same ? `To eat: ${food!.a.toLowerCase()}.` : `To eat: ${food!.a.toLowerCase()}, with ${food!.b.toLowerCase()} for dessert.`);
  lines.push(dress!.same ? `Dress code: ${dress!.a.toLowerCase()}.` : `Dress code: ${names[1]} goes ${dress!.a.toLowerCase()}, ${names[2]} goes ${dress!.b.toLowerCase()}.`);
  lines.push(act!.same ? `The main event: ${act!.a.toLowerCase()}.` : `The main event: ${act!.a.toLowerCase()}, then ${act!.b.toLowerCase()}.`);
  const budgets = L[6]!.options;
  const lower = budgets.indexOf(budget!.a) <= budgets.indexOf(budget!.b) ? budget!.a : budget!.b;
  lines.push(`Budget: ${lower.toLowerCase()}${budget!.same ? '' : ' (the lower of your two picks)'}.`);
  lines.push(surp!.same ? `Surprise: ${surp!.a.toLowerCase()}.` : `Surprises: ${names[1]} brings ${surp!.a.toLowerCase()}, ${names[2]} brings ${surp!.b.toLowerCase()}.`);
  return lines.join('\n');
}
