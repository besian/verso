// Weekly prompts: a new theme every Monday, the same for everyone. Joining one just adds its tag
// to a sketchbook, so Explore can gather everyone's pages for it.
const WORDS = ['Hands', 'Windows', 'Shadows', 'Something blue', 'Your shoes', 'Morning', 'Strangers', 'Plants', 'Rooftops', 'Leftovers',
  'Self-portrait', 'Water', 'Things you carry', 'Doors', 'Faces in a crowd', 'Night', 'Machines', 'Folds', 'The view from here', 'Cats',
  'Bridges', 'Kitchen', 'Weather', 'Ten lines', 'Noise', 'Animals', 'Old things', 'Mirrors', 'One colour', 'Patterns'];
const START = Date.UTC(2026, 9, 19); // a Monday
const WEEK = 7 * 864e5;

export interface Prompt { word: string; tag: string; ends: Date }
export function currentPrompt(now = Date.now()): Prompt {
  const n = Math.max(0, Math.floor((now - START) / WEEK)), word = WORDS[n % WORDS.length];
  return { word, tag: word.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), ends: new Date(START + (n + 1) * WEEK) };
}
