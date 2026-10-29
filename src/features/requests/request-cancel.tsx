'use client';
import { useEffect,useRef,useState } from 'react';
import { changeWorkRequest } from '@/app/app/requests/actions';
import { parseIntakeResult,type IntakeState } from './work-request-command';
export function RequestCancel({accountId,id,revision,canCancel,initialCommandId}:{accountId:string;id:string;revision:string;canCancel:boolean;initialCommandId:string}){
  const [pending,setPending]=useState(false),[state,setState]=useState<IntakeState>({status:'idle',message:''}),[commandId]=useState(initialCommandId);
  const feedback=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{if(state.status!=='idle')feedback.current?.focus();},[state]);
  return <form className="project-small-action" onReset={event=>event.preventDefault()} onSubmit={async event=>{
    event.preventDefault();if(pending||!canCancel||state.status==='saved')return;
    const data=new FormData(event.currentTarget);setPending(true);
    try{setState(await changeWorkRequest(data));}catch{setState(parseIntakeResult(null,'cancel'));}finally{setPending(false);}
  }} aria-busy={pending}>
    <input type="hidden" name="request_action" value="cancel"/><input type="hidden" name="command_id" value={commandId}/><input type="hidden" name="request_id" value={id}/><input type="hidden" name="expected_revision" value={revision}/>
    <input type="hidden" name="expected_account" value={accountId}/>
    {canCancel&&state.status!=='saved'&&<fieldset disabled={pending} className="request-cancel-fields"><legend>Cancel before head review</legend><p>This keeps the submitted record and adds a cancellation event.</p><label className="project-confirm"><input type="checkbox" required/> I want to cancel this test request.</label><button className="button" type="submit">{pending?'Cancelling…':'Cancel test request'}</button></fieldset>}
    <p role={state.status==='error'?'alert':'status'} tabIndex={-1} ref={feedback}>{state.message}</p>
  </form>;
}
