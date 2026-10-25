// The home headline's last word, "fletora.", in the headline's own italic, written as if by hand. Each letter is
// shown through an invisible pen: one stroke, in the order and direction a hand writes that letter, fitted over the
// real letter and drawn thick enough to cover it, so the letter appears as the pen moves. The strokes come from a
// single-line script (Hershey Script, public domain, via hersheytext, MIT); a quick fill after each one catches any
// edge the pen missed. Then the dot, and a loose underline. The plain word underneath keeps the layout and is what
// screen readers read. Styles: .ink-word in global.css.
import { useEffect, useId, useRef, useState } from 'react';
import { MARK } from '../theme';

const WORD = 'fletora.';
/** Each letter's pen stroke in its own 0..1 box, and how long it takes to write (seconds). */
const PEN: { d: string; dur: number }[] = [
  { d: 'M0.387 0.485 C0.437 0.459 0.613 0.374 0.688 0.334 C0.762 0.293 0.798 0.268 0.835 0.242 C0.873 0.217 0.886 0.208 0.911 0.183 C0.937 0.158 0.975 0.117 0.987 0.091 C1.000 0.066 1.000 0.046 0.987 0.031 C0.975 0.016 0.949 0.000 0.911 0.000 C0.874 0.000 0.799 0.016 0.761 0.031 C0.724 0.046 0.725 0.041 0.688 0.091 C0.650 0.142 0.599 0.248 0.537 0.334 C0.474 0.420 0.387 0.525 0.312 0.606 C0.237 0.687 0.137 0.768 0.087 0.818 C0.037 0.869 0.025 0.884 0.012 0.910 C0.000 0.935 0.000 0.954 0.012 0.969 C0.025 0.984 0.050 1.000 0.087 1.000 C0.125 1.000 0.200 0.989 0.237 0.969 C0.275 0.949 0.287 0.939 0.312 0.879 C0.337 0.818 0.362 0.647 0.387 0.606 C0.412 0.566 0.424 0.632 0.462 0.637 C0.499 0.642 0.562 0.642 0.612 0.637 C0.662 0.632 0.724 0.616 0.761 0.606 C0.799 0.596 0.798 0.596 0.835 0.576 C0.873 0.556 0.962 0.500 0.987 0.485', dur: 0.49 }, // f
  { d: 'M0.000 0.755 C0.042 0.732 0.146 0.677 0.250 0.614 C0.354 0.551 0.541 0.433 0.624 0.378 C0.707 0.323 0.705 0.324 0.747 0.285 C0.788 0.245 0.852 0.182 0.873 0.142 C0.894 0.103 0.894 0.072 0.873 0.048 C0.852 0.024 0.809 0.000 0.747 0.000 C0.684 0.000 0.563 0.024 0.501 0.048 C0.439 0.072 0.416 0.095 0.374 0.142 C0.332 0.190 0.291 0.245 0.250 0.331 C0.208 0.418 0.146 0.560 0.125 0.662 C0.104 0.765 0.104 0.890 0.125 0.945 C0.146 1.000 0.208 0.984 0.250 0.992 C0.291 1.000 0.312 1.000 0.374 0.992 C0.437 0.984 0.562 0.961 0.624 0.945 C0.686 0.929 0.684 0.929 0.747 0.898 C0.809 0.866 0.958 0.779 1.000 0.755', dur: 0.3 }, // l
  { d: 'M0.115 0.768 C0.148 0.751 0.262 0.697 0.312 0.661 C0.361 0.626 0.379 0.608 0.412 0.554 C0.445 0.501 0.493 0.412 0.509 0.340 C0.525 0.269 0.525 0.180 0.509 0.127 C0.493 0.073 0.445 0.036 0.412 0.018 C0.379 0.000 0.361 0.000 0.312 0.018 C0.262 0.036 0.164 0.073 0.115 0.127 C0.066 0.180 0.033 0.252 0.016 0.340 C0.000 0.430 0.000 0.572 0.016 0.661 C0.033 0.751 0.066 0.822 0.115 0.875 C0.164 0.929 0.246 0.964 0.312 0.982 C0.378 1.000 0.443 1.000 0.509 0.982 C0.575 0.964 0.657 0.911 0.706 0.875 C0.755 0.839 0.757 0.840 0.806 0.768 C0.855 0.697 0.968 0.499 1.000 0.446', dur: 0.19 }, // e
  { d: 'M0.000 0.749 C0.037 0.726 0.148 0.664 0.222 0.610 C0.297 0.555 0.409 0.453 0.446 0.422 M0.778 0.000 C0.667 0.141 0.222 0.687 0.111 0.844 C0.000 1.000 0.093 0.914 0.111 0.937 C0.130 0.961 0.166 0.977 0.222 0.984 C0.278 0.992 0.372 0.992 0.446 0.984 C0.520 0.977 0.610 0.953 0.665 0.937 C0.720 0.922 0.722 0.922 0.778 0.891 C0.834 0.859 0.963 0.773 1.000 0.749 M0.111 0.375 L0.891 0.375', dur: 0.29 }, // t
  { d: 'M0.435 0.018 C0.411 0.018 0.342 0.000 0.295 0.018 C0.249 0.036 0.188 0.090 0.153 0.127 C0.118 0.163 0.106 0.182 0.082 0.235 C0.059 0.289 0.024 0.375 0.012 0.446 C0.000 0.517 0.000 0.590 0.012 0.661 C0.024 0.733 0.047 0.822 0.082 0.875 C0.118 0.929 0.177 0.964 0.224 0.982 C0.271 1.000 0.318 1.000 0.365 0.982 C0.412 0.964 0.471 0.911 0.506 0.875 C0.542 0.839 0.555 0.822 0.578 0.768 C0.602 0.715 0.636 0.626 0.648 0.554 C0.659 0.483 0.659 0.412 0.648 0.340 C0.636 0.269 0.614 0.180 0.578 0.127 C0.543 0.073 0.470 0.018 0.435 0.018 C0.399 0.018 0.377 0.073 0.365 0.127 C0.353 0.180 0.353 0.269 0.365 0.340 C0.377 0.412 0.399 0.501 0.435 0.554 C0.470 0.608 0.519 0.644 0.578 0.661 C0.637 0.679 0.730 0.679 0.789 0.661 C0.848 0.644 0.895 0.590 0.930 0.554 C0.966 0.518 0.988 0.464 1.000 0.446', dur: 0.27 }, // o
  { d: 'M0.000 0.490 C0.026 0.441 0.116 0.278 0.154 0.197 C0.192 0.115 0.218 0.000 0.231 0.000 C0.244 0.000 0.192 0.164 0.231 0.197 C0.269 0.229 0.409 0.180 0.460 0.197 C0.512 0.213 0.526 0.248 0.538 0.297 C0.551 0.346 0.551 0.408 0.538 0.490 C0.526 0.572 0.473 0.721 0.460 0.787 C0.447 0.853 0.447 0.852 0.460 0.885 C0.473 0.918 0.512 0.967 0.538 0.983 C0.565 1.000 0.578 1.000 0.617 0.983 C0.655 0.967 0.730 0.918 0.768 0.885 C0.806 0.852 0.808 0.853 0.846 0.787 C0.885 0.721 0.974 0.539 1.000 0.490', dur: 0.17 }, // r
  { d: 'M0.566 0.340 C0.556 0.305 0.537 0.180 0.506 0.127 C0.475 0.073 0.421 0.036 0.380 0.018 C0.339 0.000 0.299 0.000 0.258 0.018 C0.217 0.036 0.165 0.090 0.134 0.127 C0.103 0.163 0.093 0.182 0.072 0.235 C0.051 0.289 0.021 0.375 0.010 0.446 C0.000 0.517 0.000 0.590 0.010 0.661 C0.021 0.733 0.041 0.822 0.072 0.875 C0.103 0.929 0.154 0.964 0.196 0.982 C0.237 1.000 0.278 1.000 0.319 0.982 C0.360 0.964 0.412 0.929 0.443 0.875 C0.474 0.822 0.475 0.804 0.506 0.661 C0.536 0.518 0.617 0.036 0.627 0.018 C0.637 0.000 0.577 0.411 0.566 0.554 C0.556 0.697 0.556 0.804 0.566 0.875 C0.577 0.946 0.607 0.964 0.627 0.982 C0.648 1.000 0.659 1.000 0.690 0.982 C0.721 0.964 0.783 0.911 0.814 0.875 C0.844 0.839 0.843 0.840 0.874 0.768 C0.905 0.697 0.979 0.499 1.000 0.446', dur: 0.3 }, // a
];
const START = 0.35, FILL = 0.14, DOT = 0.16;

interface Glyph { c: string; x: number; box: { x: number; y: number; w: number; h: number }; pen?: string; at: number; dur: number }

export function InkWord() {
  const id = useId().replace(/:/g, ''), ref = useRef<HTMLElement>(null), base = useRef<HTMLSpanElement>(null);
  const [m, setM] = useState<{ w: number; h: number; y: number; size: number; glyphs: Glyph[] } | null>(null);
  useEffect(() => {
    const measure = () => {
      const e = ref.current, b = base.current; if (!e || !b) return;
      const cs = getComputedStyle(e), size = parseFloat(cs.fontSize), y = b.offsetTop;
      const ctx = document.createElement('canvas').getContext('2d'); if (!ctx) return;
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      // Where the browser put each letter (its own spacing and kerning), and each letter's exact inked box.
      const text = e.querySelector('.ink-ghost')?.firstChild, left = e.getBoundingClientRect().left, r = document.createRange();
      if (!text) return;
      let t = START; const glyphs: Glyph[] = [];
      [...WORD].forEach((c, i) => {
        r.setStart(text, i); r.setEnd(text, i + 1);
        const x = r.getBoundingClientRect().left - left;
        const k = ctx.measureText(c), pen = PEN[i];
        const box = { x: x - k.actualBoundingBoxLeft, y: y - k.actualBoundingBoxAscent, w: k.actualBoundingBoxLeft + k.actualBoundingBoxRight, h: k.actualBoundingBoxAscent + k.actualBoundingBoxDescent };
        const d = pen?.d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, u, v) => (box.x + +u * box.w).toFixed(1) + ' ' + (box.y + +v * box.h).toFixed(1));
        glyphs.push({ c, x, box, pen: d, at: t, dur: pen ? pen.dur : DOT }); t += pen ? pen.dur : DOT;
      });
      setM({ w: e.offsetWidth, h: e.offsetHeight, y, size, glyphs });
    };
    measure();
    document.fonts?.ready.then(measure);
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, []);
  const end = m ? m.glyphs[m.glyphs.length - 1].at + DOT : 0;
  return (
    <em ref={ref} className={'ink-word' + (m ? ' ink-on' : '')} style={{ color: MARK }}>
      <span className="ink-ghost">{WORD}<span ref={base} className="ink-base" /></span>
      {m && (
        <svg className="ink-draw" width={m.w} height={m.h} viewBox={`0 0 ${m.w} ${m.h}`} aria-hidden="true">
          <defs>
            {m.glyphs.map((g, i) => (
              <mask key={i} id={`${id}-${i}`} maskUnits="userSpaceOnUse" x={-m.w} y={-m.h} width={m.w * 3} height={m.h * 3}>
                {g.pen && <path className="ink-pen" d={g.pen} pathLength={1} fill="none" stroke="#fff" strokeWidth={m.size * 0.26} strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: g.at + 's', animationDuration: g.dur + 's' }} />}
                <rect className="ink-fill" x={g.box.x - 4} y={g.box.y - 4} width={g.box.w + 8} height={g.box.h + 8} fill="#fff" style={{ animationDelay: (g.pen ? g.at + g.dur * 0.8 : g.at) + 's', animationDuration: (g.pen ? FILL : DOT) + 's' }} />
              </mask>
            ))}
          </defs>
          {m.glyphs.map((g, i) => <text key={i} x={g.x} y={m.y} mask={`url(#${id}-${i})`}>{g.c}</text>)}
        </svg>
      )}
      <svg className="ink-line" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 13 C 60 7, 120 16, 180 9 S 262 6, 296 11" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: end + 0.25 + 's' }} />
      </svg>
    </em>
  );
}
