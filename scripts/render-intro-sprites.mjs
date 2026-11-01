// Export the authored glyph vectors as transparent textures. Browser motion uses
// cached images instead of repainting thousands of character outlines each frame.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
async function artworkComponent(file, symbol) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
  const runnable = compiled.replaceAll('"react/jsx-runtime"', JSON.stringify(pathToFileURL(require.resolve('react/jsx-runtime')).href));
  return (await import('data:text/javascript;base64,' + Buffer.from(runnable).toString('base64')))[symbol];
}
const field = JSON.parse(await readFile(new URL('../src/components/ascii-hand-field.json', import.meta.url), 'utf8'));
const tones = ['#30343b', '#6b7078', '#b9bbbe', '#f4f3ed', '#2864ff'];
function hand(side) {
  return h('g', { fontFamily: "'Courier New', monospace", fontSize: '12.5', xmlSpace: 'preserve' },
    field[side].map((rows, tone) => h('g', { fill: tones[tone], key: tone }, rows.map(([row, offset, glyphs]) => h('text', {
      key: row, x: offset * field.width / field.columns, y: row * field.height / field.rowCount,
      textLength: glyphs.length * field.width / field.columns, lengthAdjust: 'spacingAndGlyphs',
    }, glyphs)))));
}
const Television = await artworkComponent('./artwork/television.tsx', 'AsciiTelevision');
const Energy = await artworkComponent('./artwork/energy.tsx', 'AsciiEnergy');
const art = [
  ['hand-left', hand('left'), '0 0 1200 500', 1800, 750],
  ['hand-right', hand('right'), '0 0 1200 500', 1800, 750],
  ['television', h(Television), '0 0 1200 500', 1800, 750],
  ['energy', h(Energy, { idPrefix: 'sprite' }), '0 -350 1200 1200', 1800, 1800],
];
await mkdir(new URL('./artwork/generated/', import.meta.url), { recursive: true });
await mkdir(new URL('../public/intro/', import.meta.url), { recursive: true });
const browser = await chromium.launch({ headless: true });
try { for (const [name, content, viewBox, width, height] of art) {
  const svg = renderToStaticMarkup(h('svg', { xmlns: 'http://www.w3.org/2000/svg', width, height, viewBox },
    h('style', null, 'text{white-space:pre}.ascii-tv-scan{display:none}'), content));
  await writeFile(new URL(`./artwork/generated/${name}.svg`, import.meta.url), svg + '\n');
  // Chromium honors SVG textLength and textPath exactly as the live artwork.
  // Other SVG rasterizers lay these glyph rows out differently or omit the rays.
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent('<style>html,body{margin:0;background:transparent}svg{display:block}</style>' + svg);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.locator('svg').screenshot({ omitBackground: true });
  await page.close();
  await writeFile(new URL(`../public/intro/${name}.png`, import.meta.url), png);
  console.log(`${name}: ${width} x ${height}; ${png.length} bytes`);
} } finally { await browser.close(); }
