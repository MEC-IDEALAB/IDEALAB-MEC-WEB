'use server';
import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/member';
import { serverClient } from '@/lib/supabase';
import { buildIntakeCommand,parseIntakeResult,type IntakeState } from '@/features/requests/work-request-command';
import { requestId, requestRecord } from '@/features/requests/work-request-contract';
import { matchesFormAccount } from '@/lib/form-account';

export async function findConfirmedSubmission(expectedAccount:string,commandId:string):Promise<string|null>{
  const account=await requireMember();
  if(account.user.id!==expectedAccount||account.profile.role!=='student'||process.env.ACCOUNT_ENVIRONMENT!=='validation'||process.env.ENABLE_WORK_REQUEST_INTAKE!=='true'||!requestId(commandId))return null;
  const client=await serverClient({ writable: true });if(!client)return null;
  try{
    const result=await client.rpc('get_own_submit_receipt_v1',{p_command_id:commandId});
    if(!result.error&&requestRecord(result.data,['status','request_id'])&&result.data.status==='submitted'&&requestId(result.data.request_id))return result.data.request_id;
  }catch{/* Do not expose provider details or infer a missing receipt. */}
  return null;
}
export async function changeWorkRequest(form:FormData):Promise<IntakeState>{
  const account=await requireMember();
  if(account.profile.role!=='student'||process.env.ACCOUNT_ENVIRONMENT!=='validation'||process.env.ENABLE_WORK_REQUEST_INTAKE!=='true')return {status:'error',message:'Online request intake is not enabled for this environment or account.'};
  const input=buildIntakeCommand(form);if(!input)return {status:'error',message:'Check the form fields and limits before trying again.'};
  if(!matchesFormAccount(form,account.user.id))return {status:'error',message:'Your account changed. Return to requests and try again with the correct account.'};
  const client=await serverClient({ writable: true });if(!client)return parseIntakeResult(null,input.action);
  try{
    const result=input.action==='submit'?await client.rpc('submit_work_request_v1',input.args):await client.rpc('cancel_work_request_v1',input.args);
    const state=parseIntakeResult(result.error?null:result.data,input.action);
    revalidatePath('/app/requests');if(state.requestId)revalidatePath(`/app/requests/${state.requestId}`);revalidatePath('/app');revalidatePath('/app/lab');return state;
  }catch{return parseIntakeResult(null,input.action);}
}
