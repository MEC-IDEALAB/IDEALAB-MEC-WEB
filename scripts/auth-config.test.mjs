import test from 'node:test';
import assert from 'node:assert/strict';
import { googleAuthConfig } from '../src/lib/auth-config.ts';
const names=['ENABLE_MEMBER_PLATFORM','ENABLE_GOOGLE_SIGN_IN','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','AUTH_SITE_URL'];
const fixture={ENABLE_MEMBER_PLATFORM:'true',ENABLE_GOOGLE_SIGN_IN:'true',NEXT_PUBLIC_SUPABASE_URL:'https://config-fixture.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',AUTH_SITE_URL:'https://website-fixture.invalid'};
function check(values, expected){const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));try{for(const n of names){if(values[n]===undefined)delete process.env[n];else process.env[n]=values[n]}assert.deepEqual(googleAuthConfig(),expected)}finally{for(const n of names){if(previous[n]===undefined)delete process.env[n];else process.env[n]=previous[n]}}}
test('Google activation requires both explicit gates',()=>{check({...fixture,ENABLE_GOOGLE_SIGN_IN:'false'},null);check({...fixture,ENABLE_MEMBER_PLATFORM:'false'},null)});
test('callback is a fixed path on the configured canonical origin',()=>check(fixture,{callback:'https://website-fixture.invalid/auth/callback'}));
test('unsafe canonical origins are rejected',()=>{for(const origin of ['http://website-fixture.invalid','https://user:password@website-fixture.invalid','https://website-fixture.invalid/other','https://website-fixture.invalid?next=evil','javascript:alert(1)'])check({...fixture,AUTH_SITE_URL:origin},null)});
test('loopback HTTP supports local OAuth validation',()=>check({...fixture,AUTH_SITE_URL:'http://127.0.0.1:3015'},{callback:'http://127.0.0.1:3015/auth/callback'}));
