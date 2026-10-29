import test from 'node:test';
import assert from 'node:assert/strict';
import { intake,preferredIst,parseRequest,parseRequests,requestTime } from '../src/features/requests/work-request-contract.ts';
import { draftIntake,buildIntakeCommand,parseIntakeResult } from '../src/features/requests/work-request-command.ts';
import { saveDraft,readSavedDraft } from '../src/features/requests/draft-storage.ts';
import { matchesFormAccount } from '../src/lib/form-account.ts';
const id='11111111-1111-4111-8111-111111111111',command='22222222-2222-4222-8222-222222222222',time='2026-10-22T10:00:00Z';
const value=()=>({kind:'machine',service_id:'cnc',title:'Fixture request',description:'A clearly marked test request only.',technical_details:'',preferred_at:null,references:[]});
const summary=()=>({id,kind:'machine',service_id:'cnc',title:'Fixture request',status:'submitted',revision:'1',created_at:time,updated_at:time,can_cancel:true});
const form=(action='submit')=>{const f=new FormData();f.set('request_action',action);f.set('command_id',command);if(action==='submit')f.set('intake',JSON.stringify(value()));else{f.set('request_id',id);f.set('expected_revision','1');}return f;};
test('IST input is independent of host timezone and rejects invalid calendar/time values',()=>{
  assert.equal(preferredIst('2026-10-22T09:00'),'2026-10-22T03:30:00.000Z');
  assert.equal(preferredIst('2026-01-01T00:00'),'2025-12-31T18:30:00.000Z');assert.equal(preferredIst(''),null);
  for(const v of ['2026-02-30T09:00','2026-10-22T25:00','tomorrow','2026-10-22T09:00Z'])assert.equal(preferredIst(v),undefined);
  assert.equal(requestTime('2026-02-30T09:00:00Z'),false);
});
test('required service is kind scoped and technical details remain optional',()=>{
  assert.ok(intake(value()));assert.ok(intake({...value(),kind:'operations',service_id:'ics'}));
  for(const change of [{service_id:'sample-3d'},{kind:'operations'},{service_id:''},{title:'abc'},{description:'short'},{title:'a\nbcd'},{description:'x\0'+'x'.repeat(20)},{technical_details:'x'.repeat(2001)},{owner_id:id}])assert.equal(intake({...value(),...change}),null);
});
test('links normalize before persistence, reject credentials and malformed ports',()=>{
  const vectors=[['https://EXAMPLE.com:443/path','https://example.com/path'],['http://@example.com','http://example.com/'],['http://[::1]:8080/','http://[::1]:8080/'],['https://127.0.0.1:65535/','https://127.0.0.1:65535/'],['https://пример.рф/путь','https://xn--e1afmkfd.xn--p1ai/%D0%BF%D1%83%D1%82%D1%8C']];
  for(const [input,expected] of vectors)assert.deepEqual(intake({...value(),references:[input]}).references,[expected]);
  for(const link of ['https://example.com:99999/','javascript:alert(1)','https://u:p@example.com/','https://example.com/a b','https://example.com/\n','https://xn--/','https://xn--.example.com/'])assert.equal(intake({...value(),references:[link]}),null);
});
test('maximum multibyte fields are measured as Unicode characters without a SQL-only byte cap',()=>{
  assert.ok(intake({...value(),title:'🛠'.repeat(120),description:'🛠'.repeat(5000),technical_details:'🛠'.repeat(2000)}));
  assert.equal(intake({...value(),description:'🛠'.repeat(5001)}),null);
});
test('submission forwards normalized intake and UUID, never client authority',()=>{
  const f=form();f.set('owner_id','forged');f.set('status','approved');
  assert.deepEqual(buildIntakeCommand(f),{action:'submit',args:{p_intake:value(),p_command_id:command}});
  for(const key of ['request_action','command_id','intake']){const duplicate=form();duplicate.append(key,'duplicate');assert.equal(buildIntakeCommand(duplicate),null);}
  const bad=form();bad.set('intake',new Blob(['{}']),'file.json');assert.equal(buildIntakeCommand(bad),null);
});
test('cancellation binds exact request revision and successful response to action',()=>{
  assert.ok(buildIntakeCommand(form('cancel')));
  for(const key of ['request_id','expected_revision']){const f=form('cancel');f.set(key,'');assert.equal(buildIntakeCommand(f),null);}
  assert.equal(parseIntakeResult({status:'submitted',request_id:id},'submit').status,'saved');
  assert.equal(parseIntakeResult({status:'cancelled',request_id:id},'cancel').status,'saved');
  for(const result of [null,{}, {status:'cancelled',request_id:id},{status:'submitted',request_id:'bad'},{status:'submitted',request_id:id,email:'private'}, {get status(){throw Error('getter');}}])assert.equal(parseIntakeResult(result,'submit').status,'error');
});
test('cancel account consistency stays out of the database command',()=>{
  const account='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const other='11111111-2222-4333-8444-555555555555';
  const f=form('cancel');f.set('expected_account',account);
  assert.equal(matchesFormAccount(f,account),true);assert.equal(matchesFormAccount(f,other),false);
  assert.deepEqual(buildIntakeCommand(f),{action:'cancel',args:{p_id:id,p_expected_revision:'1',p_command_id:command}});
  f.append('expected_account',account);assert.equal(matchesFormAccount(f,account),false);
});
test('saved technical details survive draft restore and become optional intake text',()=>{
  const values=new Map();const store={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const draft={kind:'operations',serviceId:'ics',title:'Fixture request',details:'A clearly marked test request only.',preferredTime:'',references:[],technicalDetails:'Two ICs for a prototype, if available.'};
  assert.equal(saveDraft('fixture',draft,store),'saved');assert.equal(readSavedDraft('fixture',store).draft.technicalDetails,draft.technicalDetails);
  assert.equal(draftIntake(draft).technical_details,draft.technicalDetails);
});
test('own reads reject private authority extras, duplicates, broken history and unsafe links',()=>{
  assert.equal(parseRequests({items:[summary()],cursor:null}).status,'ready');
  assert.equal(parseRequests({items:[summary(),summary()],cursor:null}).status,'unavailable');
  const detail={...summary(),description:value().description,technical_details:'',preferred_at:null,references:[],history:[{status:'submitted',recorded_at:time}]};
  assert.equal(parseRequest(detail,id).status,'ready');
  for(const change of [{owner_id:id},{history:[]},{history:[{status:'cancelled',recorded_at:time}]},{references:['javascript:alert(1)']},{status:'cancelled',can_cancel:true}])assert.equal(parseRequest({...detail,...change},id).status,'unavailable');
  assert.equal(parseRequest(detail,command).status,'unavailable');assert.deepEqual(parseRequest(null,id),{status:'ready',data:null});
  assert.equal(parseRequest({...detail,references:['https://xn--abc/']},id).status,'ready','an unopenable bounded HTTP reference from another client cannot hide the whole saved request');
});
