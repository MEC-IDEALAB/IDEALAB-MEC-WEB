import type { Metadata } from "next";
import { headers } from 'next/headers';
import localFont from "next/font/local";
import "./globals.css";
import './theme.css';
import './design-tokens.css';
import './reference-design.css';
import './brand-loading.css';
import './audit-polish.css';
import './home-neo.css';
import './home-refinements.css';
import './onboarding-preview.css';
import './staff-preview.css';
import './auth-recovery.css';
import './auth-flow.css';
import './member-shell.css';
import './account-setup.css';
import { BrandLoading } from '@/components/brand-loading';
import { BootReady } from '@/components/boot-ready';
import { PwaServiceWorker } from '@/components/pwa-service-worker';
import { VercelTelemetry } from '@/components/vercel-telemetry';
import { BRAND_LOADING_EXIT_MS, BRAND_LOADING_WATCHDOG_MS } from '@/lib/brand-loading';

const display = localFont({ src: [{ path: "./fonts/SpaceGrotesk-Regular.ttf", weight: "400" }, { path: "./fonts/SpaceGrotesk-Bold.ttf", weight: "700" }], variable: "--font-display", display: "swap" });
const brutal = localFont({ src: './fonts/Anton-Regular.ttf', variable: '--font-brutal', display: 'swap' });
const editorial = localFont({ src: './fonts/BricolageGrotesque-Variable.ttf', variable: '--font-editorial', weight: '200 800', display: 'swap' });
const body = localFont({ src: [{ path: "./fonts/DMSans-Regular.ttf", weight: "400" }, { path: "./fonts/DMSans-Medium.ttf", weight: "500" }], variable: "--font-body", display: "swap" });
const retro = localFont({ src: './fonts/PressStart2P-Regular.ttf', variable: '--font-retro', display: 'swap' });

const BOOTSTRAP_SCRIPT = `
try {
  var theme = localStorage.getItem('idealab-mec:theme');
  document.documentElement.dataset.theme = theme === 'dark' || theme === 'light' ? theme : 'system';
} catch {}
try {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.dataset.tickerMotion = 'ready';
  }
} catch {}
try {
  var root = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!sessionStorage.getItem('idealab-mec:visited')) {
    sessionStorage.setItem('idealab-mec:visited', '1');
    if (!reducedMotion) {
      root.dataset.boot = 'loading';
      root.dataset.bootStarted = String(performance.now());
      setTimeout(function () {
        if (root.dataset.boot !== 'loading') return;
        root.dataset.boot = 'leaving';
        setTimeout(function () {
          root.removeAttribute('data-boot');
          delete root.dataset.bootStarted;
          var content = document.getElementById('site-content');
          if (content) content.inert = false;
        }, ${BRAND_LOADING_EXIT_MS});
      }, ${BRAND_LOADING_WATCHDOG_MS});
    }
  }
} catch {}
`;

export const metadata: Metadata = {
  title: { default: "IDEALAB MEC — A place to make things happen", template: "%s | IDEALAB MEC" },
  description: "Explore the IDEA Lab at Model Engineering College. Bring your ideas, discover the lab, and connect with a community of makers.",
  icons: { icon: [{ url: "/brand/app-icon-192.png", type: "image/png" }], apple: "/brand/app-icon-192.png" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${retro.variable} ${brutal.variable} ${editorial.variable}`}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <PwaServiceWorker />
        <BrandLoading boot />
        <BootReady />
        <div id="site-content" suppressHydrationWarning>
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: "if(document.documentElement.dataset.boot==='loading'&&document.currentScript&&document.currentScript.parentElement){document.currentScript.parentElement.inert=true}",
            }}
          />
          <a className="skip-link" href="#main-content">Skip to content</a>
          {children}
        </div>
        <VercelTelemetry vercelEnvironment={process.env.VERCEL_ENV} />
      </body>
    </html>
  );
}
