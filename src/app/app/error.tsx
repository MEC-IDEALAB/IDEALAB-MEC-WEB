'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="workspace-page"><h1>We couldn’t open this page.</h1><p>Your connection may have been interrupted. Please try again.</p><button className="button button-primary" onClick={reset}>Try again</button></div>; }
