'use server';
import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/member';
import { serverClient } from '@/lib/supabase';
import { buildProjectCommand,confirmedProjectCreateReceipt,parseProjectAction,type ProjectActionState } from '@/features/projects/project-command';
import { isProjectId } from '@/features/projects/project-contract';
import { projectCoreEnabled } from '@/features/projects/project-config';
import { matchesFormAccount } from '@/lib/form-account';
export async function changeProject(_previous:ProjectActionState,form:FormData):Promise<ProjectActionState> {
  const member=await requireMember();
  if(!projectCoreEnabled())return {status:'error',message:'Project actions are not available in this environment.'};
  if(!matchesFormAccount(form,member.user.id))return {status:'error',message:'Your signed-in account changed. Copy any changes, then reload before continuing.'};
  const input=buildProjectCommand(form);
  if(!input) return {status:'error',message:'Check the form fields, required choices and text limits.'};
  const client=await serverClient({ writable: true }); if(!client) return parseProjectAction(null,input.kind);
  try {
    const result=await client.rpc('mutate_project_v1',{p_command:input.p_command,p_command_id:input.p_command_id});
    const state=parseProjectAction(result.error?null:result.data,input.kind);
    revalidatePath('/app/projects','layout'); revalidatePath('/app'); revalidatePath('/app/lab');
    return state;
  } catch { return parseProjectAction(null,input.kind); }
}

/** A null result cannot prove a create failed or is no longer in flight. */
export async function findConfirmedProjectCreate(accountId:string, commandId:string):Promise<string|null> {
  if(!isProjectId(accountId)||!isProjectId(commandId)) return null;
  const member=await requireMember();
  if(!projectCoreEnabled()) return null;
  if(member.user.id!==accountId) return null;
  const client=await serverClient({writable:true});
  if(!client) return null;
  try {
    const result=await client.rpc('get_own_project_create_receipt_v1',{p_command_id:commandId});
    return result.error ? null : confirmedProjectCreateReceipt(result.data);
  } catch { return null; }
}
