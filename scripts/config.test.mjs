import test from 'node:test';
import assert from 'node:assert/strict';
import { backendConfig, validationFeatureEnabled } from '../src/lib/config.ts';

// Configuration fixtures only: no backend requests or substituted auth service.
const names = ['ENABLE_MEMBER_PLATFORM', 'ENABLE_MEMBER_PLATFORM_PRODUCTION', 'ENABLE_MEMBER_PLATFORM_TEST', 'ENABLE_LAB_OPENING_VALIDATION', 'ENABLE_OWN_VISITS_VALIDATION', 'ACCOUNT_ENVIRONMENT', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NODE_ENV', 'VERCEL', 'VERCEL_ENV', 'RENDER'];
function withConfig(values, check) {
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) { if (values[name] === undefined) delete process.env[name]; else process.env[name] = values[name]; }
    check();
  } finally {
    for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
  }
}
const fixture = { ENABLE_MEMBER_PLATFORM: 'true', ENABLE_MEMBER_PLATFORM_TEST: 'true', ACCOUNT_ENVIRONMENT: 'test', NEXT_PUBLIC_SUPABASE_URL: 'https://configuration-fixture.invalid', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_configuration_fixture' };
test('member activation remains off with otherwise valid public configuration', () => withConfig({ ...fixture, ENABLE_MEMBER_PLATFORM: 'false' }, () => assert.equal(backendConfig(), null)));
test('member activation requires exact explicit enablement', () => withConfig({ ...fixture, ENABLE_MEMBER_PLATFORM: 'TRUE' }, () => assert.equal(backendConfig(), null)));
test('test mode requires a separate gate and a reserved non-routable host', () => {
  withConfig({ ...fixture, ENABLE_MEMBER_PLATFORM_TEST: 'false' }, () => assert.equal(backendConfig(), null));
  withConfig({ ...fixture, NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co' }, () => assert.equal(backendConfig(), null));
  withConfig(fixture, () => assert.deepEqual(backendConfig(), { url: fixture.NEXT_PUBLIC_SUPABASE_URL, key: fixture.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }));
});
test('the approved validation environment can only reach its fixed Supabase project', () => {
  const validation = { ...fixture, ACCOUNT_ENVIRONMENT: 'validation', ENABLE_MEMBER_PLATFORM_TEST: 'false', NODE_ENV: 'development', NEXT_PUBLIC_SUPABASE_URL: 'https://gvvqlfachzbufstzoiwi.supabase.co' };
  withConfig(validation, () => assert.deepEqual(backendConfig(), { url: validation.NEXT_PUBLIC_SUPABASE_URL, key: validation.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }));
  withConfig({ ...validation, NEXT_PUBLIC_SUPABASE_URL: 'https://different-project.supabase.co' }, () => assert.equal(backendConfig(), null));
});
test('validation project is unavailable to production builds and hosted deployments', () => {
  const validation = { ...fixture, ACCOUNT_ENVIRONMENT: 'validation', ENABLE_MEMBER_PLATFORM_TEST: 'false', NODE_ENV: 'development', NEXT_PUBLIC_SUPABASE_URL: 'https://gvvqlfachzbufstzoiwi.supabase.co' };
  for (const runtime of [
    { NODE_ENV: 'production' },
    { NODE_ENV: 'test' },
    { NODE_ENV: undefined },
    { NODE_ENV: 'development', VERCEL: '1', VERCEL_ENV: 'production' },
    { NODE_ENV: 'development', VERCEL: '1', VERCEL_ENV: 'preview' },
    { NODE_ENV: 'development', RENDER: 'true' },
  ]) {
    withConfig({ ...validation, ...runtime }, () => assert.equal(backendConfig(), null));
  }
});
test('lab opening and own visits require separate flags and the pinned validation backend', () => {
  const validation = { ...fixture, ACCOUNT_ENVIRONMENT: 'validation', ENABLE_MEMBER_PLATFORM_TEST: 'false', NODE_ENV: 'development', NEXT_PUBLIC_SUPABASE_URL: 'https://gvvqlfachzbufstzoiwi.supabase.co' };
  withConfig(validation, () => {
    assert.equal(validationFeatureEnabled('labOpening'), false);
    assert.equal(validationFeatureEnabled('ownVisits'), false);
  });
  withConfig({ ...validation, ENABLE_LAB_OPENING_VALIDATION: 'true' }, () => {
    assert.equal(validationFeatureEnabled('labOpening'), true);
    assert.equal(validationFeatureEnabled('ownVisits'), false);
  });
  withConfig({ ...validation, ENABLE_OWN_VISITS_VALIDATION: 'true' }, () => {
    assert.equal(validationFeatureEnabled('labOpening'), false);
    assert.equal(validationFeatureEnabled('ownVisits'), true);
  });
  withConfig({ ...validation, ENABLE_LAB_OPENING_VALIDATION: 'true', ACCOUNT_ENVIRONMENT: 'production', ENABLE_MEMBER_PLATFORM_PRODUCTION: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://huftzhfqnnslvnfzvbex.supabase.co' }, () => {
    assert.equal(validationFeatureEnabled('labOpening'), false);
  });
  withConfig({ ...validation, ENABLE_OWN_VISITS_VALIDATION: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://different-project.supabase.co' }, () => {
    assert.equal(validationFeatureEnabled('ownVisits'), false);
  });
});
test('production account integration stays blocked even with the old opt-in and exact Grow project', () => {
  const production = { ...fixture, ACCOUNT_ENVIRONMENT: 'production', ENABLE_MEMBER_PLATFORM_TEST: 'false', NEXT_PUBLIC_SUPABASE_URL: 'https://huftzhfqnnslvnfzvbex.supabase.co' };
  withConfig(production, () => assert.equal(backendConfig(), null));
  withConfig({ ...production, ENABLE_MEMBER_PLATFORM: 'true', ENABLE_MEMBER_PLATFORM_PRODUCTION: 'true' }, () => assert.equal(backendConfig(), null));
  withConfig({ ...production, ENABLE_MEMBER_PLATFORM_PRODUCTION: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://grow-fixture.supabase.co' }, () => assert.equal(backendConfig(), null));
  withConfig({ ...production, ENABLE_MEMBER_PLATFORM_PRODUCTION: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://gvvqlfachzbufstzoiwi.supabase.co' }, () => assert.equal(backendConfig(), null));
  withConfig({ ...production, ENABLE_MEMBER_PLATFORM_PRODUCTION: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://configuration-fixture.invalid' }, () => assert.equal(backendConfig(), null));
});
test('URLs with credentials, paths, query or fragment are rejected', () => {
  for (const url of ['https://user:pass@configuration-fixture.invalid', 'https://configuration-fixture.invalid:8443', 'https://configuration-fixture.invalid/path', 'https://configuration-fixture.invalid?x=1', 'https://configuration-fixture.invalid#fragment']) {
    withConfig({ ...fixture, NEXT_PUBLIC_SUPABASE_URL: url }, () => assert.equal(backendConfig(), null));
  }
});
test('privileged secret keys are rejected', () => withConfig({ ...fixture, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_configuration_fixture' }, () => assert.equal(backendConfig(), null)));
test('legacy service-role JWT shape is rejected', () => {
  const key = `fixture.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64')}.fixture`;
  withConfig({ ...fixture, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }, () => assert.equal(backendConfig(), null));
});
test('non-HTTPS backend configuration is rejected', () => withConfig({ ...fixture, NEXT_PUBLIC_SUPABASE_URL: 'http://configuration-fixture.invalid' }, () => assert.equal(backendConfig(), null)));
