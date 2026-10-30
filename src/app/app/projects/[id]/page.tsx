import Link from 'next/link';
import { notFound } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { ArrowLeft,KeyRound } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { loadProject } from '@/features/projects/project-data';
import { isProjectId,stages } from '@/features/projects/project-contract';
import { ProjectTestNote,ProjectsUnavailable } from '@/features/projects/project-surfaces';
import { ProjectEditor,ProjectJoinCode,ProjectRequestReview,ProjectSmallAction } from '@/features/projects/project-forms';
export const metadata={title:'Project'};
export default async function ProjectPage({params}:{params:Promise<{id:string}>}) {
  const member=await requireMember();const {id}=await params;if(!isProjectId(id))notFound();
  const result=await loadProject(id);
  if(result.status==='unavailable')return <div className="workspace-page"><Link href="/app/projects" className="text-link">Back to projects</Link><ProjectsUnavailable /></div>;
  if(!result.data)notFound(); const {project,members,requests,pending_count,join_code}=result.data;
  const creator=project.relation==='creator',team=project.relation!=='none';
  return <div className="workspace-page"><Link className="text-link" href="/app/projects"><ArrowLeft size={18} aria-hidden="true" /> Projects</Link><span className="eyebrow">{creator?'YOUR PROJECT':team?'YOUR TEAM':'SIGNED-IN DISCOVERY'}</span><h1 className="project-detail-title" id="project-title" tabIndex={-1}>{project.title}</h1><ProjectTestNote />
    <div className="project-detail-meta"><span className="project-stage">{stages[project.status]}</span><span>{project.visibility==='public'?'Discoverable by signed-in members':project.visibility==='private'?'Private project':'Club restricted'}</span><span>{project.member_count} {project.member_count===1?'membership':'memberships'}</span></div>
    <section className="workspace-card project-description" aria-labelledby="project-about"><h2 id="project-about">What we’re building.</h2><p>{project.description||'No description has been added.'}</p></section>
    {!team&&<section className="workspace-card"><h2>Want to be part of it?</h2><p>Ask the creator for their project code. Sending a request does not grant membership automatically.</p><Link href="/app/projects/join" className="button button-primary"><KeyRound size={18} aria-hidden="true" /> Join with a code</Link></section>}
    {team&&<section className="workspace-card" aria-labelledby="project-team"><h2 id="project-team">The team.</h2><p className="small-copy">Member references omit profile fields from this view. Shared Grow account privacy rules remain under review.</p><ul className="project-team-list">{members.map(member=><li key={member.id}><strong>{member.is_self?'You':`Member ${member.id.slice(0,8).toUpperCase()}`}</strong><span>{member.role==='lead'?'Lead':member.role==='admin'?'Project admin':member.role==='mentor'?'Mentor':'Member'}</span></li>)}</ul>{project.member_count>50&&<p className="small-copy">Showing the first 50 memberships, ordered by join time.</p>}{creator?<p className="small-copy">As creator, you remain the project lead. Ownership transfer is not available here.</p>:<ProjectSmallAction key={`${member.user.id}:${project.id}`} accountId={member.user.id} kind="leave" fields={{project_id:project.id}} label="Leave project" initialCommandId={randomUUID()} />}</section>}
    {creator&&<>
      <section className="workspace-card" aria-labelledby="project-code-title"><h2 id="project-code-title">Invite a new perspective.</h2><p>Share this code with someone you want to consider for the team. They still need your approval.</p><ProjectJoinCode code={join_code!} /><details className="project-details"><summary>Replace the join code</summary><p>The previous code will stop accepting new requests. Existing requests remain pending.</p><ProjectSmallAction key={`${member.user.id}:${project.id}`} accountId={member.user.id} kind="rotate_code" fields={{project_id:project.id,expected_revision:project.revision}} initialCommandId={randomUUID()} label="Generate a new code" /></details></section>
      <section className="workspace-card" aria-labelledby="project-pending-title"><h2 id="project-pending-title">Review join requests.</h2><p>{pending_count} pending {pending_count===1?'request':'requests'}. Only you, the creator, can approve or decline.</p>{pending_count>20&&<p className="small-copy">Showing the oldest 20 pending requests. More become available as you review them.</p>}<ProjectRequestReview key={`${member.user.id}:${project.id}`} accountId={member.user.id} requests={requests} initialCommandId={randomUUID()} /></section>
      <section className="workspace-card project-editor-panel"><details className="project-details"><summary>Edit project details & stage</summary><ProjectEditor key={`${member.user.id}:${project.id}`} accountId={member.user.id} project={project} initialCommandId={randomUUID()} /></details></section>
    </>}
  </div>;
}
