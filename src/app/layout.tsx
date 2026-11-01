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
import './navigation-refresh.css';
import { BrandLoading } from '@/components/brand-loading';
import { BootReady } from '@/components/boot-ready';
import { PwaServiceWorker } from '@/components/pwa-service-worker';
import { AutomaticMotionProvider } from '@/components/automatic-motion';
import { VercelTelemetry } from '@/components/vercel-telemetry';
import {
  BRAND_LOADING_EXIT_MS,
  BRAND_LOADING_MINIMUM_DURATION_MS,
  BRAND_LOADING_WATCHDOG_MS,
} from '@/lib/brand-loading';

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
  document.documentElement.dataset.automaticMotion = 'paused';
  if (localStorage.getItem('idealab-mec:automatic-motion:v1') === 'paused') {
    document.documentElement.dataset.automaticMotion = 'paused';
  }
} catch {}
try {
  var root = document.documentElement;
  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element) || !event.target.closest('.loader-skip') || !root.dataset.boot) return;
    if (root.dataset.bootHydrated === '1') {
      window.dispatchEvent(new Event('idealab-skip-intro'));
      return;
    }
    root.removeAttribute('data-boot');
    delete root.dataset.bootStarted;
    delete root.dataset.bootVisualStarted;
    delete root.dataset.bootMotion;
    var content = document.getElementById('site-content');
    if (content) content.inert = false;
    var skip = document.querySelector('.skip-link');
    if (skip) skip.focus({ preventScroll: true });
  });
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var loaderVisitKey = 'idealab-mec:loader-seen:v3';
  var localLoaderPreview = (location.hostname === '127.0.0.1' || location.hostname === 'localhost')
    && new URLSearchParams(location.search).get('loader') === 'preview';
  var replayIntro = new URLSearchParams(location.search).get('intro') === 'replay';
  localLoaderPreview = localLoaderPreview || replayIntro;
  if (localLoaderPreview) root.dataset.bootMotion = 'requested';
  if (localLoaderPreview) sessionStorage.removeItem(loaderVisitKey);
  if (localLoaderPreview || !sessionStorage.getItem(loaderVisitKey)) {
    sessionStorage.setItem(loaderVisitKey, '1');
    if (!reducedMotion || localLoaderPreview) {
      root.dataset.boot = 'loading';
      root.dataset.bootStarted = String(performance.now());
      var releaseFallback = function () {
        if (root.dataset.bootHydrated === '1' || root.dataset.boot !== 'loading') return;
        root.dataset.boot = 'leaving';
        setTimeout(function () {
          root.removeAttribute('data-boot');
          delete root.dataset.bootStarted;
          delete root.dataset.bootVisualStarted;
          delete root.dataset.bootMotion;
          var content = document.getElementById('site-content');
          if (content) content.inert = false;
        }, ${BRAND_LOADING_EXIT_MS});
      };
      var releaseFallbackAfterVisual = function () {
        if (root.dataset.bootHydrated === '1' || root.dataset.boot !== 'loading') return;
        var now = performance.now();
        var visualStarted = Number(root.dataset.bootVisualStarted);
        if (visualStarted > 0) {
          var remaining = ${BRAND_LOADING_MINIMUM_DURATION_MS} - (now - visualStarted);
          if (remaining > 0) {
            setTimeout(releaseFallbackAfterVisual, remaining);
            return;
          }
          releaseFallback();
          return;
        }
        var bootAge = now - Number(root.dataset.bootStarted);
        if (bootAge < ${BRAND_LOADING_WATCHDOG_MS}) {
          setTimeout(releaseFallbackAfterVisual, Math.min(250, ${BRAND_LOADING_WATCHDOG_MS} - bootAge));
          return;
        }
        releaseFallback();
      };
      releaseFallbackAfterVisual();
    }
  }
} catch {}
`;

const BOOT_LOADING_FALLBACK_CSS = `
.boot-loader { display: none; }
.boot-loader .loader-ascii, .boot-loader .loader-film-heading, .boot-loader .loader-film-captions { display: none; }
.boot-loader .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.boot-loader .loader-skip { position: absolute; top: max(20px,env(safe-area-inset-top)); right: 20px; z-index: 3; min-height: 44px; padding: 10px 16px; border: 1px solid #b1b7c1; border-radius: 999px; background: #000; color: #f5f4ee; font: inherit; cursor: pointer; }
.boot-loader .loader-skip:focus-visible { outline: 3px solid #ffe029; outline-offset: 4px; }
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
html[data-boot="loading"] .loader-core {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  max-width: calc(100vw - 32px);
  padding: 28px 16px;
  text-align: center;
}
html[data-boot="loading"] .loader-build { width: 82px; height: 86px; margin-bottom: 22px; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
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
@media (max-width: 480px) {
  html[data-boot="loading"] .loader-core { padding-inline: 8px; }
  html[data-boot="loading"] .loader-lockup { font-size: clamp(2.55rem, 12vw, 4.6rem); }
  html[data-boot="loading"] .loader-build { width: 66px; height: 70px; margin-bottom: 18px; }
}
`;

const BOOT_VISUAL_START_SCRIPT = `
try {
  var root = document.documentElement;
  if (root.dataset.boot === 'loading') {
    var bootStarted = Number(root.dataset.bootStarted) || performance.now();
    var spriteState = 'idle';
    var markVisualStart = function () {
      if (root.dataset.boot !== 'loading') return;
      var scene = document.querySelector('.boot-loader');
      var hands = document.querySelector('.loader-ascii');
      if (scene && hands && hands.getBoundingClientRect().width > 0) {
        var stylesheetReady = getComputedStyle(scene).getPropertyValue('--intro-scene-ready').trim() === '1';
        var handFields = hands.querySelectorAll('.ascii-hand');
        var sprites = hands.querySelectorAll('.ascii-sprite');
        var artworkDeclared = handFields.length === 2 && sprites.length === 4;
        var artworkReady = artworkDeclared && Array.prototype.every.call(handFields, function (hand) {
          var bounds = hand.getBBox();
          return bounds.width > 0 && bounds.height > 0;
        });
        if (stylesheetReady && artworkDeclared && spriteState === 'idle') {
          spriteState = 'decoding';
          Promise.all(Array.prototype.map.call(sprites, function (sprite) {
            var image = new Image();
            var source = sprite.getAttribute('data-src');
            sprite.setAttribute('href', source);
            image.src = source;
            return image.decode();
          })).then(function () {
            spriteState = 'ready';
          }).catch(function () {
            if (root.dataset.boot !== 'loading') return;
            // A missing texture must never trap a visitor behind a blank film.
            var focusWasInIntro = document.activeElement && document.activeElement.closest('.boot-loader');
            window.dispatchEvent(new Event('idealab-skip-intro'));
            root.removeAttribute('data-boot');
            delete root.dataset.bootStarted;
            delete root.dataset.bootVisualStarted;
            delete root.dataset.bootMotion;
            var content = document.getElementById('site-content');
            if (content) content.inert = false;
            var skip = document.querySelector('.skip-link');
            if (focusWasInIntro && skip) skip.focus({ preventScroll: true });
          });
        }
        // The brand is intentionally revealed in act four. Start all paused
        // clocks together once the opening scene can render, before hydration.
        if (stylesheetReady && artworkReady && spriteState === 'ready') {
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
        <AutomaticMotionProvider>
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
        </AutomaticMotionProvider>
        <VercelTelemetry vercelEnvironment={process.env.VERCEL_ENV} />
      </body>
    </html>
  );
}
