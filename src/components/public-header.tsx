import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { ThemePicker } from './theme-picker';
import { DesktopNavigation, MobileNavigation } from './public-navigation';

export function PublicHeader() {
  return <header className="site-header"><div className="container header-inner">
    <Brand />
    <DesktopNavigation />
    <ThemePicker />
    <Link className="button button-small header-signin" href="/sign-in">Sign in <ArrowUpRight size={17} aria-hidden="true" /></Link>
    <MobileNavigation />
  </div></header>;
}
