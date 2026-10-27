// The weekly email (opt-in, in Settings): sketchbooks people you follow updated that week, and the likes,
// followers and comments your own work got. Sent on Mondays by the daily cron, only when there's something new.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { emailPage, esc, row, INK, MUTED, RULE, SANS, SERIF } from './emailLayout.js';

const WEEK = 7 * 86_400_000;

/** The unsubscribe link's signature: only the server (it knows CRON_SECRET) can make one for an account. */
export const unsubSig = (uid: string) => createHmac('sha256', process.env.CRON_SECRET || '').update('weekly:' + uid).digest('hex').slice(0, 32);
export const unsubOk = (uid: string, sig: string) => {
  const a = Buffer.from(unsubSig(uid)), b = Buffer.from(sig || '');
  return a.length === b.length && timingSafeEqual(a, b);
};
export const unsubUrl = (origin: string, uid: string) => `${origin}/api/cron?unsub=${encodeURIComponent(uid)}&t=${unsubSig(uid)}`;

interface Updated { name: string; artist: string; url: string; img: string; pages: number; at: number }
interface Week { updated: Updated[]; likes: number; followers: number; comments: number; mentions: number; quotes: { from: string; book: string; text: string }[] }

/** What happened for this person since `since`; null when there's nothing worth an email. */
export async function weekFor(db: Firestore, uid: string, since: number, origin: string): Promise<Week | null> {
  const [notes, following] = await Promise.all([
    db.collection('users').doc(uid).collection('notifications').where('at', '>', since).get(),
    db.collection('users').doc(uid).collection('following').get(),
  ]);
  const w: Week = { updated: [], likes: 0, followers: 0, comments: 0, mentions: 0, quotes: [] };
  for (const d of notes.docs) {
    const n = d.data();
    if (n.type === 'like' || n.type === 'commentLike') w.likes++;
    else if (n.type === 'follow') w.followers++;
    else if (n.type === 'comment' || n.type === 'reply' || n.type === 'mention') {
      if (n.type === 'mention') w.mentions++; else w.comments++;
      if (w.quotes.length < 3 && n.text) w.quotes.push({ from: n.fromName || 'Someone', book: n.bookName || 'a sketchbook', text: n.text });
    }
  }
  // Sketchbooks by people they follow, shown in Explore, changed this week (newest first, up to four).
  const ids = following.docs.map(d => d.id);
  for (let i = 0; i < ids.length && i < 300; i += 30) {
    const q = await db.collection('books').where('ownerId', 'in', ids.slice(i, i + 30)).get();
    for (const b of q.docs) {
      const x = b.data();
      if (x.isPublic === false || x.linkOnly || x.mature || (x.updatedAt || 0) <= since || !(x.pageCount > 0)) continue;
      const pages: string[] = x.pages || [], img = [...pages].reverse().find(u => /^https:/.test(u)) || '';
      w.updated.push({ name: x.name || 'sketchbook', artist: x.ownerName || x.ownerHandle || '', url: `${origin}/@${x.ownerHandle}/${b.id}`, img, pages: x.pageCount, at: x.updatedAt });
    }
  }
  w.updated.sort((a, b) => b.at - a.at); w.updated = w.updated.slice(0, 4);
  return w.updated.length || w.likes || w.followers || w.comments || w.mentions ? w : null;
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export interface WeekPrompt { title: string; note: string; tag: string }
export const emptyWeek = (): Week => ({ updated: [], likes: 0, followers: 0, comments: 0, mentions: 0, quotes: [] });

export function weeklyEmail(name: string, w: Week, origin: string, unsub: string, prompt?: WeekPrompt | null) {
  const first = name.trim().split(/\s+/)[0] || 'there', rows: string[] = [row.text(`Hi ${esc(first)}, here’s your week on fletora.`)];
  // This week's prompt first: it's what there is to do this week.
  if (prompt) {
    const url = `${origin}/explore?tag=${encodeURIComponent(prompt.tag)}`;
    rows.push(row.label('This week’s prompt'));
    rows.push(`<tr><td style="padding-bottom:${prompt.note ? 6 : 14}px"><a href="${url}" style="font:400 30px/1.15 ${SERIF};color:${INK};text-decoration:none">${esc(prompt.title)}</a></td></tr>`);
    if (prompt.note) rows.push(row.small(esc(prompt.note), 14));
    rows.push(`<tr><td style="padding-bottom:26px"><a href="${url}" style="font:500 14px/1 ${SANS};color:${INK}">See entries and join in →</a></td></tr>`);
  }
  if (w.updated.length) {
    rows.push(row.label('New from people you follow'));
    rows.push(`<tr><td style="padding-bottom:22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${w.updated.map(u =>
      `<tr><td width="72" valign="top" style="padding:0 16px 16px 0"><a href="${u.url}"><img src="${esc(u.img)}" width="72" height="96" alt="" style="display:block;width:72px;height:96px;object-fit:cover;border:1px solid ${RULE};background:#f3efe6"></a></td>`
      + `<td valign="middle" style="padding-bottom:16px"><a href="${u.url}" style="font:400 22px/1.15 ${SERIF};color:${INK};text-decoration:none">${esc(u.name)}</a>`
      + `<div style="font:400 13px/1.5 ${SANS};color:${MUTED};padding-top:4px">${esc(u.artist)} · ${plural(u.pages, 'page')}</div></td></tr>`).join('')}</table></td></tr>`);
  }
  const bits = [w.likes && plural(w.likes, 'like'), w.followers && plural(w.followers, 'new follower'), w.comments && plural(w.comments, 'comment'), w.mentions && plural(w.mentions, 'mention')].filter(Boolean) as string[];
  if (bits.length) {
    rows.push(row.label('On your work'));
    rows.push(`<tr><td style="font:400 30px/1.2 ${SERIF};color:${INK};padding-bottom:${w.quotes.length ? 16 : 24}px">${bits.join(' · ')}</td></tr>`);
    for (const q of w.quotes) rows.push(`<tr><td style="padding:0 0 14px 14px;border-left:2px solid ${RULE}"><div style="font:400 15px/1.5 ${SANS};color:${INK}">“${esc(q.text)}”</div><div style="font:400 12px/1.5 ${SANS};color:${MUTED};padding-top:2px">${esc(q.from)} on <i>${esc(q.book)}</i></div></td></tr>`);
    if (w.quotes.length) rows.push('<tr><td style="padding-bottom:12px"></td></tr>');
  }
  rows.push(row.button(origin, 'Open fletora'));
  rows.push(row.small(`You’re getting this because you turned on the weekly email in Settings. <a href="${unsub}" style="color:${MUTED}">Unsubscribe</a>.`, 0));
  const subject = !w.updated.length && prompt && !(w.likes || w.followers || w.comments || w.mentions) ? `This week on fletora: ${prompt.title}` : w.updated.length ? `New pages from ${w.updated[0].artist}${w.updated.length > 1 ? ' and others' : ''}` : `Your week on fletora: ${bits.join(', ')}`;
  const html = emailPage({ title: subject, origin, heading: 'Your week on <em>fletora</em>', rows });
  const text = [`Hi ${first}, here’s your week on fletora.`,
    ...(prompt ? ['', `This week’s prompt: ${prompt.title}${prompt.note ? ' (' + prompt.note + ')' : ''}`, `${origin}/explore?tag=${encodeURIComponent(prompt.tag)}`] : []),
    ...(w.updated.length ? ['', 'New from people you follow:', ...w.updated.map(u => `- ${u.name} by ${u.artist}: ${u.url}`)] : []),
    ...(bits.length ? ['', `On your work: ${bits.join(', ')}`, ...w.quotes.map(q => `- "${q.text}" (${q.from} on ${q.book})`)] : []),
    '', origin, '', `Unsubscribe: ${unsub}`].join('\n');
  return { subject, html, text };
}

/** Sends the week's emails (on Mondays, or whenever `force`); returns how many went. */
export async function sendWeekly(db: Firestore, auth: { getUser(uid: string): Promise<{ email?: string }> }, o: { now: number; origin: string; from: string; force?: boolean }) {
  if (!process.env.RESEND_API_KEY || (!o.force && new Date(o.now).getUTCDay() !== 1)) return 0;
  const on = await db.collection('emailPrefs').where('weekly', '==', true).get();
  // The week's prompt, if one is running: in every email, and reason enough to send one.
  const pd = (await db.collection('prompts').doc('current').get().catch(() => null))?.data();
  const prompt: WeekPrompt | null = pd?.title && (pd.ends || 0) > o.now ? { title: String(pd.title), note: String(pd.note || ''), tag: String(pd.tag || '') } : null;
  let sent = 0;
  for (const d of on.docs) {
    const last = d.get('lastWeekly') || 0; if (!o.force && o.now - last < WEEK - 86_400_000) continue;
    try {
      const u = await auth.getUser(d.id).catch(() => null); if (!u?.email) continue;
      const w = await weekFor(db, d.id, Math.max(last, o.now - WEEK), o.origin) || (prompt ? emptyWeek() : null);
      if (w) {
        const name = ((await db.collection('users').doc(d.id).get()).get('name') as string) || '', unsub = unsubUrl(o.origin, d.id);
        const m = weeklyEmail(name, w, o.origin, unsub, prompt);
        const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({ from: o.from, to: [u.email], subject: m.subject, html: m.html, text: m.text, headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }) });
        if (!r.ok) { console.error('resend weekly', r.status, await r.text()); continue; }
        sent++;
      }
      await d.ref.update({ lastWeekly: o.now });
    } catch (e) { console.error('weekly', d.id, e); }
  }
  return sent;
}
