import { MARK } from '../theme';

/** The verified tick on Fletora team (moderator) accounts. */
export function Verified({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified: Fletora team" style={{ flexShrink: 0, verticalAlign: 'middle', marginLeft: '0.3em', position: 'relative', top: '-0.06em' }}>
      <title>Verified · Fletora team</title>
      <path fill={MARK} d="M12 1.8l2.4 1.9 3-.4 1.1 2.8 2.8 1.1-.4 3L22.8 12l-1.9 2.4.4 3-2.8 1.1-1.1 2.8-3-.4L12 22.8l-2.4-1.9-3 .4-1.1-2.8-2.8-1.1.4-3L1.2 12l1.9-2.4-.4-3 2.8-1.1L6.6 2.7l3 .4z" />
      <path fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M7.6 12.3l3 3 5.8-6.2" />
    </svg>
  );
}
