import 'server-only';
import { cache } from 'react';
import { requireMember } from '@/lib/member';
import { serverClient } from '@/lib/supabase';
import { projectCoreEnabled } from './project-config';
import { parseProjectList,parseProjectDetail,parseOwnProjectRequests,type ProjectList,type ProjectDetail,type OwnProjectRequest,type ProjectRead,type ProjectCursor } from './project-contract';
const unavailable={status:'unavailable',data:null} as const;
export async function loadProjects(view:'mine'|'discover',query:string,cursor:ProjectCursor|null):Promise<ProjectRead<ProjectList>> {
  await requireMember(); if(!projectCoreEnabled()) return unavailable; const client=await serverClient(); if(!client) return unavailable;
  try { const result=await client.rpc('get_projects_v1',{p_view:view,p_query:query,p_before_time:cursor?.updated_at??null,p_before_id:cursor?.id??null}); return result.error ? unavailable : parseProjectList(result.data,view); } catch { return unavailable; }
}
export const loadProject=cache(async(id:string):Promise<ProjectRead<ProjectDetail|null>>=>{
  await requireMember(); if(!projectCoreEnabled()) return unavailable; const client=await serverClient(); if(!client) return unavailable;
  try { const result=await client.rpc('get_project_v1',{p_id:id}); return result.error ? unavailable : parseProjectDetail(result.data,id); } catch { return unavailable; }
});
export const loadOwnProjectRequests=cache(async():Promise<ProjectRead<OwnProjectRequest[]>>=>{
  await requireMember(); if(!projectCoreEnabled()) return unavailable; const client=await serverClient(); if(!client) return unavailable;
  try { const result=await client.rpc('get_own_project_requests_v1'); return result.error ? unavailable : parseOwnProjectRequests(result.data); } catch { return unavailable; }
});
