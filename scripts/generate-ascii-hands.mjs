// Offline conversion of a pinned public-domain fresco detail into real code glyphs.
// Provenance/license: docs/quality/cinematic-ascii-2026-11-01.md.
// Uses the lockfile's sharp (already installed by Next); no browser raster/image load.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const source = readFileSync(new URL('./assets/creation-of-adam-detail.jpg', import.meta.url));
if (createHash('sha256').update(source).digest('hex') !== '24638860d92ea0dbb0ccfd14ef07b216ab1ea7245ce4e2ebc38ea5732e39f28a') throw new Error('Unexpected artwork source');
const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const columns = 160, rowCount = 52, width = 1200, height = 500;
// Original-coordinate masks isolate each hand; skin chroma removes the fresco
// ground from the gaps without inventing or stretching the original anatomy.
const leftMask = [[0,350],[110,310],[175,292],[225,257],[270,250],[320,254],[400,273],[485,274],[510,307],[555,323],[589,341],[615,366],[642,405],[663,420],[663,433],[641,436],[619,421],[600,396],[585,377],[576,372],[593,406],[606,458],[618,481],[608,489],[580,486],[565,477],[553,449],[540,421],[519,400],[506,383],[498,384],[507,419],[528,450],[529,472],[516,486],[498,487],[482,496],[463,496],[457,479],[453,461],[420,444],[383,425],[348,420],[323,410],[302,392],[294,377],[260,393],[222,422],[191,451],[150,485],[110,512],[0,590]];
const rightMask = [[675,388],[712,373],[755,359],[792,355],[833,357],[869,345],[908,330],[946,314],[1008,304],[1036,290],[1099,280],[1164,266],[1230,253],[1309,236],[1400,202],[1400,439],[1300,431],[1200,433],[1131,422],[1097,420],[1066,440],[1030,463],[1002,478],[969,487],[959,512],[952,551],[942,566],[924,563],[914,548],[911,519],[912,498],[899,510],[884,537],[879,561],[870,574],[854,575],[849,563],[842,575],[827,576],[820,558],[817,532],[818,504],[824,483],[812,486],[798,476],[795,461],[815,445],[841,429],[856,417],[853,410],[841,407],[831,395],[808,400],[782,397],[766,402],[733,407],[705,414],[687,411],[676,404]];
function inside(x, y, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
}
function render(mask) {
  const layers = Array.from({ length: 5 }, () => []);
  for (let row = 0; row < rowCount; row++) {
    const lines = layers.map(() => Array(columns).fill(' '));
    for (let column = 0; column < columns; column++) {
      const sx = Math.round((column * width / columns - 28) / (6 / 7));
      const sy = Math.round(row * height / rowCount / (6 / 7) + 130);
      if (sx < 0 || sx >= info.width || sy < 0 || sy >= info.height || !inside(sx, sy, mask)) continue;
      const at = (sy * info.width + sx) * info.channels;
      const [r, g, b] = data.subarray(at, at + 3);
      if (r - g < 7 || g - b < 5) continue;
      const luminance = (r * .2126 + g * .7152 + b * .0722) / 255;
      const light = Math.max(.06, Math.min(.99, (luminance - .15) / .68));
      const seed = (column * 37 + row * 19 + column * row * 7) % 997;
      const palette = light < .25 ? '.:>x' : light < .5 ? '+>10X' : '01XS$';
      const blue = seed % 71 === 0 && light > .3;
      const block = seed % 127 === 0;
      lines[blue ? 4 : Math.floor(light * 4)][column] = block ? '\u25a0' : palette[seed % palette.length];
    }
    lines.forEach((line, index) => {
      const value = line.join('').trimEnd();
      const glyphs = value.trimStart();
      if (glyphs) layers[index].push([row, value.length - glyphs.length, glyphs]);
    });
  }
  return layers;
}
const result = { columns, rowCount, width, height, left: render(leftMask), right: render(rightMask) };
writeFileSync(new URL('../src/components/ascii-hand-field.json', import.meta.url), JSON.stringify(result) + '\n');
console.log('Generated shaded ASCII hand fields from the pinned public-domain source.');
