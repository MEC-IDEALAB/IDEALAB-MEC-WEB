export function DoodleStar({ className = '' }: { className?: string }) {
  return <svg className={`doodle ${className}`} viewBox="0 0 120 120" fill="none" aria-hidden="true"><path d="m59 6 11 36 35-17-20 33 29 20-38 2-7 34-18-30-33 12 20-31-28-23 37 2L59 6Z" fill="currentColor" stroke="var(--accent-ink)" strokeWidth="3" strokeLinejoin="round" /></svg>;
}
export function DoodleOrbit({ className = '' }: { className?: string }) {
  return <svg className={`doodle ${className}`} viewBox="0 0 180 100" fill="none" aria-hidden="true"><ellipse cx="90" cy="50" rx="80" ry="28" transform="rotate(-18 90 50)" stroke="currentColor" strokeWidth="3" /><ellipse cx="90" cy="50" rx="72" ry="21" transform="rotate(18 90 50)" stroke="currentColor" strokeWidth="2" /><path d="m88 23 8 18 20 2-15 13 4 20-18-10-17 11 3-20-16-12 21-3 10-19Z" fill="var(--yellow)" stroke="currentColor" strokeWidth="3" /></svg>;
}
