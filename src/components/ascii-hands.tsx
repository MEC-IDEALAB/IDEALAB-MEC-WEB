/** Original vector silhouettes filled with deterministic code, not a third-party animation. */
export function AsciiHands({ idPrefix }: { idPrefix: string }) {
  const glyphs = '01X+$><:.*';
  return <svg className="loader-ascii" viewBox="0 0 1200 500" aria-hidden="true" focusable="false">
    <defs>
      <pattern id={`${idPrefix}-code`} width="120" height="20" patternUnits="userSpaceOnUse">
        {Array.from({ length: 2 }, (_, row) => <text key={row} x="0" y={9 + row * 10} fontFamily="monospace" fontSize="10" letterSpacing="1.2">{Array.from({ length: 18 }, (_, column) => glyphs[(column * 7 + row * 3) % glyphs.length]).join('')}</text>)}
      </pattern>
      <pattern id={`${idPrefix}-dots`} width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#787b72" opacity=".28" /></pattern>
    </defs>
    <rect width="1200" height="500" fill={`url(#${idPrefix}-dots)`} />
    <g className="ascii-hand ascii-hand--left" fill={`url(#${idPrefix}-code)`}>
      <path d="M-30 210 135 235 240 250 305 230 350 210 400 200 450 205 510 220 560 230Q578 238 565 248L510 245 455 239 420 245 461 269Q475 280 466 290L422 276 388 267 425 293Q437 307 424 316L380 292 350 283 379 310Q389 324 375 332L330 301Q292 316 258 307L175 292-30 307Z" />
    </g>
    <g className="ascii-hand ascii-hand--right" fill={`url(#${idPrefix}-code)`}>
      <path d="M1230 130 1080 160 1000 185 935 203 880 192 836 202 798 218 750 231 687 236 635 243Q616 249 632 260L695 258 758 252 805 254 774 272 750 294Q745 310 761 312L799 284 833 270 806 300 792 322Q795 338 811 331L844 297 865 283 846 316Q846 333 862 332L891 291 923 278Q953 281 990 264L1060 239 1230 212Z" />
    </g>
    <circle className="ascii-connection" cx="600" cy="250" r="5" fill="#ffe029" />
    <text className="ascii-coordinate" x="600" y="395" textAnchor="middle" fill="#a3a69c" fontFamily="monospace" fontSize="11" letterSpacing="4">CURIOSITY → CONNECTION → CREATION</text>
  </svg>;
}
