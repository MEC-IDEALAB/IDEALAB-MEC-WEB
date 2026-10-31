import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Vercel builds this app as Next.js and uses the framework output', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.framework, 'nextjs');
  assert.equal(Object.hasOwn(config, 'outputDirectory'), false);
});

test('PWA manifest exposes a safe-area maskable icon and the offline shell caches it', async () => {
  const manifest = await readFile(new URL('../src/app/manifest.ts', import.meta.url), 'utf8');
  const serviceWorker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const maskable = await readFile(new URL('../public/brand/app-icon-maskable.svg', import.meta.url), 'utf8');
  const sourceIcon = await readFile(new URL('../public/brand/app-icon-512.png', import.meta.url));
  const embeddedIcon = maskable.match(/href="data:image\/png;base64,([^"]+)"/);

  assert.match(manifest, /src: '\/brand\/app-icon-maskable\.svg'/);
  assert.match(manifest, /sizes: 'any',[\s\S]*?type: 'image\/svg\+xml',[\s\S]*?purpose: 'maskable'/);
  assert.match(maskable, /<rect width="512" height="512" fill="#d6ff00"\/>/);
  assert.match(maskable, /<image x="76\.8" y="76\.8" width="358\.4" height="358\.4"/);
  assert.ok(embeddedIcon, 'the maskable SVG should embed the existing mark instead of fetching an external image');
  assert.deepEqual(Buffer.from(embeddedIcon[1], 'base64'), sourceIcon);
  assert.match(serviceWorker, /'\/brand\/app-icon-maskable\.svg'/);
  assert.match(serviceWorker, /OFFLINE_ICONS\.includes\(url\.pathname\)/);
});
