import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { ThemePicker } from './theme-picker';
import { DesktopNavigation, MobileBottomNavigation } from './public-navigation';
import { AutomaticMotionControl } from './automatic-motion';

export function PublicHeader({ showMotionControl = false }: { showMotionControl?: boolean }) {
  return <>
    <header className="site-header"><div className="container header-inner">
      <Brand />
      <DesktopNavigation />
      {showMotionControl ? <AutomaticMotionControl /> : null}
      <ThemePicker />
      <Link className="button button-small header-signin" href="/sign-in">Sign in <ArrowUpRight size={17} aria-hidden="true" /></Link>
    </div></header>
    <MobileBottomNavigation />
  </>;
}
