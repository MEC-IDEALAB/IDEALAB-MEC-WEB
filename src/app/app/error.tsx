'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="workspace-page"><div role="alert"><h1>We couldn’t open this page.</h1><p>Your connection may have been interrupted. Please try again.</p></div><div className="button-row"><button className="button button-primary" type="button" onClick={reset}>Try again</button><Link className="button" href="/app">Return to your space</Link><Link className="text-link" href="/">Public website</Link></div></div>; }
