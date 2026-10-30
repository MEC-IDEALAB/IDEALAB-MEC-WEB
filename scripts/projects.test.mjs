import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectCommand, confirmedProjectCreateReceipt, parseProjectAction } from '../src/features/projects/project-command.ts';
import { parseProjectList, parseProjectDetail, parseOwnProjectRequests } from '../src/features/projects/project-contract.ts';
import { matchesFormAccount } from '../src/lib/form-account.ts';
import { projectCoreEnabled } from '../src/features/projects/project-config.ts';
const id='11111111-1111-4111-8111-111111111111', command='22222222-2222-4222-8222-222222222222', time='2026-10-22T10:00:00Z';
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
test('only exact confirmed project creation receipts resolve',()=>{
  assert.equal(confirmedProjectCreateReceipt({status:'saved',project_id:id}),id);
  for(const value of [null,[],{}, {status:'saved',project_id:'bad'}, {status:'denied',project_id:id}, {status:'saved',project_id:id,title:'private'}]) assert.equal(confirmedProjectCreateReceipt(value),null);
  assert.equal(confirmedProjectCreateReceipt({get status(){throw Error('unexpected');},project_id:id}),null);
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
