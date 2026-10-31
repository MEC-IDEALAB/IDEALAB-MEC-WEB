export function BrandLoading({ boot = false }: { boot?: boolean }) {
  return (
    <div className={boot ? 'brand-loader boot-loader' : 'brand-loader'} role="status" aria-label="Loading IDEA Lab MEC">
      <div className="loader-wall" aria-hidden="true">
        {Array.from({ length: 7 }, (_, row) => (
          <div className="loader-row" data-row={row % 2} key={row}>
            <div className="loader-loop">
              {[0, 1].map(copy => (
                <span className="loader-run" key={copy}>
                  {Array.from({ length: 7 }, (_, column) => (
                    <span className="loader-wordmark" key={column}>idealab<span>.mec</span></span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="loader-core" aria-hidden="true">
        <svg className="loader-build" viewBox="0 0 80 84" fill="none">
          <path className="loader-build-guide" d="M4 22V8h14M62 8h14v14M76 62v14H62M18 76H4V62" />
          <path className="loader-build-shell" pathLength="1" d="m40 12 25 14v30L40 71 15 56V26l25-14ZM15 26l25 15 25-15M40 41v30" />
          <path className="loader-build-detail" pathLength="1" d="m28 19 25 15v13" />
        </svg>
        <p className="loader-campus">MODEL ENGINEERING COLLEGE</p>
        <div className="loader-lockup">
          <span className="loader-title-chunk"><span>idea</span></span>
          <span className="loader-title-chunk"><span>lab</span></span>
          <span className="loader-title-chunk loader-title-chunk--mec"><span>.mec</span></span>
          <svg className="loader-title-star" viewBox="0 0 64 64" fill="none"><path d="M32 1v62M1 32h62M10 10l44 44M10 54l44-44" /></svg>
        </div>
        <p className="loader-caption">A little curiosity goes a long way.</p>
        <div className="loader-progress" aria-hidden="true"><span /></div>
      </div>
      <span className="sr-only">Preparing the IDEA Lab website.</span>
    </div>
  );
}
