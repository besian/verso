import type { CSSProperties } from 'react';
import type { V } from '../App';
import { hover } from '../pseudo';
import { INK, MARK, SANS, STONE, serif } from '../theme';

/** Fletora's postal address (the law asks a site that sells something to give one, easy to find). */
export const ADDRESS = '45 Earls Court Square, London';

const link: CSSProperties = { padding: 0, border: 'none', background: 'none', color: 'inherit', font: `500 12px ${SANS}`, cursor: 'pointer' };
const hoverInk = hover(`color:${INK}`);

/** The footer at the end of every scrolling page: the FAQ, Privacy, Terms and Contact links,
 *  which have to be easy to reach from anywhere on the site. */
export function SiteFooter({ v }: { v: V }) {
  return (
    <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(var(--ink-rgb),.15)', fontSize: 12, color: STONE }}>
      <nav aria-label="Legal" style={{ display: 'flex', gap: '6px 18px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={v.openPlusPage} className={'tap ' + hoverInk} style={link}>Plus</button>
        <button onClick={v.openFaq} className={'tap ' + hoverInk} style={link}>FAQ</button>
        <button onClick={v.openPrivacy} className={'tap ' + hoverInk} style={link}>Privacy</button>
        <button onClick={v.openTerms} className={'tap ' + hoverInk} style={link}>Terms</button>
        <button onClick={v.openContact} className={'tap ' + hoverInk} style={link}>Contact</button>
        <button onClick={v.openFeedback} className={'tap ' + hoverInk} style={link}>Feedback</button>
      </nav>
      <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ ...serif(17, 1), color: INK }}>fletora<span style={{ color: MARK }}>.</span></span>
        <span>© {new Date().getFullYear()}</span>
      </span>
    </footer>
  );
}
