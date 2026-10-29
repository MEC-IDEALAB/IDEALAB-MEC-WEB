import { isProjectId, projectRecord, projectText } from './project-contract.ts';

export type CreatePayload = {kind:'create';title:string;description:string;visibility:'private'|'public'};
export type PendingCreate = {accountId:string;commandId:string;payload:CreatePayload};
type ReadResult = {status:'ready';pending:PendingCreate}|{status:'empty'|'unavailable'};
type Scope='validation'|'preview';
const dbName=(scope:Scope)=>`idealab-mec-${scope}-project-create-v1`, storeName='pending';
const prefix=(accountId:string,scope:Scope)=>`idealab-mec:${scope}-project-create:v1:${accountId}:`;
function markers(accountId:string,scope:Scope):string[] {
  const found:string[]=[];const start=prefix(accountId,scope);
  for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(start))found.push(key.slice(start.length));}
  return found;
}
export function projectMarkers(accountId:string,scope:Scope='validation'):string[] {
  if(!isProjectId(accountId))return [];
  try {const result=markers(accountId,scope);return result.length<=10&&result.every(isProjectId)?result:[];}catch{return [];}
}
function parse(value:unknown,accountId:string):PendingCreate|null {
  if(!projectRecord(value,['accountId','commandId','payload'])||value.accountId!==accountId||!isProjectId(value.commandId)
    ||!projectRecord(value.payload,['kind','title','description','visibility']))return null;
  const p=value.payload;
  if(p.kind!=='create'||!projectText(p.title,160)||p.title!==p.title.trim()||!projectText(p.description,4000,true)||p.description!==p.description.trim()
    ||(p.visibility!=='private'&&p.visibility!=='public'))return null;
  return {accountId,commandId:value.commandId,payload:{kind:'create',title:p.title,description:p.description,visibility:p.visibility}};
}
async function open(scope:Scope):Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(dbName(scope),1);let blocked=false;
    req.onupgradeneeded=()=>req.result.createObjectStore(storeName,{keyPath:'accountId'});
    req.onerror=()=>reject(req.error);req.onblocked=()=>{blocked=true;reject(new Error('Journal unavailable'));};
    req.onsuccess=()=>{if(blocked)req.result.close();else resolve(req.result);};
  });
}
export async function readPendingCreate(accountId:string,scope:Scope='validation'):Promise<ReadResult> {
  if(!isProjectId(accountId))return {status:'unavailable'};
  let db:IDBDatabase|undefined;
  try {db=await open(scope);return await new Promise((resolve,reject)=>{
    const tx=db!.transaction(storeName,'readonly'),get=tx.objectStore(storeName).get(accountId);
    get.onsuccess=()=>{try {const saved=get.result===undefined?null:parse(get.result,accountId),m=markers(accountId,scope);
      resolve(get.result===undefined?(m.length?{status:'unavailable'}:{status:'empty'}):saved&&m.every(id=>id===saved.commandId)?{status:'ready',pending:saved}:{status:'unavailable'});
    }catch{resolve({status:'unavailable'});}};
    tx.onerror=tx.onabort=()=>reject(tx.error);
  });}catch{return {status:'unavailable'};}finally{db?.close();}
}
/** One transaction per account prevents competing tabs from replacing a command. */
export async function preparePendingCreate(accountId:string,commandId:string,payload:CreatePayload,scope:Scope='validation'):Promise<ReadResult> {
  const incoming=parse({accountId,commandId,payload},accountId);
  if(!incoming||!isProjectId(accountId))return {status:'unavailable'};
  let db:IDBDatabase|undefined;
  try {db=await open(scope);return await new Promise((resolve,reject)=>{
    const tx=db!.transaction(storeName,'readwrite'),store=tx.objectStore(storeName),get=store.get(accountId);let pending:PendingCreate|null=null;
    get.onsuccess=()=>{try {const m=markers(accountId,scope);
      if(get.result!==undefined){pending=parse(get.result,accountId);if(!pending||m.some(id=>id!==pending!.commandId))tx.abort();}
      else if(m.length)tx.abort();else {pending=incoming;store.add(incoming);}
    }catch{tx.abort();}};
    tx.oncomplete=()=>resolve(pending?{status:'ready',pending}:{status:'unavailable'});tx.onerror=tx.onabort=()=>reject(tx.error);
  });}catch{return {status:'unavailable'};}finally{db?.close();}
}
export function markPendingCreate(pending:PendingCreate,scope:Scope='validation'):boolean {
  try {if(!parse(pending,pending.accountId)||markers(pending.accountId,scope).some(id=>id!==pending.commandId))return false;
    const key=prefix(pending.accountId,scope)+pending.commandId;localStorage.setItem(key,'1');return localStorage.getItem(key)==='1';
  }catch{return false;}
}
/** Clear only after the server confirms the exact owned create command. */
export async function clearConfirmedCreate(accountId:string,commandId:string,scope:Scope='validation'):Promise<boolean> {
  if(!isProjectId(accountId)||!isProjectId(commandId))return false;
  let db:IDBDatabase|undefined;
  try {db=await open(scope);return await new Promise((resolve,reject)=>{
    const tx=db!.transaction(storeName,'readwrite'),store=tx.objectStore(storeName),get=store.get(accountId);let safe=false;
    get.onsuccess=()=>{const saved=get.result===undefined?null:parse(get.result,accountId);
      if(get.result===undefined){try{safe=localStorage.getItem(prefix(accountId,scope)+commandId)==='1';}catch{safe=false;}}
      else if(saved?.commandId===commandId){safe=true;store.delete(accountId);}
      else if(saved){try{safe=localStorage.getItem(prefix(accountId,scope)+commandId)==='1';}catch{safe=false;}}};
    tx.oncomplete=()=>{if(!safe){resolve(false);return;}try{localStorage.removeItem(prefix(accountId,scope)+commandId);resolve(true);}catch{resolve(false);}};
    tx.onerror=tx.onabort=()=>reject(tx.error);
  });}catch{return false;}finally{db?.close();}
}
