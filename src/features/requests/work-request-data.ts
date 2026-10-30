import 'server-only';
import { requireMember } from '@/lib/member';
import { serverClient } from '@/lib/supabase';
import { parseRequests,parseRequest,type RequestRead,type RequestList,type RequestDetail,type RequestCursor } from './work-request-contract';
const bad={status:'unavailable',data:null} as const;
export async function loadWorkRequests(cursor:RequestCursor|null):Promise<RequestRead<RequestList>>{
  await requireMember();const client=await serverClient();if(!client)return bad;
  try{const r=await client.rpc('get_own_work_requests_v1',{p_before_time:cursor?.created_at??null,p_before_id:cursor?.id??null});return r.error?bad:parseRequests(r.data);}catch{return bad;}
}
export async function loadWorkRequest(id:string):Promise<RequestRead<RequestDetail|null>>{
  await requireMember();const client=await serverClient();if(!client)return bad;
  try{const r=await client.rpc('get_own_work_request_v1',{p_id:id});return r.error?bad:parseRequest(r.data,id);}catch{return bad;}
}
