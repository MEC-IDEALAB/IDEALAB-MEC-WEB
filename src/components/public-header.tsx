import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { Brand } from "./brand";

const links = [["Explore", "/explore"], ["The lab", "/lab"], ["Projects", "/projects"], ["Events", "/events"]];

export function PublicHeader() {
  return <header className="site-header"><div className="container header-inner">
    <Brand />
    <nav className="desktop-nav" aria-label="Main navigation">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    <Link className="button button-small header-signin" href="/sign-in">Sign in <ArrowUpRight size={17} aria-hidden="true" /></Link>
    <details className="mobile-nav"><summary aria-label="Open navigation"><Menu size={23} aria-hidden="true" /></summary><nav aria-label="Mobile navigation">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav></details>
  </div></header>;
}
