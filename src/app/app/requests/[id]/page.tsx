import Link from 'next/link';
import { notFound } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { requireMember } from '@/lib/member';
import { loadWorkRequest } from '@/features/requests/work-request-data';
import { requestId } from '@/features/requests/work-request-contract';
import { requestServices } from '@/features/requests/request-services';
import { requestDate,RequestTestNote } from '@/features/requests/submitted-requests';
import { RequestCancel } from '@/features/requests/request-cancel';
import { referenceError } from '@/features/requests/draft-storage';
export const metadata={title:'Your work request'};
export default async function WorkRequestDetail({params}:{params:Promise<{id:string}>}){
  const member=await requireMember();const {id}=await params;if(!requestId(id))notFound();
  const result=await loadWorkRequest(id);
  if(result.status!=='ready')return <div className="workspace-page"><Link href="/app/requests" className="text-link">Work requests</Link><h1>This request couldn’t be loaded.</h1><p>Refresh before trying another action. Your saved record has not been changed.</p></div>;
  const r=result.data;if(!r)notFound();
  return <div className="workspace-page work-request-detail"><Link href="/app/requests" className="text-link">Work requests</Link><span className="eyebrow">{r.kind==='machine'?'MACHINE WORK':'OPERATIONS SUPPORT'}</span><h1>{r.title}</h1><RequestTestNote/>
    <section className="workspace-card"><h2>{r.status==='submitted'?'Submitted for testing':'Cancelled'}</h2><p>{requestServices[r.kind].find(s=>s.id===r.service_id)?.label}</p><p>Created <time dateTime={r.created_at}>{requestDate(r.created_at)} IST</time></p><p>Reference {r.id.slice(0,8).toUpperCase()}</p><h3>What you need</h3><p className="request-long-text">{r.description}</p>{r.technical_details&&<><h3>Technical details</h3><p className="request-long-text">{r.technical_details}</p></>}
    <h3>Preferred time</h3><p>{r.preferred_at?`${requestDate(r.preferred_at)} IST`:'Not specified'}. Provisional only; this is not an agreed time or reservation.</p>
    {r.references.length>0&&<><h3>Reference links</h3><ul className="reference-list">{r.references.map((link,i)=><li key={`${i}:${link}`}>{referenceError([link])?<span>{link} — this link cannot be opened. Its original text is kept.</span>:<a href={link} target="_blank" rel="noreferrer">{link}</a>}</li>)}</ul></>}
    </section><section className="workspace-card"><h2>Request history</h2><ol className="request-history">{r.history.map((event,i)=><li key={i}><strong>{event.status==='submitted'?'Submitted':'Cancelled'}</strong><time dateTime={event.recorded_at}>{requestDate(event.recorded_at)} IST</time></li>)}</ol></section>
    <section className="workspace-card"><RequestCancel key={`${member.user.id}:${r.id}`} accountId={member.user.id} id={r.id} revision={r.revision} canCancel={r.can_cancel&&process.env.ACCOUNT_ENVIRONMENT==='validation'&&process.env.ENABLE_WORK_REQUEST_INTAKE==='true'} initialCommandId={randomUUID()}/>{r.status==='cancelled'?<p>This request is cancelled. Its history remains available.</p>:!r.can_cancel&&<p>Direct cancellation is unavailable after head involvement. Reasoned cancellation and staff decisions are not connected in this test release.</p>}</section>
  </div>;
}
