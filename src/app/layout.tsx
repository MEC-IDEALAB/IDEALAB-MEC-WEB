import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import './theme.css';

const display = localFont({ src: [{ path: "./fonts/SpaceGrotesk-Regular.ttf", weight: "400" }, { path: "./fonts/SpaceGrotesk-Bold.ttf", weight: "700" }], variable: "--font-display", display: "swap" });
const body = localFont({ src: [{ path: "./fonts/DMSans-Regular.ttf", weight: "400" }, { path: "./fonts/DMSans-Medium.ttf", weight: "500" }], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "IDEALAB MEC — A place to make things happen", template: "%s | IDEALAB MEC" },
  description: "Explore the IDEA Lab at Model Engineering College. Bring your ideas, discover the lab, and connect with a community of makers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable}`}><head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('idealab-mec:theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:'system'}catch{document.documentElement.dataset.theme='system'}" }} /></head><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
