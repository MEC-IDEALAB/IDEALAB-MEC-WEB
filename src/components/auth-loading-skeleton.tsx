export function AuthLoadingSkeleton({ signup = false }: { signup?: boolean }) {
  return <>
    <span className="sr-only" role="status">{signup ? 'Opening create account…' : 'Opening sign in…'}</span>
    <div className="auth-navigation-skeleton auth-skeleton" aria-busy="true">
    <div className="auth-grid" data-auth-view={signup ? 'create-account' : 'sign-in'} aria-hidden="true">
      <section className="auth-story"><div className="auth-skeleton-bar auth-skeleton-brand" /><div className="auth-skeleton-headline" /><div className="auth-skeleton-console"><span>01 + 10 + X</span></div></section>
      <div className="auth-card-stage"><div className="auth-card"><div className="auth-skeleton-bar auth-skeleton-title" /><div className="auth-skeleton-field" /><div className="auth-skeleton-field" /><div className="auth-skeleton-submit" /><div className="auth-skeleton-field" /><div className="auth-skeleton-bar" /></div></div>
    </div>
  </div></>;
}
