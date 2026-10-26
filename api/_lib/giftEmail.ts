// The email someone gets when a moderator gives them Plus (api/billing, action 'gift').
import { emailPage, esc, row } from './emailLayout.js';

const PERKS = [
  'Unlimited sketchbooks, with up to 300 pages each',
  'Pages saved at full resolution, with twice the detail',
  'Download any sketchbook as a PDF, laid out to print',
  'Draw together with up to 5 people in a sketchbook',
  'Link-only sketchbooks, open to anyone with the link',
  'Stats: views, likes, saves and where visitors came from',
  'Pin a sketchbook to your profile, and the Plus mark by your name',
  'Handwriting to text up to 500 times a month',
];

export function giftEmail(name: string, until: number, forever: boolean, origin: string) {
  const day = new Date(until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const lead = `Hi ${esc(name || 'there')}, the Fletora team has given you Fletora Plus, free, ${forever ? 'with no end date' : `until ${day}`}. It’s already switched on: there’s nothing to set up and nothing to pay.`;
  const after = forever
    ? 'There’s no card on file, so you’ll never be charged for this.'
    : `There’s no card on file, so you won’t be charged. After ${day} your account goes back to the free plan unless you choose to keep Plus: nothing you’ve made is deleted.`;
  const subject = forever ? 'You’ve been given Fletora Plus' : `You’ve been given Fletora Plus until ${day}`;
  const html = emailPage({
    title: subject, origin, heading: 'A gift for you: <em>Fletora Plus</em>',
    rows: [row.text(lead), row.label('What you get'), row.ticks(PERKS), row.button(`${origin}/sketchbooks`, 'Open your sketchbooks'), row.small(after), row.small('Questions? Just reply to this email, or write to hello@fletora.studio.', 0)],
  });
  const text = `${lead}\n\nWhat you get:\n${PERKS.map(p => `- ${p}`).join('\n')}\n\nOpen your sketchbooks: ${origin}/sketchbooks\n\n${after}\n\nQuestions? Just reply to this email, or write to hello@fletora.studio.`;
  return { subject, html, text };
}
