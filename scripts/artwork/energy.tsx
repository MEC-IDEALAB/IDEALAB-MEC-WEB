const cloud = Array.from({ length: 44 }, (_, row) => Array.from({ length: 96 }, (_, column) => {
  const distance = Math.hypot((column - 48) / 48, (row - 22) / 22);
  const seed = (column * 19 + row * 31 + column * row * 7) % 97;
  if (distance > 1 || seed / 97 < distance * .58) return ' ';
  return distance < .42 && seed % 3 === 0 ? '\u25a0' : '01X>+S'[seed % 6];
}).join(''));

export function AsciiEnergy({ idPrefix }: { idPrefix: string }) {
  return <g className="ascii-burst" fontFamily="'Courier New', monospace" fontSize="11" xmlSpace="preserve">
    <defs>
      <radialGradient id={`${idPrefix}-burst`} cx="600" cy="240" r="360" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fffdf0" /><stop offset=".42" stopColor="#e9edff" /><stop offset=".62" stopColor="#4f7dff" /><stop offset=".78" stopColor="#d3cf78" /><stop offset="1" stopColor="#2864ff" stopOpacity="0" />
      </radialGradient>
      {Array.from({ length: 24 }, (_, index) => {
        const angle = index * Math.PI / 12;
        return <path key={index} id={`${idPrefix}-ray-${index}`} d={`M${600 + Math.cos(angle) * 32} ${240 + Math.sin(angle) * 32}Q${600 + Math.cos(angle + .22) * 190} ${240 + Math.sin(angle + .22) * 190} ${600 + Math.cos(angle) * 590} ${240 + Math.sin(angle) * 590}`} />;
      })}
    </defs>
    <g className="ascii-burst-rays" fill="#4f7dff" opacity=".7">{Array.from({ length: 24 }, (_, index) => <text key={index} fill={index % 5 === 0 ? '#d3cf78' : undefined}><textPath href={`#${idPrefix}-ray-${index}`} textLength="550" lengthAdjust="spacingAndGlyphs">{('01> X+ 1S 0X >1 + 0X ').repeat(3)}</textPath></text>)}</g>
    <g fill={`url(#${idPrefix}-burst)`}>{cloud.map((line, row) => <text key={row} x="240" y={75 + row * 7.5} textLength="720" lengthAdjust="spacingAndGlyphs">{line}</text>)}</g>
  </g>;
}
