export function BrandLoading({ boot = false }: { boot?: boolean }) {
  return <div className={boot ? 'brand-loader boot-loader' : 'brand-loader'} role="status" aria-label="Loading IDEALAB MEC">
    <div className="loader-wall" aria-hidden="true">{Array.from({ length: 7 }, (_, row) => <div className="loader-row" data-row={row % 3} key={row}>
      <div className="loader-loop">{[0, 1].map(copy => <span className="loader-run" key={copy}>{Array.from({ length: 6 }, (_, column) => <span className="loader-wordmark" key={column}>IDEA<span className="loader-lab">LAB</span><span className="loader-mini-mec">MEC</span><i>✳</i></span>)}</span>)}</div>
    </div>)}</div>
    <div className="loader-core" aria-hidden="true">
      <svg className="loader-art" viewBox="0 0 320 126" fill="none">
        <path className="loader-circuit" d="M12 72h64l18-18h38m38 18h38l18-18h82" />
        <circle className="loader-node loader-node--yellow" cx="12" cy="72" r="6" />
        <circle className="loader-node loader-node--blue" cx="76" cy="72" r="6" />
        <circle className="loader-node loader-node--green" cx="226" cy="72" r="6" />
        <circle className="loader-node loader-node--pink" cx="308" cy="54" r="6" />
        <g className="loader-cube">
          <path d="m132 48 26-15 26 15-26 15-26-15Z" fill="var(--accent-yellow)" />
          <path d="M132 48v31l26 15V63l-26-15Z" fill="var(--accent-blue)" />
          <path d="M184 48v31l-26 15V63l26-15Z" fill="var(--accent-pink)" />
          <path d="m132 48 26-15 26 15v31l-26 15-26-15V48Z" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M158 63v31m-26-46 26 15 26-15" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
        </g>
        <path className="loader-spark" d="m244 31 4 11 11 4-11 4-4 11-4-11-11-4 11-4 4-11Z" fill="var(--accent-yellow)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="loader-lockup"><span className="loader-idea">IDEA</span><span className="loader-lab-large">LAB</span><span className="loader-campus">MEC</span></div>
      <p className="loader-caption"><span className="loader-dot" /> Preparing the lab</p>
      <div className="loader-progress"><span /></div>
    </div>
    <span className="sr-only">Loading the IDEA Lab website.</span>
  </div>;
}
