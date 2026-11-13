type Illustration = 'mascot' | 'prototype' | 'electronics' | 'makers';

/** Small, original crisp-edge artwork for the IDEALAB MEC Home experience. */
export function HomePixelIllustration({
  variant,
  className,
}: {
  variant: Illustration;
  className?: string;
}) {
  return (
    <svg
      className={className ? `home-pixel-illustration ${className}` : 'home-pixel-illustration'}
      viewBox="0 0 128 112"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {variant === 'mascot' && <g>
        <path fill="#171717" d="M22 35h12V19h12V11h36v8h12v16h12v38H94v14H34V73H22z" />
        <path fill="#f4f1e8" d="M34 35h12V23h40v12h12v30H86v12H42V65H34z" />
        <path fill="#171717" d="M46 43h8v8h-8zm28 0h8v8h-8zM54 59h20v6H54z" />
        <path fill="#315dff" d="M34 77h60v10H34zM46 87h36v8H46z" />
        <path fill="#ff3994" d="M18 49h12v8H18zm80 0h12v8H98zM58 95h12v8H58z" />
        <path fill="#ffe029" d="M50 13h28v8H50zM28 31h8v8h-8zm64 0h8v8h-8zM22 83h12v8H22zm72 0h12v8H94z" />
        <path fill="#171717" d="M50 103h8v5h-8zm20 0h8v5h-8z" />
        <path className="home-pixel-spark" fill="#ff3994" d="M8 21h8v8H8zm102 55h8v8h-8z" />
        <path className="home-pixel-spark" fill="#ffe029" d="M8 67h8v8H8zm104-54h8v8h-8z" />
      </g>}

      {variant === 'prototype' && <g>
        <path fill="#171717" d="M22 13h84v8h8v62h-8v12H22V83h-8V21h8z" />
        <path fill="#f4f1e8" d="M30 21h68v48H30z" />
        <path fill="#315dff" d="M38 29h8v34h-8zm44 0h8v34h-8zM38 61h52v8H38z" />
        <path fill="#ff3994" d="M46 29h36v8H46zm12 8h12v8H58zM54 45h20v8H54z" />
        <path fill="#171717" d="M62 53h8v8h-8z" />
        <path fill="#ffe029" d="M34 73h60v8H34zM42 81h44v8H42zM18 29h8v8h-8zm88 40h8v8h-8z" />
        <path fill="#ff3994" d="M50 57h12v8H50zM74 57h12v8H74z" />
        <path className="home-pixel-spark" fill="#315dff" d="M6 13h8v8H6zm108 82h8v8h-8z" />
      </g>}

      {variant === 'electronics' && <g>
        <path fill="#171717" d="M18 19h92v72H18z" />
        <path fill="#315dff" d="M26 27h76v56H26z" />
        <path fill="#171717" d="M48 39h32v28H48zM32 35h8v8h-8zm56 36h8v8h-8z" />
        <path fill="#ffe029" d="M54 45h20v16H54zM26 47h18v6H26zm58 14h18v6H84zm-38 8h8v14h-8zm28-40h6v12h-6z" />
        <path fill="#ff3994" d="M32 59h12v6H32zm48-28h14v6H80zm-10 42h14v6H70z" />
        <path fill="#f4f1e8" d="M60 51h8v8h-8zM34 31h8v8h-8zm52 42h8v8h-8z" />
        <path className="home-pixel-spark" fill="#ff3994" d="M8 87h8v8H8zm104-72h8v8h-8z" />
      </g>}

      {variant === 'makers' && <g>
        <path fill="#171717" d="M10 82h108v15H10z" />
        <path fill="#ff3994" d="M16 70h30v12H16zm66 0h30v12H82z" />
        <path fill="#315dff" d="M48 74h32v12H48z" />
        <path fill="#171717" d="M20 36h8V24h24v12h8v28H52v8H28v-8h-8zm26 0h8V24h24v12h8v28h-8v8H54v-8h-8zM72 36h8V24h24v12h8v28h-8v8H80v-8h-8z" />
        <path fill="#f4f1e8" d="M28 36h24v20H28zm26 0h24v20H54zm26 0h24v20H80z" />
        <path fill="#ffe029" d="M32 24h16v8H32zm26 0h16v8H58zm26 0h16v8H84z" />
        <path fill="#171717" d="M34 42h5v5h-5zm10 0h5v5h-5zm16 0h5v5h-5zm10 0h5v5h-5zm16 0h5v5h-5zm10 0h5v5h-5z" />
        <path fill="#315dff" d="M32 60h16v12H32zm26 0h16v14H58zm26 0h16v12H84z" />
        <path className="home-pixel-spark" fill="#ffe029" d="M6 50h8v8H6zm108-35h8v8h-8z" />
      </g>}
    </svg>
  );
}
