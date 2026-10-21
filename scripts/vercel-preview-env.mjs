import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';

const requiredPreviewFlags = ['ENABLE_MEMBER_PLATFORM', 'ENABLE_DESIGN_PREVIEW'];

export function hasDisabledPreviewFlags(contents) {
  let values;

  try {
    values = parseEnv(contents);
  } catch {
    return false;
  }

  return requiredPreviewFlags.every((name) => values[name] === 'false');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const envPath = process.argv[2] ?? '.vercel/.env.preview.local';
  let contents;

  try {
    contents = readFileSync(envPath, 'utf8');
  } catch {
    console.error('Vercel Preview environment is unavailable; configure the project and retry.');
    process.exitCode = 1;
  }

  if (contents !== undefined) {
    if (!hasDisabledPreviewFlags(contents)) {
      console.error('Vercel Preview must explicitly set ENABLE_MEMBER_PLATFORM=false and ENABLE_DESIGN_PREVIEW=false.');
      process.exitCode = 1;
    } else {
      console.log('Verified: member access and design preview are disabled in the Vercel Preview environment.');
    }
  }
}
