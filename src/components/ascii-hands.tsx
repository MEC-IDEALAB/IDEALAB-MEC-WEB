/** Original code-glyph study: curved silhouettes, tonal shading and joint creases. */
export function AsciiHands({ idPrefix }: { idPrefix: string }) {
  const left = 'M-45 330C40 310 126 291 207 281C243 276 266 258 293 243C320 227 343 219 370 218C394 216 413 224 437 228L489 234L550 239Q574 238 581 247Q583 255 567 259L504 258L451 254L419 259C431 267 451 276 462 288Q469 298 461 304Q455 309 444 303L401 282L381 280L413 308Q429 320 420 331Q413 340 401 331L362 302L344 298L377 333Q385 344 376 352Q368 360 355 348L322 319L312 316Q332 343 324 352Q314 365 299 351L269 326C240 327 225 319 208 318C141 332 74 358-36 402Z';
  const right = 'M1240 117C1153 139 1072 161 1007 190L956 210C939 213 926 204 908 207C880 207 863 218 842 226L800 239L755 248L703 251L644 251Q624 249 619 259Q618 267 637 271L700 272L758 267L803 260L820 263L794 287L768 319Q761 331 770 337Q780 344 791 331L823 302L845 290L828 319L818 344Q817 357 829 359Q839 360 846 344L866 312L880 300L869 330Q865 347 876 350Q888 353 894 336L914 299C937 293 953 288 975 282C1049 260 1136 238 1240 229Z';
  const palette = ' .:;+xX01$#';
  const rows = Array.from({ length: 56 }, (_, row) => Array.from({ length: 176 }, (_, column) => {
    // Continuous tonal bands give the code a sculpted surface instead of tiled wallpaper.
    const grain = ((column * 17 + row * 31 + column * row * 3) % 97) / 97;
    const contour = .5 + .5 * Math.sin(column * .053 + Math.sin(row * .14) * 1.8);
    return palette[Math.min(palette.length - 1, Math.floor((grain * .48 + contour * .52) * palette.length))];
  }).join(''));
  return <svg className="loader-ascii" viewBox="0 0 1200 500" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id={`${idPrefix}-left`}><path d={left} /></clipPath>
      <clipPath id={`${idPrefix}-right`}><path d={right} /></clipPath>
      <linearGradient id={`${idPrefix}-shade`} x1="0" y1="365" x2="20" y2="207" gradientUnits="userSpaceOnUse"><stop stopColor="#565e59" /><stop offset=".42" stopColor="#b8c2b9" /><stop offset=".72" stopColor="#f5f4ee" /><stop offset="1" stopColor="#7d8781" /></linearGradient>
      <linearGradient id={`${idPrefix}-right-shade`} x1="900" y1="345" x2="860" y2="190" gradientUnits="userSpaceOnUse"><stop stopColor="#656e68" /><stop offset=".5" stopColor="#f5f4ee" /><stop offset="1" stopColor="#8c9690" /></linearGradient>
      <pattern id={`${idPrefix}-dots`} width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#787b72" opacity=".2" /></pattern>
      <g id={`${idPrefix}-glyphs`} fontFamily="monospace" fontSize="10" letterSpacing=".3" xmlSpace="preserve">
        {rows.map((line, row) => <text key={row} x="-12" y={row * 9} textLength="1232" lengthAdjust="spacingAndGlyphs">{line}</text>)}
      </g>
    </defs>
    <rect width="1200" height="500" fill={`url(#${idPrefix}-dots)`} />
    <g className="ascii-hand ascii-hand--left">
      <g clipPath={`url(#${idPrefix}-left)`}>
        <use href={`#${idPrefix}-glyphs`} fill={`url(#${idPrefix}-shade)`} />
        <path className="ascii-crease" d="M208 284Q227 294 222 316M243 279Q250 298 243 319M288 251Q310 275 300 303M350 230Q369 244 366 263M402 236L398 249M459 240L458 252M508 245L508 257M334 280Q349 274 367 280M312 306L325 295" />
      </g>
    </g>
    <g className="ascii-hand ascii-hand--right">
      <g clipPath={`url(#${idPrefix}-right)`}>
        <use href={`#${idPrefix}-glyphs`} fill={`url(#${idPrefix}-right-shade)`} />
        <path className="ascii-crease" d="M1010 194Q1000 230 1015 269M964 214Q949 248 969 282M916 219Q908 244 925 272M872 233Q863 247 872 260M820 247L823 259M755 254L756 266M701 257L702 269M842 279L850 285M866 300L880 305" />
      </g>
    </g>
    <g className="ascii-connection"><circle cx="600" cy="260" r="3" fill="#ffe029" /><circle className="ascii-connection-ring" cx="600" cy="260" r="15" fill="none" stroke="#ffe029" strokeWidth=".7" /></g>
    <text className="ascii-coordinate" x="600" y="445" textAnchor="middle" fill="#a3a69c" fontFamily="monospace" fontSize="10" letterSpacing="3">CURIOSITY / CONNECTION / CREATION</text>
  </svg>;
}
