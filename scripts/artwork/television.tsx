// Original CRT geometry drawn entirely from code glyphs, not the tutorial image.
function roundedBox(x: number, y: number, cx: number, cy: number, w: number, h: number, radius: number) {
  const dx = Math.abs(x - cx) - w + radius, dy = Math.abs(y - cy) - h + radius;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius;
}
const television = Array.from({ length: 6 }, () => [] as [number, number, string][]);
for (let row = 0; row < 65; row++) {
  const lines = television.map(() => Array<string>(160).fill(' '));
  for (let column = 0; column < 160; column++) {
    const x = column * 7.5, y = row * 7.5;
    const outer = roundedBox(x, y, 600, 250, 418, 207, 36);
    const screen = roundedBox(x, y, 525, 235, 287, 147, 30);
    const bezel = roundedBox(x, y, 525, 235, 305, 165, 36);
    const seed = (column * 31 + row * 17 + column * row) % 97;
    let tone = -1;
    if (outer < 0 && screen > 0) {
      tone = outer > -10 ? 3 : bezel > -7 && bezel < 7 ? 2 : 0;
      if (x > 865 && x < 971 && y > 298 && y < 391 && row % 2 === 0) tone = 2;
      const knob = Math.abs(Math.hypot(x - 920, y - 150) - 30);
      const dial = Math.abs(Math.hypot(x - 920, y - 240) - 22);
      if (knob < 5 || dial < 4) tone = 3;
      if (Math.abs(x - 920) < 4 && y > 126 && y < 151) tone = 5;
      if (outer > -26 && outer < -14) tone = 1;
      if (tone >= 2 && seed % 43 === 0) tone = 4;
    }
    if (y > 452 && y < 480 && ((x > 238 && x < 283) || (x > 916 && x < 961))) tone = 2;
    if (y < 48 && ((Math.abs(x - (505 + y * 1.4)) < 4) || (Math.abs(x - (695 - y * 1.4)) < 4))) tone = 2;
    if (tone >= 0) lines[tone][column] = tone >= 2 && seed % 13 === 0 ? '\u25a0' : '.:+01X#'[seed % 7];
  }
  lines.forEach((line, tone) => {
    const value = line.join('').trimEnd(), glyphs = value.trimStart();
    if (glyphs) television[tone].push([row, value.length - glyphs.length, glyphs]);
  });
}
const tones = ['#262b34', '#596473', '#a7b0bd', '#e3e7ed', '#2864ff', '#e5dd86'];

export function AsciiTelevision() {
  return <g className="ascii-tv" fontFamily="'Courier New', monospace" fontSize="10" xmlSpace="preserve">
    {television.map((rows, tone) => <g fill={tones[tone]} key={tone}>{rows.map(([row, offset, glyphs]) => <text key={row} x={offset * 7.5} y={row * 7.5} textLength={glyphs.length * 7.5} lengthAdjust="spacingAndGlyphs">{glyphs}</text>)}</g>)}
    <text x="525" y="430" textAnchor="middle" fill="#a7b0bd" fontSize="11" letterSpacing="4">IDEALAB / SIGNAL 01</text>
    <path className="ascii-tv-scan" d="M255 236H795" stroke="#2864ff" strokeWidth="1" opacity=".65" />
  </g>;
}
