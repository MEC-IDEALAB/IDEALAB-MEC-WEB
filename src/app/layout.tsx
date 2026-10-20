import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import './theme.css';
import './design-tokens.css';
import './reference-design.css';
import './brand-loading.css';
import './audit-polish.css';
import { BrandLoading } from '@/components/brand-loading';
import { BootReady } from '@/components/boot-ready';

const display = localFont({ src: [{ path: "./fonts/SpaceGrotesk-Regular.ttf", weight: "400" }, { path: "./fonts/SpaceGrotesk-Bold.ttf", weight: "700" }], variable: "--font-display", display: "swap" });
const body = localFont({ src: [{ path: "./fonts/DMSans-Regular.ttf", weight: "400" }, { path: "./fonts/DMSans-Medium.ttf", weight: "500" }], variable: "--font-body", display: "swap" });
const retro = localFont({ src: './fonts/PressStart2P-Regular.ttf', variable: '--font-retro', display: 'swap' });

export const metadata: Metadata = {
  title: { default: "IDEALAB MEC — A place to make things happen", template: "%s | IDEALAB MEC" },
  description: "Explore the IDEA Lab at Model Engineering College. Bring your ideas, discover the lab, and connect with a community of makers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${retro.variable}`}><head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('idealab-mec:theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:'system'}catch{document.documentElement.dataset.theme='system'}try{if(!sessionStorage.getItem('idealab-mec:visited')){sessionStorage.setItem('idealab-mec:visited','1');document.documentElement.dataset.boot='loading';setTimeout(function(){document.documentElement.removeAttribute('data-boot')},5000)}}catch{} " }} /></head><body><a className="skip-link" href="#main-content">Skip to content</a><BrandLoading boot /><BootReady />{children}</body></html>;
}
