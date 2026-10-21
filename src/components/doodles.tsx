export function DoodleStar({ className = '' }: { className?: string }) {
  return <svg className={`doodle ${className}`} viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false">
    <path d="m61 12 9 28 28-13-14 27 25 17-31 4-7 31-17-25-28 11 12-27-25-18 31 1 17-36Z" fill="currentColor" stroke="var(--accent-ink)" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="m91 8 3 10m11 7 8-4M12 86l-7 6" stroke="var(--accent-ink)" strokeWidth="2.5" strokeLinecap="round" />
  </svg>;
}
export function DoodleOrbit({ className = '' }: { className?: string }) {
  return <svg className={`doodle ${className}`} viewBox="0 0 180 110" fill="none" aria-hidden="true" focusable="false" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="90" cy="55" rx="76" ry="24" transform="rotate(-22 90 55)" />
    <ellipse cx="90" cy="55" rx="63" ry="24" transform="rotate(30 90 55)" />
    <path d="m90 33 19 11v22L90 77 71 66V44l19-11Z" fill="var(--accent-apricot)" />
    <path d="m71 44 19 11 19-11M90 55v22" />
    <circle cx="147" cy="30" r="6" fill="var(--accent-mint)" />
    <path d="M19 13v12m-6-6h12M149 87l3 7m8-11 5-3" />
  </svg>;
}

export function DoodleTrail({ className = '' }: { className?: string }) {
  return <svg className={`doodle ${className}`} viewBox="0 0 230 100" fill="none" aria-hidden="true" focusable="false" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path data-draw="" d="M12 76c40 15 91-1 89-29-2-24-37-19-32 2 6 28 67 36 93 3l37-36" />
    <path d="m180 16 22-3-1 23" />
    <circle cx="20" cy="35" r="6" fill="var(--accent-mint)" />
    <path d="M139 12v12m-6-6h12M214 66v10m-5-5h10" />
  </svg>;
}
