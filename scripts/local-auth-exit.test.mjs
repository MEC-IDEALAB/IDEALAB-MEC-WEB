import test from 'node:test';
import assert from 'node:assert/strict';
import { exitLocalAuthSession } from '../src/lib/local-auth-exit.ts';
test('successful auth completion waits for local cookie cleanup after SDK exit',async()=>{
  const calls=[];let release;const pending=new Promise(resolve=>{release=resolve;});let completed=false;
  const result=exitLocalAuthSession(async()=>{calls.push('sdk');},async()=>{calls.push('cookies');await pending;}).then(outcome=>{assert.equal(outcome,'cleared');completed=true;});
  await Promise.resolve();await Promise.resolve();assert.deepEqual(calls,['sdk','cookies']);assert.equal(completed,false);
  release();await result;assert.equal(completed,true);
});
test('SDK failure after successful confirmation does not masquerade as expired confirmation',async()=>{
  const calls=[];
  assert.equal(await exitLocalAuthSession(async()=>{calls.push('sdk');throw Error('test-only SDK failure');},async()=>{calls.push('cookies');}),'cleared');
  assert.deepEqual(calls,['sdk','cookies']);
});
test('returned SDK errors still require cookie removal and cleanup failure never completes',async()=>{
  let cleared=0;await exitLocalAuthSession(async()=>({error:new Error('test SDK result')}),async()=>{cleared++;});assert.equal(cleared,1);
  for(const throws of [false,true]) {
    const cleanupError=new Error('test-only cookie failure');
    assert.equal(await exitLocalAuthSession(async()=>{if(throws)throw Error('SDK');},async()=>{throw cleanupError;}),'cleanup-required');
  }
});
