/** Original SVG scene: a digital sketch being shaped into a printed object. */
export function HomeMakerScene() {
  return <figure className="discovery-art discovery-maker-scene">
    <div className="discovery-maker-scene__visual">
      <svg viewBox="0 0 720 470" role="img" aria-labelledby="maker-scene-title maker-scene-description" focusable="false">
        <title id="maker-scene-title">A sketch becoming a 3D printed prototype</title>
        <desc id="maker-scene-description">An original pixel-inspired vector illustration of a 3D printer forming a bright prototype from a digital blueprint.</desc>
        <defs>
          <pattern id="maker-scene-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="#b3c8ff" strokeOpacity=".12" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.4" fill="#f7f5ec" fillOpacity=".22" />
          </pattern>
          <linearGradient id="maker-scene-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#19284e" stopOpacity=".72" />
            <stop offset="1" stopColor="#0b0c12" stopOpacity=".92" />
          </linearGradient>
          <linearGradient id="maker-scene-print" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff06a" />
            <stop offset=".5" stopColor="#ffe029" />
            <stop offset="1" stopColor="#ff3994" />
          </linearGradient>
          <filter id="maker-scene-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="720" height="470" fill="#090b12" />
        <rect width="720" height="470" fill="url(#maker-scene-grid)" />
        <path d="M24 26h34M24 26v34M696 26h-34M696 26v34M24 444h34M24 444v-34M696 444h-34M696 444v-34" fill="none" stroke="#ffe029" strokeWidth="3" />
        <path d="M94 354 214 292 315 334 506 215 620 268" fill="none" stroke="#315dff" strokeDasharray="6 11" strokeWidth="2" className="maker-scene-route" />

        <g className="maker-scene-blueprint">
          <path d="m112 181 73-42 73 42-73 42z" fill="url(#maker-scene-glass)" stroke="#a8c6ff" strokeWidth="3" />
          <path d="m112 181 73 42v83l-73-43zM258 181l-73 42v83l73-43z" fill="#0e1320" stroke="#a8c6ff" strokeWidth="3" />
          <path d="m137 181 48-28 49 28-49 28zM137 181v55l48 28v-55M234 181v55l-49 28" fill="none" stroke="#f7f5ec" strokeOpacity=".8" strokeWidth="2" strokeDasharray="5 5" />
          <circle cx="185" cy="181" r="5" fill="#ff3994" />
        </g>

        <g className="maker-scene-printer">
          <path d="M278 86h344v17H278zM294 103h16v263h-16zM590 103h16v263h-16z" fill="#d9dce5" stroke="#08090c" strokeWidth="5" />
          <path d="M310 108h280M302 353h296" fill="none" stroke="#f7f5ec" strokeWidth="5" />
          <path d="M337 108v243M563 108v243" fill="none" stroke="#8995ae" strokeWidth="3" />
          <g className="maker-scene-carriage">
            <path d="M340 121h218v22H340z" fill="#315dff" stroke="#08090c" strokeWidth="5" />
            <path d="M423 143h53v31h-53z" fill="#ff3994" stroke="#08090c" strokeWidth="5" />
            <path d="M433 174h33v30l-16 24-17-24z" fill="#ffe029" stroke="#08090c" strokeWidth="5" />
            <path d="M448 228v22" stroke="#ffe029" strokeWidth="4" className="maker-scene-filament" />
          </g>
          <path d="m331 351 117-41 118 41-118 43z" fill="#25385f" stroke="#f7f5ec" strokeWidth="4" />
          <path d="m350 350 98-34 98 34-98 35z" fill="#131b2d" stroke="#315dff" strokeWidth="3" />
          <path d="M338 377h218v15H338z" fill="#ff3994" stroke="#08090c" strokeWidth="5" />
        </g>

        <g className="maker-scene-object" filter="url(#maker-scene-glow)">
          <path d="m405 286 43-25 45 25-45 25z" fill="#fff06a" stroke="#08090c" strokeWidth="5" />
          <path d="m405 286 43 25v43l-43-24z" fill="#ffe029" stroke="#08090c" strokeWidth="5" />
          <path d="m493 286-45 25v43l45-24z" fill="#ff3994" stroke="#08090c" strokeWidth="5" />
          <path d="m422 287 26-15 27 15-27 15z" fill="#315dff" />
          <path d="m434 325 14 8 14-8v13l-14 8-14-8z" fill="#111" />
        </g>

        <g className="maker-scene-sparks" fill="#ffe029">
          <path d="M352 72h8v24h-8zM344 80h24v8h-24z" />
          <path d="M633 145h8v22h-8zM626 152h22v8h-22z" fill="#ff3994" />
          <path d="M111 321h8v18h-8zM106 326h18v8h-18z" fill="#a8c6ff" />
          <rect x="628" y="365" width="12" height="12" />
          <rect x="94" y="102" width="9" height="9" fill="#ff3994" />
          <rect x="658" y="208" width="9" height="9" fill="#a8c6ff" />
        </g>
        <path d="M215 322c42-28 70-35 108-31M513 277c38-18 64-20 98-8" fill="none" stroke="#f7f5ec" strokeOpacity=".5" strokeWidth="2" strokeDasharray="3 9" />
      </svg>
      <span className="discovery-maker-scene__index">MAKER STUDY / 01</span>
      <span className="discovery-maker-scene__coordinates" aria-hidden="true">10.0 · 01.0 · MEC</span>
    </div>
    <figcaption>
      <div><span>IDEA LAB / PROTOTYPE</span><strong>From a first sketch to a finished object.</strong></div>
      <span className="discovery-maker-scene__status"><i aria-hidden="true" /> DESIGN / BUILD / REFINE</span>
    </figcaption>
  </figure>;
}
