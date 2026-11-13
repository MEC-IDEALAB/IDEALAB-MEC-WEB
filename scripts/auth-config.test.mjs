import test from 'node:test';
import assert from 'node:assert/strict';
import { googleAuthConfig, passwordRecoveryConfig, signupAuthConfig } from '../src/lib/auth-config.ts';
const names=['ENABLE_MEMBER_PLATFORM','ENABLE_MEMBER_PLATFORM_PRODUCTION','ENABLE_MEMBER_PLATFORM_TEST','ACCOUNT_ENVIRONMENT','ENABLE_GOOGLE_SIGN_IN','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','AUTH_SITE_URL','NODE_ENV'];
names.push('ENABLE_RECOVERY_VALIDATION', 'VERCEL', 'VERCEL_ENV', 'RENDER', 'ENABLE_SHARED_ACCOUNT_CONTRACT_V1');
const fixture={ENABLE_MEMBER_PLATFORM:'true',ENABLE_MEMBER_PLATFORM_PRODUCTION:'false',ENABLE_MEMBER_PLATFORM_TEST:'false',ACCOUNT_ENVIRONMENT:'validation',ENABLE_GOOGLE_SIGN_IN:'true',NEXT_PUBLIC_SUPABASE_URL:'https://gvvqlfachzbufstzoiwi.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',AUTH_SITE_URL:'https://website-fixture.invalid',NODE_ENV:'development'};
function check(values, expected){const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));try{for(const n of names){if(values[n]===undefined)delete process.env[n];else process.env[n]=values[n]}assert.deepEqual(googleAuthConfig(),expected)}finally{for(const n of names){if(previous[n]===undefined)delete process.env[n];else process.env[n]=previous[n]}}}
test('Google activation requires both explicit gates',()=>{check({...fixture,ENABLE_GOOGLE_SIGN_IN:'false'},null);check({...fixture,ENABLE_MEMBER_PLATFORM:'false'},null)});
test('callback is a fixed path on the configured canonical origin',()=>check(fixture,{callback:'https://website-fixture.invalid/auth/callback'}));
test('unsafe canonical origins are rejected',()=>{for(const origin of ['http://website-fixture.invalid','https://user:password@website-fixture.invalid','https://website-fixture.invalid/other','https://website-fixture.invalid?next=evil','javascript:alert(1)'])check({...fixture,AUTH_SITE_URL:origin},null)});
test('loopback HTTP supports local OAuth validation',()=>check({...fixture,AUTH_SITE_URL:'http://127.0.0.1:3015'},{callback:'http://127.0.0.1:3015/auth/callback'}));
test('password recovery remains disabled by default',()=>{const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));try{for(const n of names){if(fixture[n]===undefined)delete process.env[n];else process.env[n]=fixture[n];}assert.equal(passwordRecoveryConfig(),null)}finally{for(const n of names){if(previous[n]===undefined)delete process.env[n];else process.env[n]=previous[n]}}});
test('password recovery requires the member gate and rejects unsafe origins',()=>{const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));try{for(const n of names){if(fixture[n]===undefined)delete process.env[n];else process.env[n]=fixture[n];}process.env.ENABLE_MEMBER_PLATFORM='false';assert.equal(passwordRecoveryConfig(),null);process.env.ENABLE_MEMBER_PLATFORM='true';process.env.AUTH_SITE_URL='https://website-fixture.invalid/path';assert.equal(passwordRecoveryConfig(),null)}finally{for(const n of names){if(previous[n]===undefined)delete process.env[n];else process.env[n]=previous[n]}}});

test('email signup callback works with Google disabled and refuses unsafe origins',()=>{const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));try{for(const n of names){if(fixture[n]===undefined)delete process.env[n];else process.env[n]=fixture[n];}process.env.ENABLE_GOOGLE_SIGN_IN='false';assert.deepEqual(signupAuthConfig(),{callback:'https://website-fixture.invalid/auth/confirm'});process.env.AUTH_SITE_URL='https://website-fixture.invalid/path';assert.equal(signupAuthConfig(),null);process.env.AUTH_SITE_URL=fixture.AUTH_SITE_URL;process.env.ENABLE_MEMBER_PLATFORM='false';assert.equal(signupAuthConfig(),null);}finally{for(const n of names){if(previous[n]===undefined)delete process.env[n];else process.env[n]=previous[n]}}});

test('production login, Google and signup config remain unavailable despite the former production opt-in',()=>{const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));try{for(const n of names){if(fixture[n]===undefined)delete process.env[n];else process.env[n]=fixture[n];}process.env.ACCOUNT_ENVIRONMENT='production';process.env.ENABLE_MEMBER_PLATFORM='true';process.env.ENABLE_MEMBER_PLATFORM_PRODUCTION='true';process.env.NEXT_PUBLIC_SUPABASE_URL='https://huftzhfqnnslvnfzvbex.supabase.co';assert.equal(googleAuthConfig(),null);assert.equal(signupAuthConfig(),null);}finally{for(const n of names){if(previous[n]===undefined)delete process.env[n];else process.env[n]=previous[n]}}});

test('recovery testing requires explicit isolated development and loopback-only opt-in', () => {
  function recoveryCase(changes, expected) {
    const before = Object.fromEntries(names.map(name => [name, process.env[name]]));
    try {
      for (const name of names) delete process.env[name];
      Object.assign(process.env, fixture, { AUTH_SITE_URL: 'http://127.0.0.1:3016', ENABLE_RECOVERY_VALIDATION: 'true' }, changes);
      assert.deepEqual(passwordRecoveryConfig(), expected);
    } finally {
      for (const [name, value] of Object.entries(before)) {
        if (value === undefined) delete process.env[name]; else process.env[name] = value;
      }
    }
  }
  recoveryCase({}, { callback: 'http://127.0.0.1:3016/auth/recovery/callback' });
  for (const changes of [
    { ENABLE_RECOVERY_VALIDATION: 'false' }, { ENABLE_MEMBER_PLATFORM: 'false' },
    { NODE_ENV: 'production' }, { VERCEL: '1' }, { VERCEL_ENV: 'preview' }, { RENDER: 'true' },
    { ACCOUNT_ENVIRONMENT: 'production' },
    { ACCOUNT_ENVIRONMENT: 'shared-local', ENABLE_SHARED_ACCOUNT_CONTRACT_V1: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://huftzhfqnnslvnfzvbex.supabase.co' },
    { AUTH_SITE_URL: 'https://website-fixture.invalid' }, { AUTH_SITE_URL: 'http://outside.invalid' },
  ]) recoveryCase(changes, null);
});
