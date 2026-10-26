export type Theme = 'romance' | 'adventure' | 'comedy' | 'mystery' | 'fantasy';
export type Slot = 'hero' | 'companion' | 'setting' | 'object' | 'twist' | 'decision' | 'ending';

export const THEMES: { id: Theme; title: string; detail: string }[] = [
  { id: 'romance', title: 'Romance', detail: 'Chance meetings and slow-burning feelings' },
  { id: 'adventure', title: 'Adventure', detail: 'Journeys, maps and narrow escapes' },
  { id: 'comedy', title: 'Comedy', detail: 'Everything that can go wrong, does' },
  { id: 'mystery', title: 'Mystery', detail: 'Secrets, clues and a reveal' },
  { id: 'fantasy', title: 'Fantasy', detail: 'Magic hiding in ordinary places' },
];

export const SLOTS: { id: Slot; label: string; ask: string; template: (pick: string) => string }[] = [
  { id: 'hero', label: 'Character', ask: 'Choose who the story is about.', template: (p) => `Our story begins with ${p}.` },
  { id: 'companion', label: 'Companion', ask: 'Choose who they meet.', template: (p) => `Before long, they cross paths with ${p}.` },
  { id: 'setting', label: 'Setting', ask: 'Choose where it all happens.', template: (p) => `It all unfolds ${p}.` },
  { id: 'object', label: 'Object', ask: 'Choose the thing that changes everything.', template: (p) => `At the centre of it all is ${p}.` },
  { id: 'twist', label: 'Plot twist', ask: 'Choose the twist.', template: (p) => `Then, without warning, ${p}.` },
  { id: 'decision', label: 'Decision', ask: 'Choose what they decide.', template: (p) => `Together, they decide ${p}.` },
  { id: 'ending', label: 'Ending', ask: 'Choose how it ends.', template: (p) => p },
];

export const DECKS: Record<Theme, Record<Slot, string[]>> = {
  romance: {
    hero: ['a bookbinder who repairs other people’s love letters', 'a night-shift baker who sings to the dough', 'a ferry captain who has never left the harbour', 'a wedding photographer who has stopped believing in weddings'],
    companion: ['a stranger who keeps choosing the same book from the library', 'a travelling piano tuner with a terrible sense of direction', 'an old friend who moved away eleven years ago', 'a florist who refuses to sell red roses'],
    setting: ['in a seaside town during the last week of summer', 'on a night train crossing three countries', 'in a rooftop garden above a busy market', 'at a lighthouse that only opens once a year'],
    object: ['a postcard that was never sent', 'a pair of mismatched gloves', 'a recipe written in two different handwritings', 'a key to a door nobody can find'],
    twist: ['the letters turn out to have been written to each other', 'a storm cancels every way home', 'they discover they were at the same concert ten years ago', 'the shop they love is about to close forever'],
    decision: ['to stay one more day, and then another', 'to finish what the old letters started', 'to open a tiny shop of their own', 'to stop waiting for the perfect moment'],
    ending: ['Years later, they still leave each other notes in library books.', 'The lighthouse lamp is lit again, and this time it is for them.', 'They never did find the door, but they built a home around the key.', 'On the last page of the recipe, a third handwriting appears: their own.'],
  },
  adventure: {
    hero: ['a retired mapmaker with one unfinished map', 'a mountain guide afraid of heights', 'a young archivist who reads every expedition diary', 'a sailor who navigates by the sound of the sea'],
    companion: ['a goat that seems to know the way', 'a cartographer’s grandchild with half the clues', 'a pilot whose plane runs on stubbornness', 'a rival explorer who keeps arriving first'],
    setting: ['across a desert that moves every night', 'deep inside a jungle where the river runs uphill', 'on a chain of islands that appear only at low tide', 'high in mountains no map agrees on'],
    object: ['a compass that points to what you want most', 'a torn diary page with a riddle', 'a lantern that never runs out', 'a coin from a city that does not exist'],
    twist: ['the map turns out to be upside down', 'their rival saves their lives', 'the treasure is a message from the first explorer', 'the path behind them disappears'],
    decision: ['to go on without the map', 'to share the discovery with the world', 'to trust the goat', 'to turn back for someone left behind'],
    ending: ['They come home empty-handed and richer than ever.', 'Their names are added to the bottom of the old map, in small, proud letters.', 'The compass finally stops spinning, pointing at the person beside them.', 'Next summer, they set out again, this time without a plan.'],
  },
  comedy: {
    hero: ['a wedding planner who has never been to a wedding on time', 'a magician whose tricks only work when nobody is watching', 'a chef allergic to his own signature dish', 'a dog trainer whose dog is in charge'],
    companion: ['an overly honest parrot', 'a neighbour who borrows everything and returns it improved', 'a tour guide who is lost in their own city', 'a grandmother with a black belt'],
    setting: ['at a cooking competition broadcast live by mistake', 'in a hotel where every room is booked twice', 'at the world’s most chaotic family reunion', 'on a cruise ship that forgot to leave port'],
    object: ['a cake that keeps getting bigger', 'a wrongly delivered suitcase full of costumes', 'a phone that only autocorrects to compliments', 'a trophy nobody remembers winning'],
    twist: ['the parrot gives a toast', 'the costumes fit perfectly', 'everyone realises they are at the wrong party', 'the dog wins the competition'],
    decision: ['to commit to the costumes completely', 'to pretend it was all planned', 'to let the grandmother handle it', 'to throw a better party right there'],
    ending: ['It is still described as the best disaster anyone has attended.', 'The cake is now a local landmark.', 'The parrot is booked for every wedding in town.', 'They never explain the trophy, and nobody asks.'],
  },
  mystery: {
    hero: ['a crossword setter who notices patterns everywhere', 'a hotel night porter who never sleeps', 'a retired detective running a teashop', 'a museum guard who talks to the paintings'],
    companion: ['a journalist who asks one question too many', 'a cat that keeps appearing at crime scenes', 'a librarian with an unusual memory', 'a twin who might be the other twin'],
    setting: ['in a snowed-in country house', 'aboard an overnight sleeper train', 'in a museum after closing time', 'in a village where every clock shows a different time'],
    object: ['a pocket watch stopped at 11:52', 'a letter written in invisible ink', 'a painting with one figure missing', 'a menu with one dish crossed out'],
    twist: ['the victim walks in for dinner', 'the clues were planted to be found', 'the painting was swapped years ago', 'the cat belongs to the culprit'],
    decision: ['to set a trap at midnight', 'to trust the least likely suspect', 'to read the crossword backwards', 'to tell the truth in front of everyone'],
    ending: ['The final clue was in the very first sentence all along.', 'The culprit confesses, and asks for the recipe.', 'The clocks are set right, and the village sleeps soundly for the first time in years.', 'They close the case and open a detective agency for two.'],
  },
  fantasy: {
    hero: ['a lamplighter in a city where some lamps light memories', 'an apprentice witch who is bad at magic but good at kindness', 'a dragon who collects teacups instead of gold', 'a cloud shepherd who keeps the weather in a notebook'],
    companion: ['a fox who can only speak in rhymes', 'a ghost who is very polite about haunting', 'a tree that walks when nobody is looking', 'a knight who would rather be a gardener'],
    setting: ['in a library where the books rearrange themselves at night', 'in a market that only appears under a full moon', 'in a valley where it always snows upwards', 'in a castle built inside a giant seashell'],
    object: ['a map that draws itself as you walk', 'a seed that grows into whatever you need', 'a spoon that stirs up memories', 'a feather that writes the truth'],
    twist: ['the dragon turns out to be the rightful queen', 'the ghost was never dead, only forgotten', 'the moon market sells tomorrow', 'the seed grows into a door'],
    decision: ['to plant the seed in the middle of the city', 'to give the memories back to their owners', 'to open the door and go through together', 'to ask the fox for one last rhyme'],
    ending: ['From then on, every lamp in the city lights a happy memory.', 'They still visit the moon market, but they never buy tomorrow.', 'The library writes them into its newest book.', 'And the weather that day was simply, perfectly, kind.'],
  },
};
