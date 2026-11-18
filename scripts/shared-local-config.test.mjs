import test from 'node:test';
import assert from 'node:assert/strict';
import { backendConfig, validationFeatureEnabled } from '../src/lib/config.ts';
const names = ['ENABLE_MEMBER_PLATFORM','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','ACCOUNT_ENVIRONMENT','NODE_ENV','VERCEL','VERCEL_ENV','RENDER','ENABLE_SHARED_ACCOUNT_CONTRACT_V1','ENABLE_LAB_OPENING_VALIDATION','ENABLE_OWN_VISITS_VALIDATION'];
const values = { ENABLE_MEMBER_PLATFORM:'true', NEXT_PUBLIC_SUPABASE_URL:'https://huftzhfqnnslvnfzvbex.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture', ACCOUNT_ENVIRONMENT:'shared-local', NODE_ENV:'development', ENABLE_SHARED_ACCOUNT_CONTRACT_V1:'true' };
function check(changes, expected) {
  const previous = Object.fromEntries(names.map(name => [name,process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    for (const [name,value] of Object.entries({...values,...changes})) if(value !== undefined) process.env[name]=value;
    assert.equal(backendConfig() !== null,expected);
    assert.equal(validationFeatureEnabled('labOpening'),false);
    assert.equal(validationFeatureEnabled('ownVisits'),false);
  } finally { for(const [name,value] of Object.entries(previous)) if(value === undefined) delete process.env[name]; else process.env[name]=value; }
}
test('shared local cutover requires explicit contract gate and exact Grow target',()=>{
  check({},true);
  for(const changes of [{ENABLE_SHARED_ACCOUNT_CONTRACT_V1:'false'},{ENABLE_SHARED_ACCOUNT_CONTRACT_V1:undefined},{ENABLE_MEMBER_PLATFORM:'false'},{NEXT_PUBLIC_SUPABASE_URL:'https://gvvqlfachzbufstzoiwi.supabase.co'},{NEXT_PUBLIC_SUPABASE_URL:'https://huftzhfqnnslvnfzvbex.supabase.co/other'},{NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_fixture'}]) check(changes,false);
});
test('shared local never enables hosted access or isolated operational features',()=>{
  for(const changes of [{NODE_ENV:'production'},{VERCEL:'1'},{VERCEL_ENV:'preview'},{VERCEL_ENV:'production'},{RENDER:'true'},{ACCOUNT_ENVIRONMENT:'production'}]) check(changes,false);
  check({ENABLE_LAB_OPENING_VALIDATION:'true',ENABLE_OWN_VISITS_VALIDATION:'true'},true);
});
