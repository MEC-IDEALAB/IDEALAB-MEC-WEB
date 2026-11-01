import { AsciiTelevision } from './ascii-television';
import { AsciiEnergy } from './ascii-energy';

// Offline glyph textures preserve the public-domain anatomy without per-frame text paint.

export function AsciiHands({ idPrefix }: { idPrefix: string }) {
  return <svg className="loader-ascii" viewBox="0 0 1200 500" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${idPrefix}-light`}><stop stopColor="#2864ff" stopOpacity=".1" /><stop offset="1" stopColor="#2864ff" stopOpacity="0" /></radialGradient>
    </defs>
    <g className="ascii-stage">
    <AsciiTelevision />
    <g className="ascii-world">
    {(['left', 'right'] as const).map(side => <g className={`ascii-hand ascii-hand--${side}`} key={side}>
      <g className="ascii-hand-ink"><image className="ascii-sprite" data-src={`/intro/hand-${side}.png`} suppressHydrationWarning x="0" y="0" width="1200" height="500" /></g>
    </g>)}
    <g className="ascii-flow" fill="none" stroke="#2864ff" strokeWidth="2.5" strokeLinecap="square" strokeDasharray="1 24">
      <path d="M260 210Q390 170 590 248" /><path d="M940 190Q795 170 608 230" />
    </g>
    <g className="ascii-packet ascii-packet--left" fill="#4c7dff"><rect x="410" y="232" width="5" height="5" /><rect x="395" y="230" width="3" height="3" /></g>
    <g className="ascii-packet ascii-packet--right" fill="#4c7dff"><rect x="800" y="218" width="5" height="5" /><rect x="816" y="219" width="3" height="3" /></g>
    <g className="ascii-connection">
      <ellipse cx="600" cy="240" rx="100" ry="80" fill={`url(#${idPrefix}-light)`} />
      <path className="ascii-bridge" pathLength="1" d="M590 248L608 230" fill="none" stroke="#6c96ff" strokeWidth="1.5" />
      <path className="ascii-spark" d="M600 223v-7m0 48v-7m-17-17h-7m48 0h-7m-28-11-5-5m32 32-5-5m-22 0-5 5m32-32-5 5" fill="none" stroke="#4b7dff" strokeWidth="1" />
    </g>
    <AsciiEnergy />
    </g>
    </g>
  </svg>;
}
