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
          delete root.dataset.bootVisualStarted;
          var content = document.getElementById('site-content');
          if (content) content.inert = false;
        }, ${BRAND_LOADING_EXIT_MS});
      }, ${BRAND_LOADING_WATCHDOG_MS});
    }
  }
} catch {}
`;

const BOOT_LOADING_FALLBACK_CSS = `
html[data-boot="loading"] .boot-loader {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  min-height: 100vh;
  overflow: hidden;
  isolation: isolate;
  background: #000;
  color: #f5f4ee;
  pointer-events: auto;
}
html[data-boot="loading"] .loader-wall {
  position: absolute;
  inset: -10% -20%;
  display: grid;
  align-content: center;
  gap: clamp(10px, 2vh, 22px);
  overflow: hidden;
  transform: rotate(-4deg);
  user-select: none;
  opacity: .28;
}
html[data-boot="loading"] .loader-row {
  width: max-content;
  white-space: nowrap;
  font-family: var(--font-display), sans-serif;
  font-size: clamp(2.5rem, 7.2vw, 7rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -.075em;
}
html[data-boot="loading"] .loader-row[data-row="1"] { color: transparent; -webkit-text-stroke: 1px #f5f4ee; }
html[data-boot="loading"] .loader-loop,
html[data-boot="loading"] .loader-run { display: flex; width: max-content; }
html[data-boot="loading"] .loader-loop { will-change: transform; }
html[data-boot="loading"] .loader-run { flex: 0 0 auto; align-items: center; gap: clamp(24px, 4vw, 70px); padding-right: clamp(24px, 4vw, 70px); }
html[data-boot="loading"] .loader-wordmark { display: inline-flex; align-items: baseline; }
html[data-boot="loading"] .loader-core {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  max-width: calc(100vw - 32px);
  padding: 28px 16px;
  text-align: center;
}
html[data-boot="loading"] .loader-core::before { position: absolute; z-index: -1; inset: -35px -50px; background: #000; box-shadow: 0 0 55px 35px #000; content: ''; }
html[data-boot="loading"] .loader-build { width: 70px; height: 74px; margin-bottom: 22px; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
html[data-boot="loading"] .loader-build-orbit-track { stroke: #a4a39b; stroke-width: 1; stroke-dasharray: 2 4; opacity: .76; }
html[data-boot="loading"] .loader-build-orbit-node { fill: #ff42c6; }
html[data-boot="loading"] .loader-build-guide { stroke: #777771; }
html[data-boot="loading"] .loader-build-shell { stroke: #ffe029; stroke-dasharray: 1; }
html[data-boot="loading"] .loader-build-detail { stroke: #ff42c6; stroke-dasharray: 1; }
html[data-boot="loading"] .loader-campus { margin: 0; color: #c4c4bd; font: 400 clamp(.38rem, .8vw, .57rem)/1.6 var(--font-retro), monospace; letter-spacing: .04em; }
html[data-boot="loading"] .loader-lockup {
  position: relative;
  display: flex;
  align-items: baseline;
  margin-top: 16px;
  font-family: var(--font-editorial), var(--font-display), sans-serif;
  font-size: clamp(2.9rem, 10vw, 7.8rem);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -.055em;
}
html[data-boot="loading"] .loader-title-chunk { display: block; overflow: hidden; padding-bottom: .04em; }
html[data-boot="loading"] .loader-title-chunk > span { display: block; }
html[data-boot="loading"] .loader-title-chunk--mec { color: #ffe029; }
html[data-boot="loading"] .loader-title-star { width: .36em; height: .36em; margin: 0 0 0 .15em; align-self: flex-start; stroke: #ff42c6; stroke-width: 2.5; }
html[data-boot="loading"] .loader-caption { margin: 15px 0 0; color: #c4c4bd; font-size: clamp(.75rem, 1.3vw, .95rem); line-height: 1.5; }
html[data-boot="loading"] .loader-progress { position: relative; width: 104px; height: 3px; margin-top: 25px; overflow: hidden; background: rgb(245 244 238 / 24%); }
html[data-boot="loading"] .loader-progress > span { position: absolute; inset: 0 auto 0 -35%; width: 35%; background: #ffe029; }
@media (max-width: 480px) {
  html[data-boot="loading"] .loader-wall { inset: -10% -55%; gap: 22px; }
  html[data-boot="loading"] .loader-row { font-size: 3rem; }
  html[data-boot="loading"] .loader-core { padding-inline: 8px; }
  html[data-boot="loading"] .loader-lockup { font-size: clamp(2.55rem, 12vw, 4.6rem); }
  html[data-boot="loading"] .loader-build { width: 58px; height: 62px; margin-bottom: 18px; }
}
`;

const BOOT_VISUAL_START_SCRIPT = `
try {
  var root = document.documentElement;
  if (root.dataset.boot === 'loading') {
    var bootStarted = Number(root.dataset.bootStarted) || performance.now();
    var markVisualStart = function () {
      if (root.dataset.boot !== 'loading') return;
      var core = document.querySelector('.loader-core');
      if (core && core.getBoundingClientRect().width > 0) {
        var animations = getComputedStyle(core).animationName.split(',').map(function (name) { return name.trim(); });
        var words = core.querySelectorAll('.loader-title-chunk > span');
        var titleIsVisible = words.length === 3 && Array.prototype.every.call(words, function (word) {
          var textBox = word.getBoundingClientRect();
          var clipBox = word.parentElement.getBoundingClientRect();
          var visibleHeight = Math.max(0, Math.min(textBox.bottom, clipBox.bottom) - Math.max(textBox.top, clipBox.top));
          return textBox.width > 0 && textBox.height > 0 && visibleHeight > textBox.height * .6
            && Number(getComputedStyle(word).opacity) >= .7;
        });
        if (animations.includes('loader-core-enter') && Number(getComputedStyle(core).opacity) >= .45 && titleIsVisible) {
          root.dataset.bootVisualStarted = String(performance.now());
          return;
        }
      }
      if (performance.now() - bootStarted < ${BRAND_LOADING_WATCHDOG_MS}) requestAnimationFrame(markVisualStart);
    };
    requestAnimationFrame(markVisualStart);
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
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: BOOT_LOADING_FALLBACK_CSS }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: BOOTSTRAP_SCRIPT }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: BOOT_VISUAL_START_SCRIPT }} />
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
