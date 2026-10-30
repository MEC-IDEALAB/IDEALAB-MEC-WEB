'use client';
import Link from 'next/link';
import { useActionState,useEffect,useId,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeProject } from '@/app/app/projects/actions';
import { buildProjectCommand,type ProjectActionState,type ProjectKind } from './project-command';
import { stages,type ProjectCard,type PendingProjectRequest } from './project-contract';
const initial:ProjectActionState={status:'idle',message:''};
const unknown:ProjectActionState={status:'error',message:'We couldn’t confirm the update. Check the saved project and requests before retrying the same action.'};
function useFeedback(state:ProjectActionState) {
  const ref=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{if(state.status!=='idle') ref.current?.focus();},[state]);
  return ref;
}
function Feedback({state,elementRef}:{state:ProjectActionState;elementRef:React.RefObject<HTMLParagraphElement|null>}) {
  return <p tabIndex={-1} ref={elementRef} role={state.status==='error'?'alert':'status'} aria-live="polite" className="project-feedback">{state.message}</p>;
}
export function ProjectEditor({accountId,project,initialCommandId}:{accountId:string;project?:ProjectCard;initialCommandId:string}) {
  const router=useRouter(), prefix=`project-${useId().replaceAll(':','')}`;
  const [title,setTitle]=useState(project?.title??''), [description,setDescription]=useState(project?.description??'');
  const [visibility,setVisibility]=useState(project?.visibility==='public'?'public':'private');
  const [stage,setStage]=useState(project?.status??'ideation'), [revision,setRevision]=useState(project?.revision??'');
  const [commandId,setCommandId]=useState(initialCommandId);
  const savedVersionChanged=Boolean(project&&project.revision!==revision);
  const [state,formAction,pending]=useActionState(async(previous:ProjectActionState,form:FormData)=>{
    if(!buildProjectCommand(form)) return {status:'error',message:'Add a title (up to 160 characters), description (up to 4,000) and a visibility choice.'} as ProjectActionState;
    try {
      const result=await changeProject(previous,form);
      if(result.status==='saved') {
        if(result.revision) setRevision(result.revision);
        setCommandId(crypto.randomUUID());
        if(!project&&result.projectId) router.push(`/app/projects/${result.projectId}`);
      }
      return result;
    } catch {return unknown;}
  },initial);
  const feedback=useFeedback(state);
  return <form action={formAction} onReset={event=>event.preventDefault()} className="project-form" aria-busy={pending}>
    <input type="hidden" name="expected_account" value={accountId} />
    <input type="hidden" name="kind" value={project?'update':'create'} /><input type="hidden" name="command_id" value={commandId} />
    {project&&<><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="expected_revision" value={revision} /></>}
    <fieldset key={commandId} disabled={pending}><legend>{project?'Project details':'Start with the idea.'}</legend>
      <label htmlFor={`${prefix}-title`}>Project title</label><input id={`${prefix}-title`} name="title" required maxLength={320} value={title} onChange={e=>setTitle(e.target.value)} aria-describedby={`${prefix}-title-hint`} /><p className="small-copy" id={`${prefix}-title-hint`}>{Array.from(title).length}/160 characters</p>
      <label htmlFor={`${prefix}-description`}>What are you building?</label><textarea id={`${prefix}-description`} name="description" required rows={5} maxLength={8000} value={description} onChange={e=>setDescription(e.target.value)} aria-describedby={`${prefix}-description-hint`} /><p className="small-copy" id={`${prefix}-description-hint`}>{Array.from(description).length}/4,000 characters. Avoid contact details and other sensitive information.</p>
      <label htmlFor={`${prefix}-visibility`}>Who can discover it?</label><select id={`${prefix}-visibility`} name="visibility" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="private">Private — project team only</option><option value="public">Public — signed-in members can discover it</option></select>
      <p className="small-copy">A code only starts a join request. You approve who joins. Profile privacy permissions are still being validated before member rollout.</p>
      {project&&<><label htmlFor={`${prefix}-stage`}>Project stage</label><select id={`${prefix}-stage`} name="stage" value={stage} onChange={e=>setStage(e.target.value as ProjectCard['status'])}>{Object.entries(stages).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></>}
    </fieldset>
    {savedVersionChanged&&<p role="status">The saved project version changed while this editor was open. Keep a copy of your changes, then reload the saved version before editing.</p>}
    <button type="submit" className="button button-primary" disabled={pending||savedVersionChanged}>{pending?'Saving…':project?'Save project':'Create project'}</button>
    <Feedback state={state} elementRef={feedback} />
    {(state.status==='error'||savedVersionChanged)&&(project?<button type="button" className="button" onClick={()=>window.location.reload()}>Reload saved version (clears this form)</button>:<p>Keep a copy of your text before leaving. <Link href="/app/projects?view=mine">Check My projects</Link> before starting another project.</p>)}
  </form>;
}
export function ProjectJoinForm({accountId,initialCommandId}:{accountId:string;initialCommandId:string}) {
  const [code,setCode]=useState(''),[commandId,setCommandId]=useState(initialCommandId);
  const id=`join-code-${useId().replaceAll(':','')}`;
  const [state,formAction,pending]=useActionState(async(previous:ProjectActionState,form:FormData)=>{
    if(!buildProjectCommand(form)) return {status:'error',message:'Use the complete 32-character code shared by the creator.'} as ProjectActionState;
    try {const result=await changeProject(previous,form); if(result.status==='saved'){setCode('');setCommandId(crypto.randomUUID());} return result;} catch{return unknown;}
  },initial);
  const feedback=useFeedback(state);
  return <form action={formAction} className="project-form" aria-busy={pending}><input type="hidden" name="expected_account" value={accountId} /><input type="hidden" name="kind" value="join" /><input type="hidden" name="command_id" value={commandId} />
    <label htmlFor={id}>Project code</label><input id={id} name="code" required maxLength={80} autoComplete="off" autoCapitalize="characters" spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} disabled={pending} aria-describedby={`${id}-hint`} />
    <p className="small-copy" id={`${id}-hint`}>Ask the creator for their current code. In the isolated validation flow, private project details stay hidden until approval; shared Grow access rules are still unverified.</p>
    <button type="submit" className="button button-primary" disabled={pending}>{pending?'Sending…':'Request to join'}</button><Feedback state={state} elementRef={feedback} />
    {state.status==='saved'&&<Link className="text-link" href={state.projectId?`/app/projects/${state.projectId}`:'/app/projects?view=mine#your-project-requests'}>{state.projectId?'Open project':'View your requests'}</Link>}
  </form>;
}
export function ProjectSmallAction({accountId,kind,fields,initialCommandId,label,enabled=true}:{accountId:string;kind:Exclude<ProjectKind,'create'|'update'|'join'|'decide'>;fields:Record<string,string>;initialCommandId:string;label:string;enabled?:boolean}) {
  const router=useRouter(),[commandId,setCommandId]=useState(initialCommandId);
  const [state,formAction,pending]=useActionState(async(previous:ProjectActionState,form:FormData)=>{
    try {const result=await changeProject(previous,form);if(result.status==='saved'){setCommandId(crypto.randomUUID());if(kind==='leave')router.push('/app/projects?view=mine');}return result;}catch{return unknown;}
  },initial);
  const feedback=useFeedback(state);
  return <form action={formAction} className="project-small-action" aria-busy={pending}><input type="hidden" name="expected_account" value={accountId} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="command_id" value={commandId} />{Object.entries(fields).map(([key,value])=><input type="hidden" name={key} value={value} key={key} />)}
    {enabled&&<>{kind==='leave'&&<label className="project-confirm"><input type="checkbox" required /> I want to leave this team. Rejoining requires creator approval.</label>}<button className="button" type="submit" disabled={pending}>{pending?'Saving…':label}</button></>}<Feedback state={state} elementRef={feedback} />
  </form>;
}
export function ProjectRequestReview({accountId,requests,initialCommandId}:{accountId:string;requests:PendingProjectRequest[];initialCommandId:string}) {
  const [selection,setSelection]=useState<{id:string;revision:string}|null>(null),[commandId,setCommandId]=useState(initialCommandId);
  const validSelection=selection&&requests.some(r=>r.id===selection.id&&r.revision===selection.revision);
  const [state,formAction,pending]=useActionState(async(previous:ProjectActionState,form:FormData)=>{
    try {const result=await changeProject(previous,form);if(result.status==='saved'){setSelection(null);setCommandId(crypto.randomUUID());}return result;}catch{return unknown;}
  },initial);
  const feedback=useFeedback(state);
  return <form action={formAction} className="project-form" aria-busy={pending}><input type="hidden" name="expected_account" value={accountId} /><input type="hidden" name="kind" value="decide" /><input type="hidden" name="command_id" value={commandId} /><input type="hidden" name="expected_revision" value={selection?.revision??''} />
    {requests.length===0?<p>No pending requests.</p>:<fieldset disabled={pending}><legend>Choose a request to review</legend>{requests.map(r=><label className="project-request-choice" key={`${r.id}:${r.revision}`}><input type="radio" name="request_id" required value={r.id} checked={selection?.id===r.id&&selection.revision===r.revision} onChange={()=>setSelection({id:r.id,revision:r.revision})} /><span><strong>Request {r.id.slice(0,8).toUpperCase()}</strong><small>{new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(r.created_at))} IST</small></span></label>)}</fieldset>}
    {requests.length>0&&<div className="project-actions"><button className="button button-primary" type="submit" name="decision" value="approve" disabled={pending||!validSelection}>Approve request</button><button className="button" type="submit" name="decision" value="decline" disabled={pending||!validSelection}>Decline request</button></div>}
    <Feedback state={state} elementRef={feedback} />
  </form>;
}
export function ProjectJoinCode({code}:{code:string}) {
  const [copy,setCopy]=useState('');
  return <div className="project-code"><code>{code}</code><button type="button" className="button" onClick={async()=>{try{await navigator.clipboard.writeText(code);setCopy('Code copied.');}catch{setCopy('Select the code and copy it manually.');}}}>Copy code</button><span role="status">{copy}</span></div>;
}
