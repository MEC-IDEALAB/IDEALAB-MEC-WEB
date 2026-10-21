import { spawnSync } from 'node:child_process';

// Next.js compiles NEXT_PUBLIC_ variables into the production bundle. The
// browser acceptance suite needs a configured recovery form, but must never
// receive or contact a real Supabase project. This reserved .invalid origin
// and dummy publishable key enable that UI fixture; the member gate remains off
// in the ordinary acceptance server.
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: 'https://configuration-fixture.invalid',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_configuration_fixture',
    ENABLE_MEMBER_PLATFORM: 'false',
    ENABLE_GOOGLE_SIGN_IN: 'false',
  },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
