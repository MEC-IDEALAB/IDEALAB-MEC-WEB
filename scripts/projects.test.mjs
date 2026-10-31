import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectCommand, confirmedProjectCreateReceipt, parseProjectAction } from '../src/features/projects/project-command.ts';
import { parseProjectList, parseProjectDetail, parseOwnProjectRequests } from '../src/features/projects/project-contract.ts';
import { matchesFormAccount } from '../src/lib/form-account.ts';
import { projectCoreEnabled } from '../src/features/projects/project-config.ts';
import { createProjectWithIntent,parseProjectCreateIntent,resolveProjectCreateWithIntent } from '../src/features/projects/project-create-intent.ts';
import { projectCreateRecoveryCopyPlan, projectCreateSessionKey } from '../src/features/projects/project-create-session.ts';
const id='11111111-1111-4111-8111-111111111111', command='22222222-2222-4222-8222-222222222222', time='2026-10-22T10:00:00Z';
const actor='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',payload={kind:'create',title:'Test project',description:'A bounded idea.',visibility:'private'};
const form=(values={kind:'create',title:' Test ',description:' Description ',visibility:'private'})=>{const f=new FormData();f.set('command_id',command);for(const [key,value] of Object.entries(values))f.set(key,value);return f;};
const card=()=>({id,title:'Test',description:'Description',status:'ideation',visibility:'public',created_at:time,updated_at:time,revision:'1',relation:'none',member_count:1});
test('project core is explicitly limited to the pinned validation backend',()=>{
  const keys=['ACCOUNT_ENVIRONMENT','ENABLE_PROJECT_CORE','ENABLE_MEMBER_PLATFORM','ENABLE_MEMBER_PLATFORM_PRODUCTION','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NODE_ENV'];
  const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try {
    Object.assign(process.env,{ACCOUNT_ENVIRONMENT:'validation',ENABLE_PROJECT_CORE:'true',ENABLE_MEMBER_PLATFORM:'true',NEXT_PUBLIC_SUPABASE_URL:'https://gvvqlfachzbufstzoiwi.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',NODE_ENV:'development'});
    assert.equal(projectCoreEnabled(),true);
    process.env.ENABLE_PROJECT_CORE='false';assert.equal(projectCoreEnabled(),false);
    process.env.ENABLE_PROJECT_CORE='true';process.env.NEXT_PUBLIC_SUPABASE_URL='https://huftzhfqnnslvnfzvbex.supabase.co';assert.equal(projectCoreEnabled(),false);
    process.env.ACCOUNT_ENVIRONMENT='production';process.env.ENABLE_MEMBER_PLATFORM_PRODUCTION='true';assert.equal(projectCoreEnabled(),false);
    process.env.ACCOUNT_ENVIRONMENT='test';assert.equal(projectCoreEnabled(),false);
  } finally {for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
});
test('project create UI session is isolated by account and preview scope',()=>{
  assert.equal(projectCreateSessionKey(actor,'validation'),JSON.stringify(['validation',actor]));
  assert.notEqual(projectCreateSessionKey(actor,'validation'),projectCreateSessionKey(id,'validation'));
  assert.notEqual(projectCreateSessionKey(actor,'validation'),projectCreateSessionKey(actor,'preview'));
});
test('recovery copy keeps in-memory details visible and avoids duplicating identical saved copy',()=>{
  const same=projectCreateRecoveryCopyPlan(payload,{title:` ${payload.title} `,description:payload.description,visibility:payload.visibility});
  assert.deepEqual(same,{showSavedCopy:false,showDraft:true,savedCopyMatchesDraft:true});
  const distinct=projectCreateRecoveryCopyPlan(payload,{title:'Different idea',description:'Unsent details',visibility:'public'});
  assert.deepEqual(distinct,{showSavedCopy:true,showDraft:true,savedCopyMatchesDraft:false});
  assert.deepEqual(projectCreateRecoveryCopyPlan(payload,{title:'',description:'',visibility:'private'}),
    {showSavedCopy:true,showDraft:false,savedCopyMatchesDraft:false});
});
test('only exact confirmed project creation receipts resolve',()=>{
  assert.equal(confirmedProjectCreateReceipt({status:'saved',project_id:id}),id);
  for(const value of [null,[],{}, {status:'saved',project_id:'bad'}, {status:'denied',project_id:id}, {status:'saved',project_id:id,title:'private'}]) assert.equal(confirmedProjectCreateReceipt(value),null);
  assert.equal(confirmedProjectCreateReceipt({get status(){throw Error('unexpected');},project_id:id}),null);
});
test('project create intent accepts only clear or exact unresolved server state',()=>{
  assert.deepEqual(parseProjectCreateIntent({status:'clear',generation:'1'}),{status:'clear',generation:'1'});
  assert.deepEqual(parseProjectCreateIntent({status:'unresolved',command_id:command,payload,project_id:null,generation:'2'}),{status:'unresolved',commandId:command,payload,projectId:null,generation:'2'});
  assert.deepEqual(parseProjectCreateIntent({status:'unresolved',command_id:command,payload:null,project_id:id,generation:'3'}),{status:'unresolved',commandId:command,payload:null,projectId:id,generation:'3'});
  for(const value of [null,{}, {status:'clear',generation:0},{status:'clear',generation:'0'},{status:'clear',generation:'9223372036854775808'},
    {status:'unresolved',command_id:'bad',payload,project_id:null,generation:'1'},
    {status:'unresolved',command_id:command,payload:{...payload,email:'private'},project_id:null,generation:'1'},
    {status:'unresolved',command_id:command,payload:{...payload,title:'  bad'},project_id:null,generation:'1'},
    {status:'unresolved',command_id:command,payload,project_id:'bad',generation:'1'},
    {status:'unresolved',command_id:command,payload,project_id:null,generation:1},
    {status:'unavailable',extra:'unexpected'}]) assert.deepEqual(parseProjectCreateIntent(value),{status:'unavailable'});
});
test('account-bound create uses the current actor and exact server generation then verifies receipt before acknowledge',async()=>{
  const calls=[];let reads=0;
  const rpc={
    readIntent:async()=>{reads++;return {status:'clear',generation:'7'};},
    mutate:async(commandValue,commandId,generation,expectedUserId)=>{calls.push(['mutate',commandValue,commandId,generation,expectedUserId]);return {status:'saved',project_id:id,revision:'1'};},
    readReceipt:async commandId=>{calls.push(['receipt',commandId]);return {status:'saved',project_id:id};},
    acknowledge:async commandId=>{calls.push(['ack',commandId]);return {status:'acknowledged',project_id:id};},
  };
  assert.deepEqual(await createProjectWithIntent(rpc,{expectedUserId:actor,commandId:command,generation:'7',payload}),{status:'saved',projectId:id});
  assert.equal(reads,1);assert.deepEqual(calls,[['mutate',payload,command,'7',actor],['receipt',command],['ack',command]]);
});
test('stale generation rejects before the database mutation',async()=>{
  let mutations=0;
  const rpc={readIntent:async()=>({status:'clear',generation:'8'}),mutate:async()=>{mutations++;},readReceipt:async()=>null,acknowledge:async()=>null};
  assert.equal((await createProjectWithIntent(rpc,{expectedUserId:actor,commandId:command,generation:'7',payload})).status,'error');
  assert.equal(mutations,0);
});
test('an unresolved account intent blocks a different command or changed payload',async()=>{
  let mutations=0;
  const rpc={readIntent:async()=>({status:'unresolved',command_id:command,payload,project_id:null,generation:'2'}),mutate:async()=>{mutations++;},readReceipt:async()=>null,acknowledge:async()=>null};
  const other=await createProjectWithIntent(rpc,{expectedUserId:actor,commandId:id,generation:'2',payload});
  assert.equal(other.status,'unresolved');assert.equal(other.intent.commandId,command);
  const changed=await createProjectWithIntent(rpc,{expectedUserId:actor,commandId:command,generation:'2',payload:{...payload,title:'Different'}});
  assert.equal(changed.status,'unresolved');assert.equal(mutations,0);
});
test('a matching unresolved create retries only its saved command, payload and generation',async()=>{
  let args;
  const rpc={
    readIntent:async()=>({status:'unresolved',command_id:command,payload,project_id:null,generation:'2'}),
    mutate:async(...values)=>{args=values;return {status:'saved',project_id:id,revision:'4'};},
    readReceipt:async()=>({status:'saved',project_id:id}),acknowledge:async()=>({status:'acknowledged',project_id:id}),
  };
  assert.deepEqual(await createProjectWithIntent(rpc,{expectedUserId:actor,commandId:command,generation:'2',payload}),{status:'saved',projectId:id});
  assert.deepEqual(args,[payload,command,'2',actor]);
});
test('a lost mutation response recovers the matching unresolved server intent without claiming failure',async()=>{
  let reads=0,acks=0;
  const rpc={
    readIntent:async()=>++reads===1?{status:'clear',generation:'1'}:{status:'unresolved',command_id:command,payload,project_id:null,generation:'1'},
    mutate:async()=>{throw Error('network lost');},readReceipt:async()=>null,acknowledge:async()=>{acks++;},
  };
  const result=await createProjectWithIntent(rpc,{expectedUserId:actor,commandId:command,generation:'1',payload});
  assert.equal(result.status,'unresolved');assert.equal(result.intent.commandId,command);assert.equal(acks,0);
});
test('receipt mismatch never acknowledges or reports a saved project',async()=>{
  let acks=0;
  const rpc={readIntent:async()=>({status:'clear',generation:'1'}),mutate:async()=>({status:'saved',project_id:id,revision:'1'}),
    readReceipt:async()=>({status:'saved',project_id:command}),acknowledge:async()=>{acks++;}};
  assert.equal((await createProjectWithIntent(rpc,{expectedUserId:actor,commandId:command,generation:'1',payload})).status,'error');
  assert.equal(acks,0);
});
test('ack conflict remains unresolved until server read confirms completion',async()=>{
  let reads=0;
  const rpc={readIntent:async()=>++reads===1?{status:'unresolved',command_id:command,payload,project_id:id,generation:'5'}:{status:'unresolved',command_id:command,payload,project_id:id,generation:'5'},
    mutate:async()=>{throw Error('must not repeat saved mutation');},readReceipt:async()=>({status:'saved',project_id:id}),acknowledge:async()=>({status:'conflict'})};
  const result=await resolveProjectCreateWithIntent(rpc,command,'5');
  assert.equal(result.status,'unresolved');assert.equal(result.intent.projectId,id);
});
test('an already-acknowledged intent resolves only with a matching receipt and advanced generation',async()=>{
  let acks=0;
  const rpc={readIntent:async()=>({status:'clear',generation:'6'}),mutate:async()=>{throw Error('must not mutate');},
    readReceipt:async()=>({status:'saved',project_id:id}),acknowledge:async()=>{acks++;}};
  assert.deepEqual(await resolveProjectCreateWithIntent(rpc,command,'5'),{status:'saved',projectId:id});
  assert.equal(acks,0);
  assert.equal((await resolveProjectCreateWithIntent({...rpc,readReceipt:async()=>null},command,'5')).status,'error');
});
test('a stale browser marker with no receipt stays blocked for review and never starts a new create',async()=>{
  let mutations=0,acks=0;
  const rpc={readIntent:async()=>({status:'clear',generation:'8'}),mutate:async()=>{mutations++;},
    readReceipt:async()=>null,acknowledge:async()=>{acks++;}};
  assert.equal((await resolveProjectCreateWithIntent(rpc,command,'7')).status,'error');
  assert.equal(mutations,0);assert.equal(acks,0);
});
test('a malformed unresolved payload cannot be retried or replaced by another create',async()=>{
  let mutations=0;
  const rpc={readIntent:async()=>({status:'unresolved',command_id:command,payload:null,project_id:null,generation:'4'}),
    mutate:async()=>{mutations++;},readReceipt:async()=>null,acknowledge:async()=>null};
  const result=await createProjectWithIntent(rpc,{expectedUserId:actor,commandId:id,generation:'4',payload});
  assert.equal(result.status,'unresolved');assert.equal(result.intent.commandId,command);
  assert.equal(mutations,0);
});
test('creation trims copy and excludes forged authority',()=>{const f=form();f.set('user_id','forged');f.set('role','admin');assert.deepEqual(buildProjectCommand(f),{kind:'create',p_command:{kind:'create',title:'Test',description:'Description',visibility:'private'},p_command_id:command});});
test('project form account consistency is separate from the RPC payload',()=>{
  const first='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', second='11111111-2222-4333-8444-555555555555';
  const f=form();f.set('expected_account',first);
  assert.equal(matchesFormAccount(f,first),true);assert.equal(matchesFormAccount(f,second),false);
  assert.deepEqual(buildProjectCommand(f),{kind:'create',p_command:{kind:'create',title:'Test',description:'Description',visibility:'private'},p_command_id:command});
  f.append('expected_account',first);assert.equal(matchesFormAccount(f,first),false);
});
test('duplicates, file inputs, unsupported stages and empty identity/revision fail closed',()=>{
  for(const field of ['kind','command_id','title','description','visibility']){const f=form();f.append(field,'duplicate');assert.equal(buildProjectCommand(f),null);}
  const f=form();f.set('title',new Blob(['text']),'file.txt');assert.equal(buildProjectCommand(f),null);
  for(const project_id of ['', 'bad'])assert.equal(buildProjectCommand(form({kind:'leave',project_id})),null);
  for(const expected_revision of ['', '0','01','9223372036854775808'])assert.equal(buildProjectCommand(form({kind:'rotate_code',project_id:id,expected_revision})),null);
  assert.equal(buildProjectCommand(form({kind:'update',project_id:id,expected_revision:'1',title:'Test',description:'Text',visibility:'public',stage:'archived'})),null);
});
test('Unicode and control bounds and code normalization',()=>{
  const f=form();f.set('title','🛠'.repeat(160));assert.ok(buildProjectCommand(f));f.set('title','a'.repeat(161));assert.equal(buildProjectCommand(f),null);
  f.set('title','valid');f.set('description','a\0b');assert.equal(buildProjectCommand(f),null);
  assert.equal(buildProjectCommand(form({kind:'join',code:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'})).p_command.code,'A'.repeat(32));
  assert.equal(buildProjectCommand(form({kind:'join',code:'short'})),null);
});
test('mutations require exact response for their action',()=>{
  assert.equal(parseProjectAction({status:'saved',project_id:id,revision:'2'},'update').status,'saved');
  assert.equal(parseProjectAction({status:'requested',request_id:id},'join').status,'saved');
  assert.equal(parseProjectAction({status:'saved',project_id:null},'cancel').status,'saved');
  for(const value of [null,{}, {status:'saved',project_id:id}, {status:'saved',project_id:id,revision:'2',email:'private'}, {get status(){throw Error('getter');}}])assert.equal(parseProjectAction(value,'create').status,'error');
  assert.equal(parseProjectAction({status:'left'},'create').status,'error');
});
test('discovery rejects private, duplicate, unowned mine and malformed cursors',()=>{
  assert.equal(parseProjectList({items:[card()],cursor:null},'discover').status,'ready');
  assert.equal(parseProjectList({items:[card()],cursor:null},'mine').status,'unavailable');
  assert.equal(parseProjectList({items:[{...card(),visibility:'private'}],cursor:null},'discover').status,'unavailable');
  assert.equal(parseProjectList({items:[card(),card()],cursor:null},'discover').status,'unavailable');
  assert.equal(parseProjectList({items:[card()],cursor:{updated_at:time,id}},'discover').status,'unavailable');
});
test('detail forbids code, team or private profile disclosure to non-members',()=>{
  const value={project:card(),join_code:null,members:[],requests:[],pending_count:0};
  assert.equal(parseProjectDetail(value,id).status,'ready');
  assert.equal(parseProjectDetail({...value,join_code:'A'.repeat(32)},id).status,'unavailable');
  assert.equal(parseProjectDetail({...value,project:{...card(),email:'private'}},id).status,'unavailable');
  assert.equal(parseProjectDetail({...value,members:[{id,role:'lead',is_self:false,joined_at:time}]},id).status,'unavailable');
  assert.equal(parseProjectDetail(value,command).status,'unavailable');
});
test('creator detail requires bounded complete team projection and exact safe references',()=>{
  const value={project:{...card(),relation:'creator'},join_code:'A'.repeat(32),members:[{id,role:'lead',is_self:true,joined_at:time}],requests:[],pending_count:0};
  assert.equal(parseProjectDetail(value,id).status,'ready');
  assert.equal(parseProjectDetail({...value,members:[]},id).status,'unavailable');
  assert.equal(parseProjectDetail({...value,members:[{...value.members[0],name:'private'}]},id).status,'unavailable');
});
test('own requests redact private project identity atomically',()=>{
  const row={id,status:'pending',revision:'1',created_at:time,updated_at:time,project_id:null,project_title:null};
  assert.equal(parseOwnProjectRequests([row]).status,'ready');
  assert.equal(parseOwnProjectRequests([{...row,project_title:'private title'}]).status,'unavailable');
  assert.equal(parseOwnProjectRequests([row,row]).status,'unavailable');
});
