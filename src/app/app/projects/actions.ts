'use server';
import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/member';
import { serverClient } from '@/lib/supabase';
import { buildProjectCommand,parseProjectAction,type ProjectActionState } from '@/features/projects/project-command';
import { isProjectId } from '@/features/projects/project-contract';
import { projectCoreEnabled } from '@/features/projects/project-config';
import { matchesFormAccount } from '@/lib/form-account';
import { createProjectWithIntent,parseProjectCreateIntent,resolveProjectCreateWithIntent,type AccountBoundCreateRpc,type CreatePayload } from '@/features/projects/project-create-intent';

function accountBoundCreateRpc(client:NonNullable<Awaited<ReturnType<typeof serverClient>>>):AccountBoundCreateRpc {
  return {
    readIntent:async()=>{const result=await client.rpc('get_own_project_create_intent_v1');return result.error?null:result.data;},
    mutate:async(command,commandId,generation,expectedUserId)=>{
      const result=await client.rpc('mutate_project_for_account_v1',{p_command:command,p_command_id:commandId,p_create_generation:generation,p_expected_user_id:expectedUserId});
      return result.error?null:result.data;
    },
    readReceipt:async(commandId)=>{const result=await client.rpc('get_own_project_create_receipt_v1',{p_command_id:commandId});return result.error?null:result.data;},
    acknowledge:async(commandId)=>{const result=await client.rpc('ack_own_project_create_v1',{p_command_id:commandId});return result.error?null:result.data;},
  };
}

export async function readOwnProjectCreateIntent(accountId:string) {
  if(!isProjectId(accountId))return {status:'unavailable'} as const;
  const member=await requireMember();
  if(!projectCoreEnabled()||member.user.id!==accountId)return {status:'unavailable'} as const;
  const client=await serverClient();
  if(!client)return {status:'unavailable'} as const;
  try {const result=await client.rpc('get_own_project_create_intent_v1');return result.error?{status:'unavailable'} as const:parseProjectCreateIntent(result.data);}
  catch {return {status:'unavailable'} as const;}
}

export async function createProjectWithAccountIntent(form:FormData) {
  const member=await requireMember();
  if(!projectCoreEnabled())return {status:'error',message:'Project actions are not available in this environment.'} as const;
  if(!matchesFormAccount(form,member.user.id))return {status:'error',message:'Your signed-in account changed. Copy any changes, then reload before continuing.'} as const;
  const input=buildProjectCommand(form);
  const generation=form.get('create_generation');
  if(!input||input.kind!=='create'||typeof generation!=='string'||form.getAll('create_generation').length!==1)
    return {status:'error',message:'Check the project details and retry state before continuing.'} as const;
  const client=await serverClient({writable:true});
  if(!client)return {status:'error',message:'We could not confirm this project request. Check My projects before trying again.'} as const;
  try {
    const result=await createProjectWithIntent(accountBoundCreateRpc(client),{
      expectedUserId:member.user.id,commandId:input.p_command_id,generation,
      payload:input.p_command as CreatePayload,
    });
    if(result.status==='saved'){
      revalidatePath('/app/projects','layout');revalidatePath('/app');revalidatePath('/app/lab');
    }
    return result;
  } catch {return {status:'error',message:'We could not confirm this project request. Check My projects before trying again.'} as const;}
}

export async function resolveOwnProjectCreateIntent(accountId:string,commandId:string,expectedGeneration?:string) {
  if(!isProjectId(accountId)||!isProjectId(commandId))return {status:'error',message:'We could not confirm this project request. Check My projects before trying again.'} as const;
  const member=await requireMember();
  if(!projectCoreEnabled()||member.user.id!==accountId)return {status:'error',message:'Your signed-in account changed. Reload before continuing.'} as const;
  const client=await serverClient({writable:true});
  if(!client)return {status:'error',message:'We could not confirm this project request. Check My projects before trying again.'} as const;
  try {
    const result=await resolveProjectCreateWithIntent(accountBoundCreateRpc(client),commandId,expectedGeneration);
    if(result.status==='saved'){
      revalidatePath('/app/projects','layout');revalidatePath('/app');revalidatePath('/app/lab');
    }
    return result;
  } catch {return {status:'error',message:'We could not confirm this project request. Check My projects before trying again.'} as const;}
}

export async function changeProject(_previous:ProjectActionState,form:FormData):Promise<ProjectActionState> {
  const member=await requireMember();
  if(!projectCoreEnabled())return {status:'error',message:'Project actions are not available in this environment.'};
  if(!matchesFormAccount(form,member.user.id))return {status:'error',message:'Your signed-in account changed. Copy any changes, then reload before continuing.'};
  const input=buildProjectCommand(form);
  if(!input) return {status:'error',message:'Check the form fields, required choices and text limits.'};
  if(input.kind==='create')return {status:'error',message:'Project creation needs an account-bound retry check. Refresh before trying again.'};
  const client=await serverClient({ writable: true }); if(!client) return parseProjectAction(null,input.kind);
  try {
    const result=await client.rpc('mutate_project_v1',{p_command:input.p_command,p_command_id:input.p_command_id});
    const state=parseProjectAction(result.error?null:result.data,input.kind);
    revalidatePath('/app/projects','layout'); revalidatePath('/app'); revalidatePath('/app/lab');
    return state;
  } catch { return parseProjectAction(null,input.kind); }
}
