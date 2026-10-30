import { intake,preferredIst,requestId,requestRecord,requestRevision,type Intake } from './work-request-contract.ts';
import type { DraftData } from './draft-storage.ts';
export type IntakeState={status:'idle'|'saved'|'error';message:string;requestId?:string};
export function draftIntake(draft:DraftData):Intake|null {
  const preferred=preferredIst(draft.preferredTime);if(preferred===undefined)return null;
  return intake({kind:draft.kind,service_id:draft.serviceId,title:draft.title.trim(),description:draft.details.trim(),technical_details:(draft.technicalDetails??'').trim(),preferred_at:preferred,references:draft.references});
}
export function buildIntakeCommand(form:FormData) {
  const commandId=form.get('command_id'),action=form.get('request_action');
  if(!requestId(commandId)||form.getAll('command_id').length!==1||form.getAll('request_action').length!==1)return null;
  if(action==='submit'){
    const raw=form.get('intake');if(typeof raw!=='string'||raw.length>40000||form.getAll('intake').length!==1)return null;
    try{const data=intake(JSON.parse(raw));return data?{action:'submit' as const,args:{p_intake:data,p_command_id:commandId}}:null;}catch{return null;}
  }
  if(action==='cancel'){
    const id=form.get('request_id'),revision=form.get('expected_revision');
    if(!requestId(id)||!requestRevision(revision)||form.getAll('request_id').length!==1||form.getAll('expected_revision').length!==1)return null;
    return {action:'cancel' as const,args:{p_id:id,p_expected_revision:revision,p_command_id:commandId}};
  }
  return null;
}
export function parseIntakeResult(value:unknown,action:'submit'|'cancel'):IntakeState {
  try{
    if(requestRecord(value,['status','request_id'])&&value.status===(action==='submit'?'submitted':'cancelled')&&requestId(value.request_id))return {status:'saved',message:action==='submit'?'Saved in the isolated test database. No head has been notified.':'Cancellation recorded in the isolated test database.',requestId:value.request_id};
    if(requestRecord(value,['status'])){
      const messages:Record<string,string>={invalid:'Check the required service, title, description, optional details, time and links.',denied:'This action is not available to your account.',conflict:'This request or command changed. Check the saved version before trying again.',review_required:'Head involvement prevents direct cancellation. The reasoned cancellation and staff decision flow is not connected in this test release.'};
      if(typeof value.status==='string'&&Object.hasOwn(messages,value.status))return {status:'error',message:messages[value.status]};
    }
  }catch{/* Never reflect provider payloads or infer success. */}
  return {status:'error',message:'We couldn’t confirm this action. Keep your text and check request history before retrying the same action.'};
}
