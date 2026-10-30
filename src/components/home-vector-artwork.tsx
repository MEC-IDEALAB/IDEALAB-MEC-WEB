/** Original decorative vector study based on the supplied optical-print references. */
export function HomeVectorArtwork() {
  return <svg className="home-vector-artwork" viewBox="0 0 600 540" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <pattern id="home-checker" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="var(--vector-paper)" />
        <path d="M0 0h12v12H0zM12 12h12v12H12z" fill="var(--vector-black)" />
      </pattern>
      <clipPath id="home-checker-orb"><circle cx="76" cy="224" r="41" /></clipPath>
    </defs>
    <rect width="600" height="540" fill="var(--vector-black)" />
    <g className="home-warp-grid" stroke="var(--vector-paper)" strokeOpacity=".86" strokeWidth="1.35">
      <path d="M22 42C132 27 168 77 255 54S420 14 578 62" />
      <path d="M18 82C126 62 171 114 258 93S422 55 581 104" />
      <path d="M16 124C128 97 174 153 261 132S426 96 583 145" />
      <path d="M14 167C129 133 177 192 265 171S430 137 585 187" />
      <path d="M12 212C130 169 181 230 270 211S435 180 587 231" />
      <path d="M10 258C132 208 185 270 275 251S440 223 589 274" />
      <path d="M8 305C134 247 190 310 280 292S446 266 591 318" />
      <path d="M7 354C136 288 195 352 286 335S452 311 593 364" />
      <path d="M6 405C139 330 201 394 292 378S459 356 595 410" />
      <path d="M5 458C142 374 207 437 299 421S466 400 597 456" />
      <path d="M42 20C69 111 19 166 48 250S82 402 39 520" />
      <path d="M94 14C117 108 67 165 96 250S133 405 88 524" />
      <path d="M148 12C168 107 118 165 148 251S185 408 138 526" />
      <path d="M204 11C221 107 171 166 201 252S239 411 190 528" />
      <path d="M261 10C275 108 225 167 255 253S294 414 243 530" />
      <path d="M319 10C330 108 280 168 310 254S349 417 296 531" />
      <path d="M378 11C386 109 336 169 365 255S404 420 350 532" />
      <path d="M438 13C442 111 392 170 421 256S460 423 405 533" />
      <path d="M498 16C499 113 449 172 477 258S516 425 460 534" />
      <path d="M557 21C555 116 505 174 533 260S571 427 515 535" />
    </g>
    <g className="home-vector-orbits" stroke="var(--vector-paper)" strokeWidth="2.1">
      <ellipse cx="76" cy="126" rx="48" ry="17" transform="rotate(-31 76 126)" />
      <ellipse cx="76" cy="126" rx="38" ry="17" transform="rotate(28 76 126)" />
      <ellipse cx="76" cy="126" rx="27" ry="17" transform="rotate(-31 76 126)" />
      <ellipse cx="76" cy="126" rx="17" ry="17" transform="rotate(28 76 126)" />
    </g>
    <g className="home-vector-checker" clipPath="url(#home-checker-orb)">
      <rect x="35" y="183" width="82" height="82" fill="url(#home-checker)" />
      <path d="M35 224h82M76 183v82" stroke="var(--vector-black)" strokeWidth="2" />
    </g>
    <circle cx="76" cy="224" r="41" stroke="var(--vector-paper)" strokeWidth="3" />
    <g className="home-vector-sun" stroke="var(--signal-magenta)" strokeWidth="3" strokeLinecap="square">
      <path d="M76 287v25m0 23v25m-49-49h25m48 0h25m-82-34 18 18m36 36 18 18m-72 0 18-18m36-36 18-18" />
      <circle cx="76" cy="335" r="21" />
      <circle cx="76" cy="335" r="9" />
    </g>
    <g className="home-vector-pixels" fill="var(--signal-lime)">
      <path d="M20 378h17v17H20zM54 378h17v17H54zM88 378h17v17H88zM37 395h17v17H37zM71 395h17v17H71zM20 412h17v17H20zM54 412h17v17H54zM88 412h17v17H88z" />
    </g>
    <g className="home-vector-barcode" stroke="var(--vector-paper)" strokeWidth="4">
      <path d="M17 459v45M25 459v45M34 459v45M48 459v45M61 459v45M66 459v45M79 459v45M90 459v45M100 459v45M113 459v45M121 459v45M132 459v45" />
    </g>
    <path d="m77 67 6 14 15 1-12 10 4 15-13-8-13 8 4-15-12-10 15-1 6-14Z" fill="var(--signal-magenta)" stroke="var(--vector-black)" strokeWidth="3" strokeLinejoin="round" />
  </svg>;
}
