export function BrandLoading({ boot = false }: { boot?: boolean }) {
  return <div className={boot ? 'brand-loader boot-loader' : 'brand-loader'} role="status" aria-label="Loading IDEALAB MEC">
    <div className="loader-wall" aria-hidden="true">{Array.from({ length: 8 }, (_, row) => <div className="loader-row" key={row}>{Array.from({ length: 5 }, (_, column) => <span key={column}>IDEALAB<span className="loader-mec">.MEC</span><i>✳</i></span>)}</div>)}</div>
    <div className="loader-label" aria-hidden="true"><span className="loader-dot" /> IDEALAB MEC <span>LOADING</span></div>
    <span className="sr-only">Loading the IDEA Lab website.</span>
  </div>;
}
