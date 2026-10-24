import type { CSSProperties, ReactNode } from 'react';
import type { V } from '../App';
import { hover } from '../pseudo';
import { INK, MARK, MUTED, PAPER, SANS, label, pagePad, serif } from '../theme';
import { Notice, TextField } from './Overlays';

const screen: CSSProperties = { position: 'absolute', inset: '0 0 var(--tabbar, 0px) 0', zIndex: 4, background: PAPER, overflowX: 'hidden', overflowY: 'auto' };
const hoverText = hover(`color:${MARK}`);
const hoverLine = hover(`color:${MARK};border-color:${MARK}`);
const underline = (fs = 14): CSSProperties => ({ padding: '4px 0', border: 'none', borderBottom: `1px solid ${INK}`, background: 'none', color: INK, font: `500 ${fs}px ${SANS}`, cursor: 'pointer' });
const contact = import.meta.env.VITE_CONTACT_EMAIL;
const UPDATED = '24 October 2026';

function Page({ v, kicker, title, children }: { v: V; kicker: string; title: ReactNode; children: ReactNode }) {
  const mob = !v.notMob;
  return (
    <div style={screen}>
      {/* Same spacing as every page; long text keeps a comfortable reading width from the same left edge. */}
      <div style={{ ...pagePad(mob, 64), display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 860 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={label(MARK)}>{kicker}</span>
          <h1 style={{ margin: 0, ...serif(mob ? 44 : 64, 1, '-.02em') }}>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

const prose: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, fontSize: 15, lineHeight: 1.6, color: INK, textWrap: 'pretty' } as CSSProperties;
function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ ...prose, paddingTop: 18, borderTop: '1px solid rgba(var(--ink-rgb),.25)' }}>
      <h2 style={{ margin: 0, ...serif(26, 1.15) }}>{title}</h2>
      {children}
    </section>
  );
}
const P = ({ children }: { children: ReactNode }) => <p style={{ margin: 0 }}>{children}</p>;
const Ul = ({ items }: { items: ReactNode[] }) => <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
const Contact = () => contact ? <>email <a href={`mailto:${contact}`}>{contact}</a></> : <>use <b>Report</b> on any sketchbook or profile</>;

function Privacy() {
  return (
    <>
      <P>fletora. is a place to share sketchbooks, run by Besian Morina. This page explains what we store about you, why, who can see it, how long we keep it, and your rights. Last updated {UPDATED}.</P>
      <Sec title="What we store">
        <Ul items={[
          <><b>Your account:</b> your email address and a password, held by Firebase Authentication (Google). Your password is never visible to us, and your email is never shown on the site.</>,
          <><b>Your profile:</b> name, handle, bio, location, website, social links, a contact email (if you add one) and photo. These are public.</>,
          <><b>Your sketchbooks:</b> page images, drawings and typed text you add, covers, captions, dates, mediums and tags. Public sketchbooks can be seen by anyone; private ones only by you and anyone you’ve shared that sketchbook with.</>,
          <><b>Messages:</b> the messages you send and receive, so the two people in a conversation can read them. Nobody else can, including us, unless a message is reported: then its text is sent to our moderators with the report. If you delete your account, messages you sent stay in the other person’s conversation.</>,
          <><b>Activity:</b> who you follow, which sketchbooks you like and save, who you block, your notifications, the reports you file, and a daily count of new conversations you start (to prevent spam). Follows and likes are visible to others; saved sketchbooks, blocks and reports are private.</>,
          <><b>On your device:</b> small settings such as light or dark theme, page sounds and which tips you’ve seen, kept in your browser’s storage. If analytics is turned on, Google Analytics for Firebase also records anonymous usage such as pages viewed, device type and approximate location.</>,
        ]} />
      </Sec>
      <Sec title="Why we use it">
        <P>To run your account and show your work (our agreement with you when you sign up); to keep fletora. safe, prevent spam and act on reports (our legitimate interest in a safe community); and, only if it’s turned on, anonymous analytics to improve the site.</P>
      </Sec>
      <Sec title="Who processes it">
        <P>Data is stored with Google Firebase (Authentication, Cloud Firestore and Cloud Storage), and the site is served by Vercel. Account emails (confirming your address, resetting your password) are sent through Resend, which receives your email address for that purpose; replies to them reach our inbox on Google Workspace. When you use Write to convert handwriting, an image of just that handwriting is sent to Anthropic’s Claude to read it; it isn’t used to train their models. These services may store data outside the UK, including in the United States, under their own terms, privacy policies and data protection safeguards. We don’t sell your data or use it for advertising.</P>
      </Sec>
      <Sec title="How long we keep it">
        <P>For as long as you have an account. When you delete your account, your profile, handle, follows, saved list, notifications and every sketchbook with its images are removed straight away (copies in our providers’ backups expire within about 30 days). Reports are kept until they’re dealt with.</P>
      </Sec>
      <Sec title="Your choices and rights">
        <Ul items={[
          'Make any sketchbook private from its Pages screen.',
          'Edit or remove your profile details at any time, and block anyone from messaging you.',
          'Delete your account from Account settings. This permanently removes your profile, handle, follows, saved list, notifications, and every sketchbook with all its images.',
          'You can ask for a copy of your data, ask us to correct or delete it, or object to how we use it. If you’re unhappy with how we handle your data, you can complain to the Information Commissioner’s Office (ico.org.uk) or your local data protection authority.',
          'Browsers let you block or clear cookies and site storage.',
        ]} />
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
      <P>These terms cover using fletora., run by Besian Morina. By creating an account you agree to them. Last updated {UPDATED}.</P>
      <Sec title="Your account">
        <P>You must be at least 13 to use fletora. Keep your password safe; you’re responsible for what happens on your account. One person per account, and don’t pretend to be someone else.</P>
      </Sec>
      <Sec title="Your work stays yours">
        <P>You keep all rights to what you upload. By making a sketchbook public, you let fletora. store and show it to visitors, including as previews when its link is shared or when it’s embedded on another site. Making it private or deleting it ends that. In a shared sketchbook, each person keeps the rights to the pages they add, and both agree they can be shown together in it.</P>
      </Sec>
      <Sec title="What’s not allowed">
        <Ul items={[
          'Uploading work that isn’t yours, or that you don’t have the right to share.',
          'Harassment, hate, threats or content that targets someone, in sketchbooks, profiles or messages.',
          'Sexual content involving minors, sexual messages to anyone who hasn’t asked for them, or any illegal content.',
          'Spam, scams, impersonation, or using messages to advertise or contact people in bulk.',
          'Automated use of the site, or trying to break, overload or get around its security.',
        ]} />
      </Sec>
      <Sec title="Messages">
        <P>Messages from people who don’t follow you arrive as requests you can accept, decline or ignore. You can block anyone, and report any message; a reported message is shared with our moderators so they can review it.</P>
      </Sec>
      <Sec title="Moderation">
        <P>Anyone can report a sketchbook, artist or message. We may hide content, suspend accounts or remove them when these terms are broken, sometimes without notice. If you think we got it wrong, <Contact /> and we’ll take another look.</P>
      </Sec>
      <Sec title="From the archive">
        <P>Sketchbooks in From the archive are historical works in the public domain, shown with credit to the artist and the museum or library they come from. They’re there for inspiration; the source’s own terms apply to its images.</P>
      </Sec>
      <Sec title="The service">
        <P>fletora. is provided as is, without warranties. Converting handwriting is automatic and can get words wrong, so check it before saving. We may change or stop features, and we aren’t liable for lost content or indirect losses to the extent the law allows. Keep your own copies of your work.</P>
      </Sec>
      <Sec title="Leaving">
        <P>You can delete your account at any time from Account settings. We may close accounts that break these terms.</P>
      </Sec>
      <Sec title="Changes and contact">
        <P>If these terms change, the date above will change too, and we’ll let you know on the site about big changes. Questions? <Contact />.</P>
      </Sec>
    </>
  );
}

export function Legal({ v }: { v: V }) {
  const terms = v.legalDoc === 'terms';
  return (
    <Page v={v} kicker="fletora." title={terms ? <>Terms of <em>use</em></> : <>Privacy <em>policy</em></>}>
      <div style={{ display: 'flex', gap: 20, ...label() }}>
        <button onClick={v.openPrivacy} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', ...label(terms ? undefined : INK), borderBottom: terms ? 'none' : `1px solid ${INK}` }}>Privacy</button>
        <button onClick={v.openTerms} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', ...label(terms ? INK : undefined), borderBottom: terms ? `1px solid ${INK}` : 'none' }}>Terms</button>
      </div>
      {terms ? <Terms /> : <Privacy />}
    </Page>
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
  return (
    <Page v={v} kicker="Moderation" title={<>Open <em>reports</em></>}>
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px 20px', flexWrap: 'wrap', padding: '14px 16px', background: 'rgba(173,73,58,.06)', borderLeft: `2px solid ${MARK}` }}>
        {v.adPick
          ? <span style={{ fontSize: 14 }}><span style={label(MARK, 10)}>Staff pick</span> <button onClick={v.adPick.open} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', color: INK, cursor: 'pointer', ...serif(20, 1.1), fontStyle: 'italic' }}>{v.adPick.name}</button> <span style={{ color: MUTED }}>by {v.adPick.artist}</span></span>
          : <span style={{ fontSize: 14, color: MUTED }}><span style={label(MARK, 10)}>Staff pick</span> · none. Open any public sketchbook and choose <b style={{ color: INK, fontWeight: 600 }}>Make staff pick</b> from its ⋯ menu.</span>}
        {v.adPick && <button onClick={v.adPick.remove} style={smallBtn(true)}>Remove</button>}
      </section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, ...label() }}>
        <span>{v.adCount}</span>
        <button onClick={v.adReload} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', ...label(INK) }}>Refresh</button>
      </div>
      <Notice err={v.adErr} />
      {v.adLoading && <div style={{ fontSize: 14, color: MUTED }}>Loading reports…</div>}
      {!v.adLoading && !v.adItems.length && <div style={{ fontSize: 15, color: MUTED }}>Nothing to review. Reports people send show up here.</div>}
      {v.adItems.map((r: V) => (
        <article key={r.key} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: `1px solid ${INK}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', ...label() }}>
            <span><span style={{ color: MARK }}>{r.reason}</span> · {r.kind}</span><span>{r.when}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={r.open} disabled={r.gone} className={r.gone ? undefined : hoverText} style={{ padding: 0, border: 'none', background: 'none', color: INK, cursor: r.gone ? 'default' : 'pointer', textAlign: 'left', ...serif(28, 1.1) }}>{r.name}</button>
            {r.isBook && r.owner && <button onClick={r.openOwner} className={hoverText} style={{ padding: 0, border: 'none', background: 'none', color: MUTED, font: `500 14px ${SANS}`, cursor: 'pointer' }}>by {r.owner}</button>}
            {r.hidden && <span style={label(MARK, 10)}>Hidden</span>}
            {r.banned && <span style={label(MARK, 10)}>Suspended</span>}
          </div>
          {r.note && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: INK, whiteSpace: 'pre-wrap' }}>“{r.note}”</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', opacity: r.busy ? 0.6 : 1 }}>
            {r.isBook && !r.gone && <button onClick={r.hide} disabled={!!r.busy} style={smallBtn(false, false)}>{r.hidden ? 'Restore sketchbook' : 'Hide sketchbook'}</button>}
            {r.owner && <button onClick={r.ban} disabled={!!r.busy} style={smallBtn(true, false)}>{r.banned ? 'Lift suspension' : 'Suspend artist'}</button>}
            <button onClick={r.dismiss} disabled={!!r.busy} className={hover('background:rgba(var(--ink-rgb),.08)')} style={{ ...smallBtn(), border: 'none' }}>Dismiss report</button>
          </div>
        </article>
      ))}
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
