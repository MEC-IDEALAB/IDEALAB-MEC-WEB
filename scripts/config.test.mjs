import test from 'node:test';
import assert from 'node:assert/strict';
import { backendConfig } from '../src/lib/config.ts';

// Configuration fixtures only: no backend requests or substituted auth service.
const names = ['ENABLE_MEMBER_PLATFORM', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
function withConfig(values, check) {
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) { if (values[name] === undefined) delete process.env[name]; else process.env[name] = values[name]; }
    check();
  } finally {
    for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
  }
}
const fixture = { ENABLE_MEMBER_PLATFORM: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://configuration-fixture.invalid', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_configuration_fixture' };
test('member activation remains off with otherwise valid public configuration', () => withConfig({ ...fixture, ENABLE_MEMBER_PLATFORM: 'false' }, () => assert.equal(backendConfig(), null)));
test('member activation requires exact explicit enablement', () => withConfig({ ...fixture, ENABLE_MEMBER_PLATFORM: 'TRUE' }, () => assert.equal(backendConfig(), null)));
test('explicit activation only returns the public configuration, not auth success', () => withConfig(fixture, () => assert.deepEqual(backendConfig(), { url: fixture.NEXT_PUBLIC_SUPABASE_URL, key: fixture.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY })));
test('privileged secret keys are rejected', () => withConfig({ ...fixture, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_configuration_fixture' }, () => assert.equal(backendConfig(), null)));
test('legacy service-role JWT shape is rejected', () => {
  const key = `fixture.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64')}.fixture`;
  withConfig({ ...fixture, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }, () => assert.equal(backendConfig(), null));
});
test('non-HTTPS backend configuration is rejected', () => withConfig({ ...fixture, NEXT_PUBLIC_SUPABASE_URL: 'http://configuration-fixture.invalid' }, () => assert.equal(backendConfig(), null)));
