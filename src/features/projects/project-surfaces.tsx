import Link from 'next/link';
import { ArrowUpRight,FolderKanban,LockKeyhole,UsersRound } from 'lucide-react';
import { randomUUID } from 'node:crypto';
import { stages,type ProjectCard,type OwnProjectRequest } from './project-contract';
import { ProjectSmallAction } from './project-forms';
export function ProjectTestNote() { return process.env.ACCOUNT_ENVIRONMENT==='validation'?<p className="project-test-note">Isolated test workspace · these are not the live Grow project records.</p>:null; }
export function ProjectsUnavailable() { return <section className="workspace-card" role="status"><h2>Projects couldn’t be loaded.</h2><p>Refresh to try again. An unavailable connection does not mean there are no projects or requests.</p></section>; }
export function ProjectCards({items}:{items:ProjectCard[]}) {
  return <div className="project-card-grid">{items.map(project=><Link className="project-discovery-card" key={project.id} href={`/app/projects/${project.id}`}>
    <div className="project-card-heading"><FolderKanban size={28} aria-hidden="true" /><span className="project-stage">{stages[project.status]}</span><ArrowUpRight size={20} aria-hidden="true" /></div>
    <h2>{project.title}</h2><p>{project.description||'No description has been added.'}</p><div className="project-card-footer"><span>{project.visibility==='private'?<LockKeyhole size={15} aria-hidden="true" />:<UsersRound size={15} aria-hidden="true" />}{project.visibility==='public'?'Signed-in discovery':project.visibility==='private'?'Private team':'Club restricted'}</span><span>{project.member_count} {project.member_count===1?'membership':'memberships'}</span></div>
    {project.relation!=='none'&&<span className="project-relation">{project.relation==='creator'?'Your project':'Your team'}</span>}
  </Link>)}</div>;
}
export function OwnProjectRequests({accountId,requests}:{accountId:string;requests:OwnProjectRequest[]}) {
  return <section className="workspace-card project-own-requests" id="your-project-requests" aria-labelledby="project-requests-title"><h2 id="project-requests-title">Your join requests</h2>
    {requests.length===0?<p>You have no join requests in this workspace.</p>:<><ul>{requests.map(request=><li key={request.id}><div><span className="eyebrow">REQUEST {request.id.slice(0,8).toUpperCase()}</span><h3>{request.project_title||'Private project — details protected'}</h3><p>Status: <strong>{request.status}</strong></p>{request.project_id&&<Link className="text-link" href={`/app/projects/${request.project_id}`}>Open project <ArrowUpRight size={15} aria-hidden="true" /></Link>}</div><ProjectSmallAction key={`${accountId}:${request.id}`} accountId={accountId} kind="cancel" enabled={request.status==='pending'} fields={{request_id:request.id,expected_revision:request.revision}} label="Withdraw request" initialCommandId={randomUUID()} /></li>)}</ul>{requests.length===20&&<p className="small-copy">Showing your 20 most recently updated requests.</p>}</>}
  </section>;
}
