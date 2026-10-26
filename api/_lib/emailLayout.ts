// fletora's look for emails: the paper and ink colours, Instrument Serif headings and Geist text (the site's
// fonts; mail apps that can't load them fall back to Georgia and Helvetica), the logo with its red full stop, ink
// rules, and the site's footer links. Tables and inline styles, as email needs.

export const PAPER = '#F4F1E9', CARD = '#FBFAF6', INK = '#222320', MARK = '#AD493A', MUTED = '#77756E', RULE = '#E2DED3';
export const SERIF = '\'Instrument Serif\',Georgia,\'Times New Roman\',serif', SANS = '\'Geist\',Helvetica,Arial,sans-serif';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Building blocks for an email's body (each a table row). */
export const row = {
  text: (html: string, pad = 22) => `<tr><td style="font:400 16px/1.6 ${SANS};color:${INK};padding-bottom:${pad}px">${html}</td></tr>`,
  small: (html: string, pad = 10) => `<tr><td style="font:400 13px/1.6 ${SANS};color:${MUTED};padding-bottom:${pad}px">${html}</td></tr>`,
  label: (t: string) => `<tr><td style="font:600 11px/1 ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${MARK};padding-bottom:14px">${esc(t)}</td></tr>`,
  ticks: (items: string[]) => `<tr><td style="padding-bottom:26px"><table role="presentation" cellpadding="0" cellspacing="0">${items.map(p =>
    `<tr><td valign="top" style="font:500 15px/1.5 ${SANS};color:${MARK};padding:0 12px 9px 0">✓</td><td style="font:400 15px/1.5 ${SANS};color:${INK};padding-bottom:9px">${esc(p)}</td></tr>`).join('')}</table></td></tr>`,
  button: (href: string, t: string) => `<tr><td style="padding:4px 0 30px"><a href="${href}" style="display:inline-block;background:${INK};color:${PAPER};padding:15px 28px;font:500 15px/1 ${SANS};letter-spacing:.01em;text-decoration:none">${esc(t)}</a></td></tr>`,
};

/** A whole email: logo, heading (may hold <em> for the italic word, as the site's headings do), body rows, footer. */
export function emailPage(o: { title: string; heading: string; rows: string[]; origin: string }) {
  const link = (p: string, t: string) => `<a href="${o.origin}${p}" style="color:${MUTED};text-decoration:none">${t}</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${esc(o.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:${PAPER}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 4px 18px;border-bottom:1px solid ${INK}"><a href="${o.origin}" style="font:400 34px/1 ${SERIF};letter-spacing:-.01em;color:${INK};text-decoration:none">fletora<span style="color:${MARK}">.</span></a></td></tr>
<tr><td style="background:${CARD};border:1px solid ${RULE};border-top:none;padding:36px 34px 30px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font:400 36px/1.1 ${SERIF};letter-spacing:-.01em;color:${INK};padding-bottom:20px">${o.heading}</td></tr>
${o.rows.join('\n')}
</table></td></tr>
<tr><td align="center" style="padding:26px 0 0;font:400 12px/1.8 ${SANS};color:${MUTED}">${link('/plus', 'Plus')} &nbsp;·&nbsp; ${link('/privacy', 'Privacy')} &nbsp;·&nbsp; ${link('/terms', 'Terms')} &nbsp;·&nbsp; ${link('/contact', 'Contact')}</td></tr>
<tr><td align="center" style="padding:8px 0 0;font:400 12px/1 ${SANS};color:${MUTED}"><span style="font:400 16px/1 ${SERIF};color:${INK}">fletora<span style="color:${MARK}">.</span></span> &nbsp;© ${new Date().getFullYear()}</td></tr>
</table></td></tr></table></body></html>`;
}
