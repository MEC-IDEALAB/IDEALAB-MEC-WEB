import Link from 'next/link';
import { loadWorkRequests } from './work-request-data';
import { requestServices } from './request-services';
import type { RequestCursor } from './work-request-contract';
export const requestDate=(time:string)=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(time));
export function RequestTestNote(){return <p className="notice">Isolated test records only. No head notification or staff review is connected.</p>;}
export async function SubmittedRequests({cursor,invalid=false}:{cursor:RequestCursor|null;invalid?:boolean}){
  const result=invalid?null:await loadWorkRequests(cursor);
  const next=result?.status==='ready'?result.data.cursor:null;
  return <section className="draft-panel" aria-labelledby="submitted-heading"><span className="eyebrow">SAVED ONLINE</span><h2 id="submitted-heading">Submitted requests</h2><RequestTestNote/>
    {invalid?<p role="alert">This page link is invalid. <Link href="/app/requests">Return to the first page</Link>.</p>:result?.status!=='ready'?<p role="status">Your submitted requests couldn’t be loaded. Refresh before submitting again; existing records may still be saved.</p>:result.data.items.length===0?<p>No submitted requests on this page.</p>:<ul className="submitted-request-list">{result.data.items.map(r=><li key={r.id}><Link href={`/app/requests/${r.id}`}><span className="eyebrow">{r.status==='submitted'?'Submitted':'Cancelled'} · {r.kind==='machine'?'Machine':'Operations'}</span><h3>{r.title}</h3><p>{requestServices[r.kind].find(s=>s.id===r.service_id)?.label}</p><time dateTime={r.created_at}>{requestDate(r.created_at)} IST</time></Link></li>)}</ul>}
    {next&&<Link className="button" href={`/app/requests?${new URLSearchParams({before:next.created_at,cursor:next.id})}`}>Older requests</Link>}
  </section>;
}
