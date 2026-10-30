import { isRequestService } from './request-services.ts';
import { referenceError } from './draft-storage.ts';
export const requestId = (v:unknown):v is string => typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const requestRevision = (v:unknown):v is string => typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v)&&(v.length<19||v<='9223372036854775807');
export function requestTime(v:unknown):v is string {
  if(typeof v!=='string')return false;
  const m=v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/);
  if(!m)return false;
  const [year,month,day,hour,minute,second]=m.slice(1).map(Number);
  return year>0&&month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate()&&hour<=23&&minute<=59&&second<=59&&Number.isFinite(Date.parse(v));
}
export function requestRecord(v:unknown,keys:string[]):v is Record<string,unknown> {if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)return false;const d=Object.getOwnPropertyDescriptors(v);return Reflect.ownKeys(v).length===keys.length&&keys.every(k=>d[k]?.enumerable&&'value' in d[k]);}
const controls=(v:string)=>Array.from(v).some(c=>{const n=c.charCodeAt(0);return (n<32&&![9,10,13].includes(n))||(n>=127&&n<=159);});
export const safeStoredReference=(v:unknown):v is string=>typeof v==='string'&&v.length<=2048&&/^https?:\/\/[^/?#]+\//u.test(v)&&!/^https?:\/\/[^/?#]*@/u.test(v)&&!/[\s\\]/u.test(v)&&!controls(v);
const text=(v:unknown,min:number,max:number):v is string=>typeof v==='string'&&Array.from(v).length>=min&&Array.from(v).length<=max&&v.length<=max*2&&!controls(v);
export type Intake={kind:'machine'|'operations';service_id:string;title:string;description:string;technical_details:string;preferred_at:string|null;references:string[]};
export function intake(value:unknown):Intake|null {
  if(!requestRecord(value,['kind','service_id','title','description','technical_details','preferred_at','references'])||!['machine','operations'].includes(value.kind as string)||typeof value.service_id!=='string'||!isRequestService(value.kind as Intake['kind'],value.service_id)
    ||!text(value.title,5,120)||value.title.trim()!==value.title||/[\n\r\t]/u.test(value.title)||!text(value.description,20,5000)||value.description.trim()!==value.description||!text(value.technical_details,0,2000)
    ||(value.preferred_at!==null&&!requestTime(value.preferred_at))||!Array.isArray(value.references)||value.references.some(r=>typeof r!=='string'||/\s/u.test(r)||controls(r))||referenceError(value.references))return null;
  const references=value.references.map(r=>new URL(r).href);
  if(referenceError(references))return null;
  return {...value,references,preferred_at:value.preferred_at===null?null:new Date(value.preferred_at as string).toISOString()} as unknown as Intake;
}
/** datetime-local is interpreted in IST regardless of browser/server timezone. */
export function preferredIst(value:string):string|null|undefined {
  if(value==='')return null;
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return undefined;
  const local=new Date(value+'Z');
  if(!Number.isFinite(local.getTime())||local.toISOString().slice(0,16)!==value)return undefined;
  return new Date(local.getTime()-330*60000).toISOString();
}
export type RequestCard=Readonly<{id:string;kind:Intake['kind'];service_id:string;title:string;status:'submitted'|'cancelled';revision:string;created_at:string;updated_at:string;can_cancel:boolean}>;
export type RequestCursor={created_at:string;id:string};
export type RequestList={items:RequestCard[];cursor:RequestCursor|null};
export type RequestDetail=RequestCard&{description:string;technical_details:string;preferred_at:string|null;references:string[];history:{status:'submitted'|'cancelled';recorded_at:string}[]};
export type RequestRead<T>={status:'ready';data:T}|{status:'unavailable';data:null};
const bad={status:'unavailable',data:null} as const;
const cardKeys=['id','kind','service_id','title','status','revision','created_at','updated_at','can_cancel'];
function card(value:unknown):RequestCard|null {
  if(!requestRecord(value,cardKeys)||!requestId(value.id)||!['machine','operations'].includes(value.kind as string)||typeof value.service_id!=='string'||!isRequestService(value.kind as Intake['kind'],value.service_id)||!text(value.title,5,120)||!['submitted','cancelled'].includes(value.status as string)||!requestRevision(value.revision)||!requestTime(value.created_at)||!requestTime(value.updated_at)||typeof value.can_cancel!=='boolean'||(value.status==='cancelled'&&value.can_cancel))return null;
  return value as unknown as RequestCard;
}
export function parseRequests(value:unknown):RequestRead<RequestList>{try{
  if(!requestRecord(value,['items','cursor'])||!Array.isArray(value.items)||value.items.length>20)return bad;
  const items:RequestCard[]=[];const ids=new Set<string>();for(const row of value.items){const c=card(row);if(!c||ids.has(c.id))return bad;ids.add(c.id);items.push(c);}
  let cursor:RequestCursor|null=null;
  if(value.cursor!==null){if(!requestRecord(value.cursor,['created_at','id'])||!requestTime(value.cursor.created_at)||!requestId(value.cursor.id)||items.length!==20||items.at(-1)?.id!==value.cursor.id||items.at(-1)?.created_at!==value.cursor.created_at)return bad;cursor=value.cursor as RequestCursor;}
  return {status:'ready',data:{items,cursor}};
}catch{return bad;}}
export function parseRequest(value:unknown,id:string):RequestRead<RequestDetail|null>{try{
  if(value===null)return {status:'ready',data:null};
  if(!requestRecord(value,[...cardKeys,'description','technical_details','preferred_at','references','history']))return bad;
  const summary=Object.fromEntries(cardKeys.map(k=>[k,value[k]])),c=card(summary);
  if(!c||c.id!==id||!intake({kind:c.kind,service_id:c.service_id,title:c.title,description:value.description,technical_details:value.technical_details,preferred_at:value.preferred_at,references:[]})||!Array.isArray(value.references)||value.references.length>5||!value.references.every(safeStoredReference)||!Array.isArray(value.history)||value.history.length<1||value.history.length>2)return bad;
  for(const [i,h] of value.history.entries())if(!requestRecord(h,['status','recorded_at'])||h.status!==(i===0?'submitted':'cancelled')||!requestTime(h.recorded_at))return bad;
  if(value.history.at(-1)?.status!==c.status)return bad;
  return {status:'ready',data:value as unknown as RequestDetail};
}catch{return bad;}}
