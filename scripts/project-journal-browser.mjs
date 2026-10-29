import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import ts from 'typescript';

// Runs the actual journal source in Chromium with isolated synthetic data.
const compile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
  .replace(/^import .*;\s*$/gm,'').replace(/^export \{\};\s*$/gm,'').replace(/^export /gm,'');
const contract=compile(await readFile('src/features/projects/project-contract.ts','utf8'));
const journal=compile(await readFile('src/features/projects/pending-create.ts','utf8'));
const script=`${contract}\n${journal}\nwindow.journal={readPendingCreate,preparePendingCreate,markPendingCreate,clearConfirmedCreate,projectMarkers};`;
const server=createServer((_,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Journal test</title>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext(),a=await context.newPage(),b=await context.newPage();
  for(const page of [a,b]){await page.goto(`http://127.0.0.1:${server.address().port}`);await page.addScriptTag({content:script});}
  const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',old='33333333-3333-4333-8333-333333333333',fresh='44444444-4444-4444-8444-444444444444';
  const payload={kind:'create',title:'Synthetic idea',description:'Synthetic details',visibility:'private'};
  const prepare=(page,accountId,commandId,data=payload)=>page.evaluate(({accountId,commandId,data})=>window.journal.preparePendingCreate(accountId,commandId,data),{accountId,commandId,data});
  const read=(page,accountId)=>page.evaluate(id=>window.journal.readPendingCreate(id),accountId);
  assert.equal((await read(a,actor)).status,'empty');
  const first=await prepare(a,actor,old);assert.equal(first.status,'ready');
  const competing=await prepare(b,actor,fresh,{...payload,title:'Different idea'});
  assert.equal(competing.pending.commandId,old);assert.deepEqual(competing.pending.payload,payload);
  assert.equal((await read(b,other)).status,'empty');
  assert.equal(await a.evaluate(item=>window.journal.markPendingCreate(item),first.pending),true);
  await b.reload();await b.addScriptTag({content:script});assert.equal((await read(b,actor)).pending.commandId,old);
  assert.equal(await a.evaluate(({actor,old})=>window.journal.clearConfirmedCreate(actor,old),{actor,old}),true);
  assert.equal((await prepare(a,actor,fresh)).pending.commandId,fresh);
  // A stale tab can recreate the old marker after a newer journal is stored.
  assert.equal(await b.evaluate(item=>window.journal.markPendingCreate(item),first.pending),true);
  assert.equal((await read(a,actor)).status,'unavailable');
  assert.equal(await a.evaluate(({actor,old})=>window.journal.clearConfirmedCreate(actor,old),{actor,old}),true);
  assert.equal((await read(a,actor)).pending.commandId,fresh);
  assert.equal(await a.evaluate(({actor,old})=>window.journal.clearConfirmedCreate(actor,old),{actor,old}),false);
  assert.equal(await a.evaluate(({actor,fresh})=>window.journal.clearConfirmedCreate(actor,fresh),{actor,fresh}),true);
  assert.equal((await read(a,actor)).status,'empty');
  const [raceA,raceB]=await Promise.all([prepare(a,actor,old),prepare(b,actor,fresh,{...payload,title:'Other idea'})]);
  assert.equal(raceA.pending.commandId,raceB.pending.commandId);
  const winner=raceA.pending;assert.equal(await a.evaluate(item=>window.journal.markPendingCreate(item),winner),true);
  await a.evaluate(id=>new Promise((resolve,reject)=>{const req=indexedDB.open('idealab-mec-validation-project-create-v1',1);req.onsuccess=()=>{const db=req.result,tx=db.transaction('pending','readwrite');tx.objectStore('pending').delete(id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};req.onerror=()=>reject(req.error);}),actor);
  assert.equal((await read(b,actor)).status,'unavailable');
  assert.deepEqual(await b.evaluate(id=>window.journal.projectMarkers(id),actor),[winner.commandId]);
  assert.equal(await b.evaluate(({actor,command})=>window.journal.clearConfirmedCreate(actor,command),{actor,command:winner.commandId}),true);
  assert.equal((await read(a,actor)).status,'empty');
  const guarded=await prepare(a,actor,old);
  assert.equal(await a.evaluate(item=>{const original=Storage.prototype.setItem;try{Storage.prototype.setItem=()=>{throw new Error('denied');};return window.journal.markPendingCreate(item);}finally{Storage.prototype.setItem=original;}},guarded.pending),false);
  assert.equal((await read(a,actor)).pending.commandId,old);
  assert.equal(await a.evaluate(({actor,old})=>window.journal.clearConfirmedCreate(actor,old),{actor,old}),true);
  assert.equal(await b.evaluate(async id=>{Object.defineProperty(window,'indexedDB',{value:{open(){throw new Error('denied');}},configurable:true});return (await window.journal.readPendingCreate(id)).status;},actor),'unavailable');
  const preview=await a.evaluate(({actor,old,payload})=>window.journal.preparePendingCreate(actor,old,payload,'preview'),{actor,old,payload});
  assert.equal(preview.status,'ready');assert.equal((await read(a,actor)).status,'empty');
  assert.equal(await a.evaluate(({actor,old})=>window.journal.clearConfirmedCreate(actor,old,'preview'),{actor,old}),true);
  await context.close();
  console.log('PASS: real Chromium journal reload, concurrent tabs, account separation, missing journal, storage denial and stale-marker recovery. No real account or server mutation tested.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
