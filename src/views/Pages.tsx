import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { V } from '../App';
import { hover } from '../pseudo';
import { INK, MARK, MUTED, PAPER, SANS, SERIF, label, pagePad, serif } from '../theme';
import { ADDRESS, SiteFooter } from './Footer';
import { Notice, TextArea, TextField } from './Overlays';
import { BOOKS_FREE, PAGES_FREE, PAGES_PLUS, PRICE, YEAR_SAVING } from '../plus';

const screen: CSSProperties = { position: 'absolute', inset: '0 0 var(--tabbar, 0px) 0', zIndex: 4, background: PAPER, overflowX: 'hidden', overflowY: 'auto' };
const hoverText = hover(`color:${MARK}`);
const hoverLine = hover(`color:${MARK};border-color:${MARK}`);
const underline = (fs = 14): CSSProperties => ({ padding: '4px 0', border: 'none', borderBottom: `1px solid ${INK}`, background: 'none', color: INK, font: `500 ${fs}px ${SANS}`, cursor: 'pointer' });
const contact = import.meta.env.VITE_CONTACT_EMAIL || 'hello@fletora.studio';
/** What a message on the Contact page is about; keys must match KINDS in api/contact.ts. */
export const CONTACT_KINDS = [['help', 'A question or help'], ['complaint', 'A complaint about Fletora'], ['appeal', 'Appeal a moderation decision'], ['bug', 'A problem with the site'],
  ['report', 'Reporting content or a person'], ['privacy', 'A privacy or data request'], ['billing', 'Plus and billing'], ['other', 'Something else']] as const;
const UPDATED = '26 October 2026';

function Page({ v, kicker, title, wide, children }: { v: V; kicker: string; title: ReactNode; wide?: boolean; children: ReactNode }) {
  const mob = !v.notMob;
  return (
    <div style={screen}>
      {/* Same spacing as every page; long text keeps a comfortable reading width from the same left edge. */}
      <div style={{ ...pagePad(mob, 64), display: 'flex', flexDirection: 'column', gap: 28, maxWidth: wide ? 'none' : 860, minHeight: '100%', paddingBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={label(MARK)}>{kicker}</span>
          <h1 style={{ margin: 0, ...serif(mob ? 44 : 64, 1, '-.02em') }}>{title}</h1>
        </div>
        {children}
        <SiteFooter v={v} />
      </div>
    </div>
  );
}

const prose: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, fontSize: 15, lineHeight: 1.6, color: INK, textWrap: 'pretty' } as CSSProperties;
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section id={slug(title)} data-sec={title} style={{ ...prose, paddingTop: 18, borderTop: '1px solid rgba(var(--ink-rgb),.25)', scrollMarginTop: 24 }}>
      <h2 style={{ margin: 0, ...serif(26, 1.15) }}>{title}</h2>
      {children}
    </section>
  );
}
const P = ({ children }: { children: ReactNode }) => <p style={{ margin: 0 }}>{children}</p>;
/** The opening line of the Privacy policy and Terms, across the full width above the sections. */
const Intro = ({ children }: { children: ReactNode }) => <p className="legal-intro" style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: MUTED }}>{children}</p>;
const Ul = ({ items }: { items: ReactNode[] }) => <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
const Contact = () => <>email <a href={`mailto:${contact}`}>{contact}</a> or use the Contact page</>;

function Privacy() {
  return (
    <>
      <Intro>fletora. is a place to share sketchbooks, run by Besian Morina. This page explains what we store about you, why, who can see it, how long we keep it, and your rights. Last updated {UPDATED}.</Intro>
      <Sec title="What we store">
        <Ul items={[
          <><b>Your account:</b> your email address and a password, held by Firebase Authentication (Google). Your password is never visible to us, and your email is never shown on the site. If you sign in with Google instead, Google tells us your email address and name (used for your profile, which you can change); we never see your Google password.</>,
          <><b>Your profile:</b> name, handle, bio, location, website, social links, a contact email (if you add one) and photo. These are public.</>,
          <><b>Your sketchbooks:</b> page images, drawings and typed text you add, covers, captions, dates, mediums and tags. Public sketchbooks can be seen by anyone. Link-only sketchbooks (Plus) don’t appear in Explore or on your profile, but anyone with the link can open them. Private ones can be seen only by you and the people you’ve shared that sketchbook with.</>,
          <><b>Upload checks:</b> every picture you upload (pages, covers, profile pictures) is checked automatically before anyone else can see it, for nudity, sexually explicit content and anything that sexualises children. We keep the result only as a Mature label on the sketchbook, or, for a picture that’s held back, the picture and a one-line description in private storage that only our moderators can open (see How long we keep it).</>,
          <><b>Shared sketchbooks:</b> when you share a sketchbook (with one person, or up to five with Plus), everyone in it can see its pages and the names and handles of the others in it, and can add, caption and change pages. Pages someone adds stay in the sketchbook if they leave or are removed.</>,
          <><b>Messages:</b> the messages you send and receive, so the two people in a conversation can read them. Nobody else can, including us, unless a message is reported: then its text is sent to our moderators with the report. If you delete your account, messages you sent stay in the other person’s conversation.</>,
          <><b>Activity:</b> who you follow, which sketchbooks you like and save, who you block, your notifications, the reports you file, and a daily count of new conversations you start (to prevent spam). Follows and likes are visible to others; saved sketchbooks, blocks and reports are private.</>,
          <><b>Replays:</b> when you draw on a page in Fletora, the strokes (where, with which brush and colour, and how fast) are saved with it so visitors can watch it being drawn. They’re shown to anyone who can see that sketchbook and deleted with it or with your account.</>,
          <><b>Comments:</b> what you write on a page, with your name and when. Anyone who can see that sketchbook can read them. You can delete your own at any time, and the sketchbook’s owner and our moderators can remove them; they’re deleted with your account.</>,
          <><b>Stats:</b> how many times each sketchbook is viewed and saved, and which part of the site views came from (Explore, a profile, a shared link…). These are counts only, not who viewed it, and only the sketchbook’s owner can see them.</>,
          <><b>Fletora Plus:</b> if you subscribe, Stripe collects your payment details and billing address; we never see your full card number. We keep whether you have Plus, your plan, when it renews and your Stripe customer reference, and show you your payments, the card each used and receipts from Stripe. Whether an account has Plus is public (it shows a Plus mark). Plus may also be given free by Fletora, which we record the same way. For the free trial, we keep a one-way scrambled (hashed) copy of the email address that started it, so the same address can’t start another; it can’t be turned back into the address, and we keep it even after the account is deleted, only for this purpose.</>,
          <><b>On your device:</b> small settings such as light or dark theme, page sounds, whether you’ve chosen to see Mature work and which tips you’ve seen, kept in your browser’s storage. Google Analytics for Firebase records anonymous usage (pages viewed, device type, approximate location) only if you choose Allow when asked; you can change that any time in Account settings → Your data, and choosing No removes its cookies.</>,
        ]} />
      </Sec>
      <Sec title="Why we use it">
        <P>To run your account and show your work, and to provide Plus if you subscribe (our agreement with you); to keep fletora. safe, check uploads, prevent spam and act on reports (our legitimate interest in a safe community, and our legal duties under the Online Safety Act); and anonymous analytics to improve the site, only if you’ve agreed to it (your consent, which you can withdraw).</P>
      </Sec>
      <Sec title="Who processes it">
        <P>Data is stored with Google Firebase (Authentication, Cloud Firestore and Cloud Storage), and the site is served by Vercel. Account emails (confirming your address, resetting your password, the weekly email if you turn it on in Settings) and messages you send with the Contact page’s form are sent through Resend, which receives your email address for that purpose; they reach our inbox on Google Workspace, where we keep messages for as long as we need to deal with them. Every picture you upload is sent to Anthropic’s Claude to be checked before it’s published, Anthropic doesn’t use it to train its models. When you download a sketchbook as a PDF, the PDF is made in your browser; its page images may pass through our server on Vercel on the way, and aren’t kept there. Payments for Plus are handled by Stripe, which sells the subscription to you as merchant of record and processes your payment details under its own privacy policy. These services may store data outside the UK, including in the United States, under their own terms, privacy policies and data protection safeguards. We don’t sell your data or use it for advertising.</P>
      </Sec>
      <Sec title="How long we keep it">
        <P>For as long as you have an account. When you delete your account, your profile, handle, follows, followers, saved list, blocks, notifications, every sketchbook with its images and stats, your Plus and billing records, and the counts we keep to prevent abuse (new conversations a day, upload checks, emails and contact messages sent) are removed straight away, and any subscription is cancelled. You leave sketchbooks others shared with you; pages you added there stay in them. Messages you sent stay in the other person’s conversation. Copies our providers keep for a short time (such as backups) are deleted under their own retention rules.</P>
        <P>A picture the upload check holds back is kept privately until a moderator has looked at it, then deleted; a photo the check refuses is deleted straight away. If a picture may show child sexual abuse, we report it to the Internet Watch Foundation or the National Crime Agency and keep it, and the account details that go with it, for as long as they or the law require, even if the account is deleted.</P>
        <P>Reports are kept until a moderator has dealt with them, then deleted; for serious cases we keep a short note of what was reported and what we did, without the content itself. Stripe keeps records of payments for as long as tax law requires.</P>
      </Sec>
      <Sec title="Your choices and rights">
        <Ul items={[
          'Make any sketchbook public, link-only (Plus) or private, and stop sharing it with anyone, from its Pages screen.',
          'Download any of your sketchbooks as a PDF (Plus), or leave a sketchbook someone shared with you.',
          'Edit or remove your profile details at any time, and block anyone from messaging you.',
          'Delete your account from Account settings. This permanently removes your profile, handle, follows, saved list, notifications, and every sketchbook with all its images.',
          'Download a copy of everything we hold about your account from Account settings → Your data → Download my data.',
          'You can also ask us for a copy of your data, to correct or delete it, to restrict or object to how we use it, or to move it elsewhere. We reply within one month (we may need to confirm it’s you first). If you’re unhappy with how we handle your data, you can complain to the Information Commissioner’s Office (ico.org.uk) or your local data protection authority.',
          'Turn anonymous analytics on or off in Account settings → Your data.',
          'Browsers let you block or clear cookies and site storage.',
        ]} />
      </Sec>
      <Sec title="Keeping it safe">
        <P>Access to your data is limited by security rules on our database, so only the people who should see something can. Passwords are handled by Firebase and never seen by us, and card details only by Stripe. If a breach ever put your data at risk, we’d report it to the ICO within 72 hours where the law requires, and tell you without delay if it’s likely to affect you.</P>
      </Sec>
      <Sec title="Children">
        <P>fletora. isn’t meant for children under 13, and they shouldn’t create an account. If you think a child under 13 has an account, please tell us and we’ll remove it.</P>
      </Sec>
      <Sec title="Questions">
        <P>To ask about your data or request a copy of it, <Contact />.</P>
      </Sec>
    </>
  );
}

function Terms() {
  return (
    <>
      <Intro>These terms cover using fletora. By creating an account you agree to them. Last updated {UPDATED}.</Intro>
      <Sec title="Your account">
        <P>You must be at least 13 to use fletora. Keep your password safe; you’re responsible for what happens on your account. One person per account, and don’t pretend to be someone else.</P>
      </Sec>
      <Sec title="Your work stays yours">
        <P>You keep all rights to what you upload. By making a sketchbook public or link-only, you let fletora. store and show it to visitors who can see it, including as previews when its link is shared or when it’s embedded on another site. Making it private or deleting it ends that. In a shared sketchbook, each person keeps the rights to the pages they add, and everyone in it agrees they can be shown together in it, stay in it if they leave, and be deleted with it if its owner deletes it.</P>
      </Sec>
      <Sec title="What’s not allowed">
        <Ul items={[
          'Uploading work that isn’t yours, or that you don’t have the right to share.',
          'Harassment, hate, threats or content that targets someone, in sketchbooks, profiles or messages.',
          'Anything that sexualises children, drawn or not. This includes drawn, painted or computer-made images, and we report it to the police or the Internet Watch Foundation.',
          'Photos (or photo-real images) with nudity or sexual content, and sexually explicit pictures of any kind. Drawings with nudity of adults are allowed, labelled Mature (see below).',
          'Sexual messages to anyone who hasn’t asked for them, or any illegal content.',
          'Spam, scams, impersonation, or using messages to advertise or contact people in bulk.',
          'Automated use of the site, or trying to break, overload or get around its security.',
        ]} />
      </Sec>
      <Sec title="Mature work">
        <P>Figure drawing and art with nudity are welcome. Sketchbooks with drawn nudity of adults must be labelled Mature, from the sketchbook’s Pages screen. Mature sketchbooks are kept out of Explore and other people’s profiles, and only open for signed-in people who say they’re 18 or over and choose to see them in Account settings. Profile pictures can’t show nudity.</P>
        <P>Every upload is checked automatically before it’s published. Photos with nudity or sexual content and sexually explicit drawings are refused, drawings the check finds with nudity are labelled Mature for you (only moderators can take that label off), and anything it can’t judge is held back for a moderator. The check can get things wrong; if it has, <Contact />.</P>
      </Sec>
      <Sec title="Messages">
        <P>Messages from people who don’t follow you arrive as requests you can accept, decline or ignore. You can block anyone, and report any message; a reported message is shared with our moderators so they can review it.</P>
      </Sec>
      <Sec title="Moderation">
        <P>Anyone can report a sketchbook, artist or message. Reports that a child may be at risk, and uploads the automatic check stops for that reason, come to us straight away and are looked at first; where the law requires it we pass them to the police or the Internet Watch Foundation. We may hide content, suspend accounts or remove them when these terms are broken, sometimes without notice. If you think we got it wrong, <Contact /> and we’ll take another look.</P>
      </Sec>
      <Sec title="Complaints and appeals">
        <P>You can complain about anything on fletora.: content or a person on it, a decision we made about your account or work, how we handle reports, or the site itself. Use <b>Report</b> on a sketchbook, profile or message, or the form on the Contact page. We confirm we’ve received it within 2 working days and give you an answer within 7 days, with a reason. An appeal against a moderation decision is looked at again, by a different moderator where we can; if we got it wrong, we put things back.</P>
      </Sec>
      <Sec title="From the archive">
        <P>Sketchbooks in From the archive are historical works in the public domain, shown with credit to the artist and the museum or library they come from. They’re there for inspiration; the source’s own terms apply to its images.</P>
      </Sec>
      <Sec title="The service">
        <P>fletora. is provided as is, without warranties. We may change or stop features, and we aren’t liable for lost content or indirect losses to the extent the law allows. Keep your own copies of your work.</P>
      </Sec>
      <Sec title="Fletora Plus">
        <P>Plus is an optional subscription that adds features to your account, at {PRICE.month} a month or {PRICE.year} a year. It’s sold to you by Stripe as merchant of record: Stripe takes the payment, charges any VAT or sales tax that applies, and sends your receipts, and its terms apply to the purchase.</P>
        <Ul items={[
          'New accounts get Plus free for 14 days, with no card needed. We email you two days before it ends; afterwards your account goes back to the free plan (see below) unless you choose a plan. One free trial per person and email address.',
          'Plus renews automatically at the end of each month or year until you cancel. Cancel anytime from Account settings → Plan; you keep Plus until the end of the period you’ve paid for and aren’t charged again.',
          <>If you’re in the UK or EU, you can cancel within 14 days of first subscribing for a refund, less a fair amount for the days you’ve already had Plus. To ask, <Contact />.</>,
          'If a payment fails, Plus stays on for a few days while it’s retried, then ends.',
          `When Plus ends, nothing you’ve made is deleted. Link-only sketchbooks become private, stats and your pinned sketchbook are hidden again, and the free plan’s limits apply to anything new (${BOOKS_FREE} sketchbooks, ${PAGES_FREE} pages each).`,
          'If the price changes, we’ll tell you at least 30 days before it applies to you, so you can cancel first.',
          'Deleting your account cancels Plus straight away.',
        ]} />
      </Sec>
      <Sec title="Leaving">
        <P>You can delete your account at any time from Account settings. We may close accounts that break these terms.</P>
      </Sec>
      <Sec title="Changes and contact">
        <P>If these terms change, the date above will change too, and we’ll let you know on the site about big changes. Questions? <Contact />. Post: fletora., {ADDRESS}.</P>
      </Sec>
    </>
  );
}

export function Legal({ v }: { v: V }) {
  if (v.legalDoc === 'contact') return <ContactPage v={v} />;
  if (v.legalDoc === 'plus') return <PlusPage v={v} />;
  const mob = !v.notMob, terms = v.legalDoc === 'terms', tab = (on: boolean, name: string, open: () => void) => (
    <button onClick={open} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', ...label(on ? INK : undefined), borderBottom: on ? `1px solid ${INK}` : 'none' }}>{name}</button>
  );
  // Wide screens: the list of sections down the side (sticky), and the sections in columns across the rest of the
  // width, so the page is used without making lines too long to read. Phones: one column. See .legal-* in
  // global.css.
  return (
    <div data-scroll style={screen}>
      <div style={{ ...pagePad(mob, 64), display: 'flex', flexDirection: 'column', gap: mob ? 24 : 32, minHeight: '100%', paddingBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={label(MARK)}>fletora.</span>
          <h1 style={{ margin: 0, ...serif(mob ? 44 : 64, 1, '-.02em') }}>{terms ? <>Terms of <em>use</em></> : <>Privacy <em>policy</em></>}</h1>
          <div style={{ display: 'flex', gap: 20, marginTop: 6, ...label() }}>{tab(!terms, 'Privacy', v.openPrivacy)}{tab(terms, 'Terms', v.openTerms)}</div>
        </div>
        <LegalBody key={v.legalDoc}>{terms ? <Terms /> : <Privacy />}</LegalBody>
        <SiteFooter v={v} />
      </div>
    </div>
  );
}

/** The sections, with a sticky list of them beside (wide screens) that marks the one you're reading. */
function LegalBody({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null), [secs, setSecs] = useState<string[]>([]), [on, setOn] = useState('');
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const list = [...el.querySelectorAll<HTMLElement>('section[data-sec]')];
    setSecs(list.map(x => x.dataset.sec || ''));
    const io = new IntersectionObserver(es => {
      const vis = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setOn((vis.target as HTMLElement).dataset.sec || '');
    }, { root: el.closest('[data-scroll]'), rootMargin: '0px 0px -60% 0px' });
    list.forEach(x => io.observe(x));
    return () => io.disconnect();
  }, []);
  const go = (t: string) => { document.getElementById(slug(t))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setOn(t); };
  return (
    <div className="legal-wrap">
      <nav className="legal-nav" aria-label="On this page">
        <span style={label()}>On this page</span>
        {secs.map(t => (
          <button key={t} onClick={() => go(t)} className={hoverText} style={{ padding: '2px 0 2px 12px', border: 'none', borderLeft: `2px solid ${on === t ? MARK : 'rgba(var(--ink-rgb),.15)'}`, background: 'none', textAlign: 'left', color: on === t ? INK : MUTED, font: `500 13px/1.35 ${SANS}`, cursor: 'pointer' }}>{t}</button>
        ))}
      </nav>
      <div ref={ref} className="legal-cards">{children}</div>
    </div>
  );
}

/** Free against Plus, row by row. */
const PLUS_ROWS: [string, string, string][] = [
  ['Sketchbooks', String(BOOKS_FREE), 'Unlimited'],
  ['Pages per sketchbook', String(PAGES_FREE), String(PAGES_PLUS)],
  ['Page quality', 'Standard', 'Full resolution, twice the detail'],
  ['Download as PDF', '—', 'Any sketchbook, laid out to print'],
  ['People per sketchbook', '1 other person', 'Up to 5'],
  ['Link-only sketchbooks', '—', 'Open to anyone with the link'],
  ['Stats', '—', 'Views, likes, saves and where visitors came from'],
  ['Pin a sketchbook to your profile', '—', '✓'],
  ['The Plus mark', '—', '✓'],
];
const PLUS_FAQ: [string, string][] = [
  ['How does the free trial work?', 'New accounts get Plus free for 14 days, with no card needed. We email you two days before it ends. If you don’t choose a plan, your account simply goes back to the free plan.'],
  ['What happens when Plus ends?', `Nothing you’ve made is deleted. Link-only sketchbooks become private, stats and your pinned sketchbook are hidden, and the free limits apply to anything new (${BOOKS_FREE} sketchbooks, ${PAGES_FREE} pages each).`],
  ['Can I cancel?', 'Anytime, in Account settings → Plan. You keep Plus until the end of the month or year you’ve paid for, and you’re not charged again.'],
  ['Who takes the payment?', 'Stripe, as merchant of record: it takes the payment, charges any VAT that applies and sends your receipts. We never see your card number.'],
  ['What stays free?', 'Everything else: public and private sketchbooks, pictures across two pages, drawing and writing on pages, following, likes, comments, saves and messages.'],
];

/** Fletora Plus: what it costs, what it adds, and the free trial. Open to everyone, signed in or not. */
function PlusPage({ v }: { v: V }) {
  const mob = !v.notMob;
  const price = (on: boolean, name: string, amount: string, per: string, note: string): ReactNode => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 18px', border: `1.5px solid ${on ? INK : 'rgba(var(--ink-rgb),.2)'}`, background: on ? 'rgba(var(--ink-rgb),.04)' : 'none', borderRadius: 2 }}>
      <span style={label(on ? MARK : undefined)}>{name}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><span style={serif(40, 1)}>{amount}</span><span style={{ fontSize: 14, color: MUTED }}>{per}</span></span>
      <span style={{ fontSize: 13, color: MUTED }}>{note}</span>
    </div>
  );
  const cta: CSSProperties = { height: 52, padding: '0 28px', border: 'none', borderRadius: 2, background: MARK, color: PAPER, font: `500 16px ${SANS}`, cursor: 'pointer', alignSelf: 'flex-start' };
  return (
    <div data-scroll style={screen}>
      <div style={{ ...pagePad(mob, 64), display: 'flex', flexDirection: 'column', gap: mob ? 36 : 56, minHeight: '100%', paddingBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1.1fr)', gap: mob ? 36 : 'clamp(40px, 6vw, 100px)', alignItems: 'start' }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <span style={label(MARK)}>Fletora Plus</span>
            <h1 style={{ margin: 0, font: `400 ${mob ? '52px' : 'clamp(60px, 6vw, 96px)'}/.95 ${SERIF}`, letterSpacing: '-.025em' }}>More room for your <em style={{ color: MARK }}>sketchbooks.</em></h1>
            <p style={{ margin: 0, maxWidth: 520, fontSize: 17, lineHeight: 1.55, color: MUTED }}>Everything in fletora., with far more room to keep your work, and a few things just for Plus: PDFs, stats, link-only sketchbooks and drawing together with up to five people.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, maxWidth: 520 }}>
              {price(false, 'Monthly', PRICE.month, 'a month', 'Cancel anytime')}
              {price(true, 'Yearly', PRICE.year, 'a year', `${YEAR_SAVING} less than monthly`)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={v.ppGo} className={hover(`background:${INK}`)} style={cta}>{v.ppCta}</button>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: MUTED, maxWidth: 520 }}>{v.ppNote}</span>
            </div>
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: `1px solid ${INK}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,.8fr) minmax(0,1.2fr)', gap: 12, padding: '14px 0', ...label() }}>
              <span /><span>Free</span><span style={{ color: MARK }}>Plus</span>
            </div>
            {PLUS_ROWS.map(([k, f, p]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,.8fr) minmax(0,1.2fr)', gap: 12, padding: '13px 0', borderTop: '1px solid rgba(var(--ink-rgb),.12)', fontSize: 14, lineHeight: 1.45, alignItems: 'baseline' }}>
                <span style={{ fontWeight: 500 }}>{k}</span><span style={{ color: MUTED }}>{f}</span><span>{p}</span>
              </div>
            ))}
          </section>
        </div>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '28px 48px', paddingTop: 24, borderTop: '1px solid rgba(var(--ink-rgb),.2)' }}>
          {PLUS_FAQ.map(([q, a]) => (
            <div key={q} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h2 style={{ margin: 0, ...serif(24, 1.15) }}>{q}</h2>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: INK }}>{a}</p>
            </div>
          ))}
        </section>
        <SiteFooter v={v} />
      </div>
    </div>
  );
}

/** One block of quick help beside the Contact form. */
function Help({ title, children, mark }: { title: string; children: ReactNode; mark?: boolean }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: mark ? '14px 16px' : '18px 0 0', borderTop: mark ? 'none' : '1px solid rgba(var(--ink-rgb),.2)', ...(mark ? { background: 'rgba(173,73,58,.06)', borderLeft: `2px solid ${MARK}` } : {}) }}>
      <span style={label(mark ? MARK : undefined)}>{title}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: 1.55, color: INK, textWrap: 'pretty' } as CSSProperties}>{children}</div>
    </section>
  );
}

function ContactPage({ v }: { v: V }) {
  const mob = !v.notMob;
  const send: CSSProperties = { height: 48, padding: '0 26px', border: 'none', borderRadius: 2, background: INK, color: PAPER, font: `500 15px ${SANS}`, cursor: v.ctBusy ? 'progress' : 'pointer', alignSelf: 'flex-start', opacity: v.ctBusy ? 0.6 : 1 };
  const topic = (on: boolean): CSSProperties => ({ height: 36, padding: '0 14px', borderRadius: 18, border: `1px solid ${on ? INK : 'rgba(var(--ink-rgb),.25)'}`, background: on ? INK : 'transparent', color: on ? PAPER : INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' });
  const step = (n: number, text: ReactNode) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <span style={{ ...serif(20, 1), color: MARK, minWidth: 14 }}>{n}</span><span>{text}</span>
    </div>
  );
  const form = v.ctDone ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 22, borderTop: `1px solid ${INK}` }}>
      <h2 style={{ margin: 0, ...serif(mob ? 30 : 38, 1.05) }}>Thanks, it’s <em style={{ color: MARK }}>on its way.</em></h2>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: MUTED }}>We’ll reply to <b style={{ color: INK, fontWeight: 600 }}>{v.ctSentTo}</b> within 2 working days.</p>
      <button onClick={v.ctAgain} style={{ ...send, background: 'none', color: INK, border: `1.5px solid ${INK}` }}>Send another message</button>
    </div>
  ) : (
    <form onSubmit={v.ctSend} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 22, borderTop: `1px solid ${INK}` }}>
      <h2 style={{ margin: 0, ...serif(28, 1.1) }}>Send a message</h2>
      <div role="radiogroup" aria-label="What’s it about?" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),.75)' }}>What’s it about?</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CONTACT_KINDS.map(([k, name]) => <button key={k} type="button" role="radio" aria-checked={v.ctKind === k} onClick={() => v.setCtKind(k)} className={v.ctKind === k ? undefined : hover('border-color:rgba(var(--ink-rgb),.6)')} style={topic(v.ctKind === k)}>{name}</button>)}
        </div>
      </div>
      <TextField label="Your email" type="email" autoComplete="email" value={v.ctEmail} onChange={v.onCtEmail} placeholder="you@example.com" />
      {v.ctNeedsLink && <TextField label="Link (optional)" value={v.ctLink} onChange={v.onCtLink} placeholder="The sketchbook, profile or page it’s about" />}
      <TextArea label="Message" value={v.ctText} onChange={v.onCtText} maxLength={4000} placeholder={v.ctHint} />
      {/* Hidden from people; bots fill it in. */}
      <input name="website" value={v.ctHp} onChange={v.onCtHp} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
      <Notice err={v.ctErr} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px 20px', flexWrap: 'wrap' }}>
        <button type="submit" disabled={v.ctBusy} className={hover(`background:${MARK}`)} style={send}>{v.ctBusy ? 'Sending…' : 'Send message'}</button>
        <span style={{ fontSize: 12, color: MUTED }}>We use what you send only to reply. <button type="button" onClick={v.openPrivacy} className={hoverText} style={{ padding: 0, border: 'none', borderBottom: `1px solid ${MUTED}`, background: 'none', color: MUTED, font: `500 12px ${SANS}`, cursor: 'pointer' }}>Privacy policy</button></span>
      </div>
    </form>
  );
  return (
    <div style={screen}>
      {/* Full width: on wide screens the help beside the form splits into columns rather than leaving space empty. */}
      <div style={{ ...pagePad(mob, 64), display: 'flex', flexDirection: 'column', gap: mob ? 28 : 40, minHeight: '100%', paddingBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>
          <span style={label(MARK)}>Contact</span>
          <h1 style={{ margin: 0, ...serif(mob ? 48 : 76, .95, '-.025em') }}>Get in <em style={{ color: MARK }}>touch.</em></h1>
          <p style={{ margin: 0, fontSize: mob ? 16 : 17, lineHeight: 1.55, color: MUTED }}>Questions, problems, complaints or appeals: a person reads every message and replies within 2 working days.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? 'minmax(0,1fr)' : 'minmax(0,1.2fr) minmax(0,1fr)', gap: mob ? 36 : 64, alignItems: 'start' }}>
          {form}
          <aside style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,360px),1fr))', gap: '22px 40px', alignItems: 'start' }}>
            <Help title="Email us">
              <a href={`mailto:${contact}`} className={hoverText} style={{ ...serif(24, 1.1), color: INK, textDecoration: 'none', borderBottom: `1px solid ${INK}`, alignSelf: 'flex-start' }}>{contact}</a>
              <span style={{ color: MUTED }}>Privacy and data requests are answered within one month at most.</span>
            </Help>
            <Help title="Report something">
              <span>The fastest way is <b style={{ fontWeight: 600 }}>Report</b> in the ⋯ menu on the sketchbook, profile or message. It goes straight to our moderators with what you’re reporting attached.</span>
            </Help>
            <Help title="How complaints and appeals work">
              {step(1, 'We confirm we’ve received it within 2 working days.')}
              {step(2, 'You get an answer within 7 days, with the reason.')}
              {step(3, 'Appeals are looked at again, by a different moderator where we can. If we got it wrong, we put things back.')}
              <span style={{ color: MUTED }}>Unhappy with how we’ve handled your data? You can also complain to the ICO (ico.org.uk).</span>
            </Help>
            <Help title="A child at risk" mark>
              <span>In immediate danger, call <b style={{ fontWeight: 600 }}>999</b>. Report child sexual abuse images anywhere online to the IWF at report.iwf.org.uk. On fletora., choose <b style={{ fontWeight: 600 }}>Report</b> → <b style={{ fontWeight: 600 }}>A child may be at risk</b>: it reaches us straight away.</span>
            </Help>
            <Help title="Plus and billing">
              <span>Cancel, change plan, update your card and get receipts in Account settings → Plan. For refunds or anything else, choose <b style={{ fontWeight: 600 }}>Plus and billing</b> in the form.</span>
            </Help>
          </aside>
        </div>
        <SiteFooter v={v} />
      </div>
    </div>
  );
}

const NF_TEXT: Record<string, string> = {
  sketchbook: 'This sketchbook was deleted, made private, or the link is wrong.',
  artist: 'No artist goes by that handle. They may have changed it or left.',
  page: 'There’s nothing at this address.',
};

export function NotFound({ v }: { v: V }) {
  return (
    <div style={{ ...screen, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '84px 16px 40px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center', maxWidth: 520 }}>
        <span style={label(MARK)}>Not found</span>
        <h1 style={{ margin: 0, ...serif(v.notMob ? 80 : 52, .95, '-.02em') }}>A <em style={{ color: MARK }}>blank</em> page.</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: MUTED }}>{NF_TEXT[v.nfWhat] || NF_TEXT.page}</p>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={v.goExplore} className={hover(`background:${MARK}`)} style={{ height: 48, padding: '0 26px', border: 'none', background: INK, color: PAPER, font: `500 15px ${SANS}`, cursor: 'pointer' }}>Explore sketchbooks ↗</button>
          <button onClick={v.goHome} className={hoverLine} style={underline(15)}>Go home</button>
        </div>
      </div>
    </div>
  );
}

const smallBtn = (danger = false, on = false): CSSProperties => ({ height: 34, padding: '0 14px', borderRadius: 2, border: `1.5px solid ${danger ? MARK : 'rgba(var(--ink-rgb),.45)'}`, background: on ? (danger ? MARK : INK) : 'none', color: on ? PAPER : danger ? MARK : INK, font: `500 13px ${SANS}`, cursor: 'pointer' });

/** Moderation: open reports, with hide/restore, suspend/lift and dismiss. Only for accounts listed in `admins`. */
export function Admin({ v }: { v: V }) {
  if (!v.adAllowed) {
    return (
      <Page v={v} kicker="Moderation" title={<>No <em>access</em></>}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: MUTED }}>This page is for moderators. To make an account a moderator, add a document with its user ID to the <code>admins</code> collection in the Firebase console (see SETUP.md).</p>
      </Page>
    );
  }
  const mob = !v.notMob, wide = (window.innerWidth || 0) >= 1400;
  const card: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 18px 16px', border: '1px solid rgba(var(--ink-rgb),.14)' };
  const reports = (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', paddingBottom: 12, borderBottom: `1px solid ${INK}` }}>
        <h2 style={{ margin: 0, ...serif(32, 1.1), fontWeight: 400, flex: 1 }}>Open <em>reports</em></h2>
        <span style={label()}>{v.adCount}</span>
        <button onClick={v.adReload} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', ...label(INK) }}>Refresh</button>
      </div>
      <Notice err={v.adErr} />
      {v.adLoading && <div style={{ fontSize: 14, color: MUTED }}>Loading reports…</div>}
      {!v.adLoading && !v.adItems.length && <div style={{ padding: '28px 0', fontSize: 15, color: MUTED }}>Nothing to review. Reports people send, and pictures the upload check holds back, show up here.</div>}
      {v.adItems.map((r: V) => (
        <article key={r.key} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 18, borderBottom: '1px solid rgba(var(--ink-rgb),.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', ...label() }}>
            <span><span style={{ color: MARK }}>{r.reason}</span> · {r.kind}</span><span>{r.when}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={r.open} disabled={r.gone} className={r.gone ? undefined : hoverText} style={{ padding: 0, border: 'none', background: 'none', color: INK, cursor: r.gone ? 'default' : 'pointer', textAlign: 'left', ...serif(26, 1.1) }}>{r.name}</button>
            {r.isBook && r.owner && <button onClick={r.openOwner} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', color: MUTED, font: `500 14px ${SANS}`, cursor: 'pointer' }}>by {r.owner}</button>}
            {r.hidden && <span style={label(MARK, 10)}>Hidden</span>}
            {r.banned && <span style={label(MARK, 10)}>Suspended</span>}
            {r.mature && <span style={label(MUTED, 10)}>Mature</span>}
          </div>
          {r.note && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: INK, whiteSpace: 'pre-wrap' }}>{r.auto ? <><span style={{ color: MUTED }}>The check saw:</span> {r.note}</> : <>“{r.note}”</>}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', opacity: r.busy ? 0.6 : 1 }}>
            {r.isComment && <button onClick={r.deleteComment} disabled={!!r.busy} style={smallBtn(true, false)}>Delete comment</button>}
            {r.file && <button onClick={r.viewFile} disabled={!!r.busy} style={smallBtn(false, false)}>View picture</button>}
            {r.file && <button onClick={r.deleteFile} disabled={!!r.busy} style={smallBtn(true, false)}>Delete picture</button>}
            {r.isBook && !r.gone && r.mature && <button onClick={r.clearMature} disabled={!!r.busy} style={smallBtn(false, false)}>Remove Mature label</button>}
            {r.isBook && !r.gone && <button onClick={r.hide} disabled={!!r.busy} style={smallBtn(false, false)}>{r.hidden ? 'Restore sketchbook' : 'Hide sketchbook'}</button>}
            {r.owner && <button onClick={r.ban} disabled={!!r.busy} style={smallBtn(true, false)}>{r.banned ? 'Lift suspension' : 'Suspend artist'}</button>}
            <button onClick={r.dismiss} disabled={!!r.busy} className={hover('background:rgba(var(--ink-rgb),.08)')} style={{ ...smallBtn(), border: 'none' }}>Dismiss report</button>
          </div>
        </article>
      ))}
    </section>
  );
  const side = (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <section style={{ ...card, borderLeft: `2px solid ${MARK}`, background: 'rgba(173,73,58,.05)' }}>
        <span style={label(MARK, 10)}>Staff pick</span>
        {v.adPick ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button onClick={v.adPick.open} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', color: INK, cursor: 'pointer', textAlign: 'left', ...serif(22, 1.1), fontStyle: 'italic' }}>{v.adPick.name}</button>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>by {v.adPick.artist}</div>
            </div>
            <button onClick={v.adPick.remove} style={smallBtn(true)}>Remove</button>
          </div>
        ) : <span style={{ fontSize: 14, lineHeight: 1.5, color: MUTED }}>None yet. Open any public sketchbook and choose <b style={{ color: INK, fontWeight: 600 }}>Make staff pick</b> from its ⋯ menu.</span>}
      </section>
      <section style={card}>
        <span style={label(MUTED, 10)}>This week’s prompt</span>
        {v.adPrompt.live && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...serif(22, 1.1) }}>{v.adPrompt.live.title}</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{v.adPrompt.live.tag} · {v.adPrompt.live.until}</div>
            </div>
            <button onClick={v.adPrompt.live.end} style={smallBtn(true)}>End</button>
          </div>
        )}
        <form onSubmit={v.adPrompt.go} style={{ display: 'flex', flexDirection: 'column', gap: 10, ...(v.adPrompt.live ? { paddingTop: 12, borderTop: '1px solid rgba(var(--ink-rgb),.1)' } : {}) }}>
          <TextField label={v.adPrompt.live ? 'Next prompt (replaces it)' : 'Prompt'} value={v.adPrompt.title} onChange={v.adPrompt.onTitle} placeholder="Draw your window" />
          <TextField label="A line about it (optional)" value={v.adPrompt.note} onChange={v.adPrompt.onNote} placeholder="The view, the frame, the light at 4pm" />
          <TextField label="Tag" value={v.adPrompt.tag} onChange={v.adPrompt.onTag} placeholder="window" />
          <button type="submit" disabled={!v.adPrompt.canSet} style={{ ...smallBtn(false, false), height: 38, alignSelf: 'flex-start', opacity: v.adPrompt.canSet ? 1 : 0.45 }}>Run it for a week</button>
          <span style={{ fontSize: 12.5, lineHeight: 1.45, color: MUTED }}>Shown on Explore for 7 days and in the weekly email. Entries are sketchbooks with its tag.</span>
        </form>
      </section>
      {v.adStats?.newest.length > 0 && (
        <section style={card}>
          <span style={label(MUTED, 10)}>Newest members</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {v.adStats.newest.map((p: V, k: number) => (
              <button key={p.key} onClick={p.open} className={hover('background:rgba(var(--ink-rgb),.05)')} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '9px 6px', margin: '0 -6px', border: 'none', borderTop: k ? '1px solid rgba(var(--ink-rgb),.08)' : 'none', background: 'none', color: INK, cursor: 'pointer', font: `500 14px ${SANS}`, textAlign: 'left' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ color: MUTED, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.handle}</span>
                <span style={{ color: MUTED, fontWeight: 400, fontSize: 12.5, flexShrink: 0 }}>{p.when}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
  return (
    <Page v={v} wide kicker="Moderation" title={<>The <em>dashboard</em></>}>
      {v.adStats && (
        // One row of numbers on wide screens, two rows of four on laptops, pairs on phones.
        <section aria-label="Site numbers" style={{ display: 'grid', gridTemplateColumns: `repeat(${mob ? 2 : wide ? 8 : 4}, minmax(0, 1fr))`, gap: 1, background: 'rgba(var(--ink-rgb),.12)', border: '1px solid rgba(var(--ink-rgb),.12)' }}>
          {v.adStats.tiles.map((t: V) => (
            <div key={t.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: mob ? '14px 14px 12px' : '18px 18px 16px', background: PAPER, minWidth: 0 }}>
              <span style={label(t.alert ? MARK : MUTED, 10)}>{t.label}</span>
              <span style={{ ...serif(mob ? 34 : 44, 1), color: t.alert ? MARK : INK }}>{t.value}</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.4, color: MUTED }}>{t.note}</span>
            </div>
          ))}
        </section>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'minmax(0, 1fr) 360px', gap: mob ? 28 : 48, alignItems: 'start' }}>
        {reports}{side}
      </div>
    </Page>
  );
}

const ACTION_TEXT: Record<string, { kicker: string; title: ReactNode; done: string }> = {
  verifyEmail: { kicker: 'Confirm email', title: <>You’re <em style={{ color: MARK }}>in.</em></>, done: 'Thanks, your email is confirmed. Your sketchbooks are waiting.' },
  resetPassword: { kicker: 'New password', title: <>A fresh <em style={{ color: MARK }}>start.</em></>, done: 'Your password has been changed. Sign in with the new one.' },
  verifyAndChangeEmail: { kicker: 'Change email', title: <>All <em style={{ color: MARK }}>set.</em></>, done: 'Your email address has been changed. Use the new one next time you sign in.' },
  recoverEmail: { kicker: 'Email restored', title: <>Back as <em style={{ color: MARK }}>before.</em></>, done: 'The change to your email address was undone. If you didn’t ask for it, change your password in Account settings.' },
};

/** Our own page for the links in fletora's emails (instead of Firebase's plain one). */
export function AuthAction({ v }: { v: V }) {
  const t = ACTION_TEXT[v.acMode] || ACTION_TEXT.verifyEmail, mob = !v.notMob;
  const primary: CSSProperties = { height: 48, padding: '0 26px', border: 'none', background: INK, color: PAPER, font: `500 15px ${SANS}`, cursor: 'pointer', alignSelf: 'flex-start' };
  return (
    <div style={screen}>
      <div style={{ ...pagePad(mob, 64), display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 640 }}>
        <span style={label(MARK)}>{t.kicker}</span>
        <h1 style={{ margin: 0, ...serif(mob ? 52 : 84, .95, '-.025em') }}>
          {v.acStep === 'error' ? <>That link has <em style={{ color: MARK }}>faded.</em></> : v.acStep === 'checking' ? <>One <em style={{ color: MARK }}>moment…</em></> : t.title}
        </h1>
        {v.acStep === 'checking' && <p style={{ margin: 0, fontSize: 17, color: MUTED }}>Checking your link.</p>}
        {v.acStep === 'done' && (
          <>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: MUTED }}>{t.done}</p>
            {v.acMode === 'resetPassword' && !v.acSignedIn
              ? <button onClick={v.acSignIn} className={hover(`background:${MARK}`)} style={primary}>Sign in</button>
              : <button onClick={v.acContinue} className={hover(`background:${MARK}`)} style={primary}>Continue to fletora →</button>}
          </>
        )}
        {(v.acStep === 'form' || v.acStep === 'working') && (
          <form onSubmit={v.acSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 18, borderTop: `1px solid ${INK}`, maxWidth: 420 }}>
            <span style={{ fontSize: 15, color: MUTED }}>Choose a new password for <b style={{ color: INK, fontWeight: 600 }}>{v.acMail}</b>.</span>
            <TextField label="New password" value={v.acPw} onChange={v.onAcPw} type="password" placeholder="At least 6 characters" autoComplete="new-password" autoFocus />
            <Notice err={v.acErr} />
            <button type="submit" disabled={v.acStep === 'working'} className={hover(`background:${MARK}`)} style={{ ...primary, opacity: v.acStep === 'working' ? 0.6 : 1 }}>{v.acStep === 'working' ? 'Saving…' : 'Save new password'}</button>
          </form>
        )}
        {v.acStep === 'error' && (
          <>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: MUTED }}>{v.acErr} Links in our emails work once, and only for a while.</p>
            <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
              {v.acMode === 'resetPassword'
                ? <button onClick={v.acResetAgain} className={hover(`background:${MARK}`)} style={primary}>Send a new link</button>
                : v.acSignedIn ? <button onClick={v.openSettings} className={hover(`background:${MARK}`)} style={primary}>Resend from Settings</button>
                : <button onClick={v.openSignin} className={hover(`background:${MARK}`)} style={primary}>Sign in</button>}
              <button onClick={v.goHome} className={hoverLine} style={underline(15)}>Go home</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
