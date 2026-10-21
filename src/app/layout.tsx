import type { Metadata } from "next";
import { headers } from 'next/headers';
import localFont from "next/font/local";
import "./globals.css";
import './theme.css';
import './design-tokens.css';
import './reference-design.css';
import './brand-loading.css';
import './audit-polish.css';
import './onboarding-preview.css';
import './staff-preview.css';
import './auth-recovery.css';
import { BrandLoading } from '@/components/brand-loading';
import { BootReady } from '@/components/boot-ready';

const display = localFont({ src: [{ path: "./fonts/SpaceGrotesk-Regular.ttf", weight: "400" }, { path: "./fonts/SpaceGrotesk-Bold.ttf", weight: "700" }], variable: "--font-display", display: "swap" });
const body = localFont({ src: [{ path: "./fonts/DMSans-Regular.ttf", weight: "400" }, { path: "./fonts/DMSans-Medium.ttf", weight: "500" }], variable: "--font-body", display: "swap" });
const retro = localFont({ src: './fonts/PressStart2P-Regular.ttf', variable: '--font-retro', display: 'swap' });

export const metadata: Metadata = {
  title: { default: "IDEALAB MEC — A place to make things happen", template: "%s | IDEALAB MEC" },
  description: "Explore the IDEA Lab at Model Engineering College. Bring your ideas, discover the lab, and connect with a community of makers.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${retro.variable}`}><head><script nonce={nonce} dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('idealab-mec:theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:'system'}catch{document.documentElement.dataset.theme='system'}try{if(!sessionStorage.getItem('idealab-mec:visited')){sessionStorage.setItem('idealab-mec:visited','1');document.documentElement.dataset.boot='loading';document.documentElement.dataset.bootStarted=String(performance.now());setTimeout(function(){var r=document.documentElement;if(r.dataset.boot==='loading'){r.dataset.boot='leaving';setTimeout(function(){r.removeAttribute('data-boot');delete r.dataset.bootStarted;var c=document.getElementById('site-content');if(c)c.inert=false},240)}},4800)}}catch{} " }} /></head><body><BrandLoading boot /><BootReady /><div id="site-content" suppressHydrationWarning><script nonce={nonce} dangerouslySetInnerHTML={{ __html: "if(document.documentElement.dataset.boot==='loading'&&document.currentScript&&document.currentScript.parentElement){document.currentScript.parentElement.inert=true}" }} /><a className="skip-link" href="#main-content">Skip to content</a>{children}</div></body></html>;
}
