export function MemberSignalArt({ variant }: { variant: 'home' | 'lab' | 'profile' }) {
  const glyphs = '01+×#';
  return <svg className={'member-signal-art member-signal-art--' + variant} viewBox="0 0 320 150" aria-hidden="true">
    <g className="member-signal-art__field">
      {Array.from({ length: 17 }, (_, row) => {
        const y = row - 8;
        const line = Array.from({ length: 39 }, (_, column) => {
          const x = column - 19;
          const radius = Math.hypot(x / 1.8, y);
          const visible = variant === 'lab' ? Math.abs(y - 3 * Math.sin(x / 4)) < 2.2
            : variant === 'profile' ? radius < 8 && (radius > 5 || Math.abs(x - y) < 3)
            : radius < 7 || Math.abs(y + x / 4) < 1;
          return visible ? glyphs[(column * 7 + row * 3) % glyphs.length] : ' ';
        }).join('');
        return <text key={row} x="4" y={11 + row * 8} xmlSpace="preserve">{line}</text>;
      })}
    </g>
  </svg>;
}
