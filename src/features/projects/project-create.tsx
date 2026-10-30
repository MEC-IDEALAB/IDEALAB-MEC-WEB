'use client';
import Link from 'next/link';
import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {changeProject,findConfirmedProjectCreate} from '@/app/app/projects/actions';
import {buildProjectCommand} from './project-command';
import {clearConfirmedCreate,markPendingCreate,preparePendingCreate,projectMarkers,readPendingCreate,type CreatePayload,type PendingCreate} from './pending-create';

/** A saved pending command is retried with its original payload, never edited text. */
export function ProjectCreate({accountId,initialCommandId,preview=false}:{accountId:string;initialCommandId:string;preview?:boolean}) {
  const router=useRouter(),id=`create-${useId().replaceAll(':','')}`;
  const scope=preview?'preview':'validation';
  const [checking,setChecking]=useState(true),[sending,setSending]=useState(false),[unavailable,setUnavailable]=useState(false);
  const [pending,setPending]=useState<PendingCreate|null>(null),[markers,setMarkers]=useState<string[]>([]),[message,setMessage]=useState(''),[confirmed,setConfirmed]=useState<string|null>(null);
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[visibility,setVisibility]=useState('private');
  const [savedCopy,setSavedCopy]=useState<CreatePayload|null>(null);
  const account=useRef<string|null>(accountId),busy=useRef(false);
  const feedback=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{if(message)feedback.current?.focus();},[message]);
  useLayoutEffect(()=>{account.current=accountId;return()=>{account.current=null;};},[accountId]);
  useEffect(()=>{let active=true;void readPendingCreate(accountId,scope).then(result=>{if(!active)return;
    setPending(result.status==='ready'?result.pending:null);setUnavailable(result.status==='unavailable');
    setMarkers(result.status==='unavailable'?projectMarkers(accountId,scope):[]);setChecking(false);
  });return()=>{active=false;};},[accountId,scope]);
  async function send(item:PendingCreate) {
    if(account.current!==item.accountId)return;
    if(preview){setMessage('Design preview only. No project was submitted.');return;}
    if(!markPendingCreate(item,scope)){setSavedCopy(item.payload);setPending(null);setUnavailable(true);setMarkers(projectMarkers(accountId,scope));setMessage('This browser could not save a retry marker. No new attempt was sent; an earlier attempt may still be pending.');return;}
    const form=new FormData();form.set('expected_account',item.accountId);form.set('command_id',item.commandId);
    for(const [key,value] of Object.entries(item.payload))form.set(key,value);
    try {const result=await changeProject({status:'idle',message:''},form);if(account.current!==item.accountId)return;
      if(result.status==='saved'&&result.projectId){const cleared=await clearConfirmedCreate(item.accountId,item.commandId,scope);if(account.current!==item.accountId)return;
        if(cleared)router.push(`/app/projects/${result.projectId}`);else {setConfirmed(result.projectId);setMessage('Your project was saved, but this browser could not clear the retry record. Open your project or retry the saved submission to clear it.');}}
      else setMessage('We could not confirm creation. Check My projects or retry the saved submission with the same details.');
    }catch{if(account.current===item.accountId)setMessage('We could not confirm creation. Check My projects or retry the saved submission with the same details.');}
  }
  async function create(form:FormData) {
    if(checking||unavailable||pending||busy.current)return;
    form.set('command_id',initialCommandId);form.set('kind','create');
    const input=buildProjectCommand(form);
    if(!input||input.kind!=='create'){setMessage('Check the title, description and visibility.');return;}
    busy.current=true;setSending(true);
    try {const result=await preparePendingCreate(accountId,initialCommandId,input.p_command as CreatePayload,scope);
      if(account.current!==accountId)return;
      if(result.status!=='ready'){setUnavailable(true);setMarkers(projectMarkers(accountId,scope));setMessage('This browser could not safely save a retry. No new attempt was sent; check My projects for earlier attempts.');return;}
      setPending(result.pending);
      if(JSON.stringify(result.pending.payload)!==JSON.stringify(input.p_command)){setMessage('An earlier creation is unresolved. Review and retry the saved submission before sending a different project.');return;}
      await send(result.pending);
    }finally{busy.current=false;if(account.current===accountId)setSending(false);}
  }
  async function retry() {
    if(busy.current)return;busy.current=true;setSending(true);
    try {const result=await readPendingCreate(accountId,scope);if(account.current!==accountId)return;
      if(result.status!=='ready'){if(pending)setSavedCopy(pending.payload);setPending(null);setUnavailable(true);setMarkers(projectMarkers(accountId,scope));setMessage('The saved submission is unavailable. Check My projects.');return;}
      setPending(result.pending);await send(result.pending);
    }finally{busy.current=false;if(account.current===accountId)setSending(false);}
  }
  async function recover(marker:string) {
    if(preview){setMessage('Design preview only. No submission was checked.');return;}
    if(busy.current)return;busy.current=true;setSending(true);
    try {const project=await findConfirmedProjectCreate(accountId,marker);if(account.current!==accountId)return;
      if(!project){setMessage('The earlier creation is not confirmed yet. It may still be in progress; check My projects and try again later.');return;}
      if(!await clearConfirmedCreate(accountId,marker,scope)){setMessage('A project was found, but its browser marker could not be cleared. Check My projects.');return;}
      if(account.current===accountId)router.push(`/app/projects/${project}`);
    }catch{if(account.current===accountId)setMessage('We could not confirm the earlier creation. Check My projects and try again later.');}
    finally{busy.current=false;if(account.current===accountId)setSending(false);}
  }
  return <div className="project-form" aria-busy={checking||sending}>
    {checking?<p role="status">Checking for an unfinished submission…</p>:pending?<section className="notice" aria-label="Unresolved project creation"><h2>Review the saved submission</h2><p>An earlier creation may already have been saved. Retry sends these exact details with the same command.</p><p><strong>{pending.payload.title}</strong></p><p>{pending.payload.description}</p><p>Visibility: {pending.payload.visibility}</p>{(title||description)&&(title.trim()!==pending.payload.title||description.trim()!==pending.payload.description||visibility!==pending.payload.visibility)&&<><p>Your other idea was not sent. Copy it before leaving this page.</p><label htmlFor={`${id}-other-title`}>Your other title</label><input id={`${id}-other-title`} readOnly value={title} /><label htmlFor={`${id}-other-description`}>Your other description</label><textarea id={`${id}-other-description`} readOnly rows={5} value={description} /><p>Other visibility: {visibility}</p></>}<button type="button" className="button button-primary" onClick={retry} disabled={sending}>{sending?'Checking…':'Retry saved submission'}</button></section>:unavailable?<section className="notice"><h2>Check your earlier submission</h2><p>This browser cannot safely recover the saved creation. Check My projects before creating another project.</p>{savedCopy&&<><p>Copy the saved submission before leaving this page.</p><label htmlFor={`${id}-saved-title`}>Saved submission title</label><input id={`${id}-saved-title`} readOnly value={savedCopy.title} /><label htmlFor={`${id}-saved-description`}>Saved submission description</label><textarea id={`${id}-saved-description`} readOnly rows={5} value={savedCopy.description} /><p>Saved visibility: {savedCopy.visibility}</p></>}{(title||description)&&<><p>Copy your entered details before leaving this page. They are kept here only while this page remains open.</p><label htmlFor={`${id}-copy-title`}>Your title</label><input id={`${id}-copy-title`} readOnly value={title} /><label htmlFor={`${id}-copy-description`}>Your description</label><textarea id={`${id}-copy-description`} readOnly rows={5} value={description} /><p>Visibility: {visibility}</p></>}{markers.map(marker=><button key={marker} type="button" className="button" disabled={sending} onClick={()=>recover(marker)}>Check saved submission {marker.slice(0,8)}</button>)}</section>:<form method="post" onSubmit={event=>{event.preventDefault();void create(new FormData(event.currentTarget));}}><fieldset disabled={sending}><legend>Start with the idea.</legend>
      <label htmlFor={`${id}-title`}>Project title</label><input id={`${id}-title`} name="title" required maxLength={320} value={title} onChange={event=>setTitle(event.target.value)} />
      <label htmlFor={`${id}-description`}>What are you building?</label><textarea id={`${id}-description`} name="description" required rows={5} maxLength={8000} value={description} onChange={event=>setDescription(event.target.value)} /><p className="small-copy">Avoid contact details and other sensitive information.</p>
      <label htmlFor={`${id}-visibility`}>Who can discover it?</label><select id={`${id}-visibility`} name="visibility" value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="private">Private — project team only</option><option value="public">Public — signed-in members can discover it</option></select>
      <p className="small-copy">A code only starts a join request. You approve who joins. Profile privacy permissions are still being validated before member rollout.</p></fieldset><button type="submit" className="button button-primary" disabled={sending}>{sending?'Saving…':'Create project'}</button></form>}
    {message&&<p ref={feedback} tabIndex={-1} role="alert" className="project-feedback">{message}</p>}{confirmed&&<Link className="button" href={`/app/projects/${confirmed}`}>Open saved project</Link>}<noscript><p>Turn on JavaScript to safely save and retry a project submission.</p></noscript><p className="small-copy"><Link href="/app/projects?view=mine">Check My projects</Link>. Saved retry details stay in this browser; avoid using a shared device.</p>
  </div>;
}
