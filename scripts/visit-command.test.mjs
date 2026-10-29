import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVisitCommand, visitPurposeError, parseVisitCommandResult } from '../src/lib/visit-command.ts';
import { matchesFormAccount } from '../src/lib/form-account.ts';
const command = '11111111-1111-4111-8111-111111111111';
const visit = '22222222-2222-4222-8222-222222222222';
const form = (kind='in') => { const result=new FormData(); result.set('visit_action',kind); result.set('command_id',command); if(kind==='in') result.set('purpose','  Prototype testing  '); else result.set('visit_id',visit); return result; };
test('check-in sends only purpose and command, never actor, time or role', () => {
  const input=form(); input.set('user_id','forged'); input.set('checkin_time','yesterday'); input.set('role','core');
  assert.deepEqual(buildVisitCommand(input),{action:'in',payload:{p_purpose:'Prototype testing',p_command_id:command}});
});
test('rendered account is checked separately and never forwarded as visit authority', () => {
  const first='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const second='11111111-2222-4333-8444-555555555555';
  const input=form(); input.set('expected_account',first);
  assert.equal(matchesFormAccount(input,first),true);
  assert.equal(matchesFormAccount(input,second),false);
  assert.deepEqual(buildVisitCommand(input),{action:'in',payload:{p_purpose:'Prototype testing',p_command_id:command}});
  input.append('expected_account',first);
  assert.equal(matchesFormAccount(input,first),false);
});
test('checkout binds to an exact visit and cannot include a check-in purpose', () => {
  const input=form('out'); assert.deepEqual(buildVisitCommand(input),{action:'out',payload:{p_visit_id:visit,p_command_id:command}});
  input.set('purpose','changed'); assert.equal(buildVisitCommand(input),null);
  const incoming=form(); incoming.set('visit_id',visit); assert.equal(buildVisitCommand(incoming),null);
});
test('duplicate, missing, file and invalid ID inputs fail closed', () => {
  for(const key of ['visit_action','command_id','purpose']) { const input=form(); input.append(key,'duplicate'); assert.equal(buildVisitCommand(input),null); }
  const input=form(); input.set('purpose',new Blob(['text']),'upload.txt'); assert.equal(buildVisitCommand(input),null);
  input.set('purpose','ok'); input.set('command_id','bad'); assert.equal(buildVisitCommand(input),null);
  const out=form('out'); out.delete('visit_id'); assert.equal(buildVisitCommand(out),null);
});
test('purpose bounds handle whitespace, Unicode and control characters', () => {
  for(const value of ['', '\n \t', 'x'.repeat(1001), 'a\0b', 'a\u0085b']) assert.ok(visitPurposeError(value));
  assert.equal(visitPurposeError('🛠'.repeat(1000)),null);
  assert.equal(visitPurposeError('Testing\nmaterials\tand code'),null);
});
test('recorded results do not infer whether a historical visit is still active', () => {
  for(const status of ['checked_in','already_in','checked_out','already_out']) assert.equal(parseVisitCommandResult({status,visit_id:visit}).status,'saved');
  assert.equal(parseVisitCommandResult({status:'closed'}).status,'closed');
  assert.equal(parseVisitCommandResult({status:'invalid'}).status,'invalid');
  for(const value of [null,{}, {status:'checked_in'}, {status:'checked_out',visit_id:'bad'}, {status:'checked_in',visit_id:visit,email:'private'}, {status:'denied'}, {status:'conflict'}]) assert.equal(parseVisitCommandResult(value).status,'error');
});
test('response accessors cannot execute or claim success', () => {
  assert.equal(parseVisitCommandResult({ get status(){throw new Error('getter');},visit_id:visit }).status,'error');
});
