// Glyph geometry is retained in scripts/artwork; the cached texture keeps motion light.
export function AsciiTelevision() {
  return <g className="ascii-tv">
    <image className="ascii-sprite" data-src="/intro/television.png" suppressHydrationWarning x="0" y="0" width="1200" height="500" />
    <path className="ascii-tv-scan" d="M255 236H795" stroke="#2864ff" strokeWidth="1" opacity=".65" />
  </g>;
}
