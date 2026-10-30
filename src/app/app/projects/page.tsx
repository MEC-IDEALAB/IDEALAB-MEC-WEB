import Link from 'next/link';
import { ArrowLeft,ArrowRight,Plus,KeyRound,Search } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { loadProjects,loadOwnProjectRequests } from '@/features/projects/project-data';
import { isProjectId,isProjectTime,type ProjectCursor } from '@/features/projects/project-contract';
import { ProjectCards,ProjectTestNote,ProjectsUnavailable,OwnProjectRequests } from '@/features/projects/project-surfaces';
import { projectCoreEnabled } from '@/features/projects/project-config';
export const metadata={title:'Projects'};
export default async function ProjectsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const member=await requireMember(); const params=await searchParams;
  const view=params.view==='mine'?'mine':'discover';
  const query=typeof params.q==='string'?params.q.trim():'';
  let cursor:ProjectCursor|null=null;
  const invalid=query.length>100 || (params.before!==undefined||params.cursor!==undefined) && (!isProjectTime(params.before)||!isProjectId(params.cursor));
  if(!invalid&&isProjectTime(params.before)&&isProjectId(params.cursor))cursor={updated_at:params.before,id:params.cursor};
  const [projects,requests]=await Promise.all([invalid?Promise.resolve({status:'unavailable' as const,data:null}):loadProjects(view,query,cursor),loadOwnProjectRequests()]);
  const next=projects.status==='ready'&&projects.data.cursor?`/app/projects?${new URLSearchParams({view,q:query,before:projects.data.cursor.updated_at,cursor:projects.data.cursor.id})}`:null;
  return <div className="workspace-page"><Link className="text-link" href="/app/lab"><ArrowLeft size={18} aria-hidden="true" /> Back to the lab</Link><span className="eyebrow">IDEAS NEED PEOPLE</span><h1>Make it a project.</h1><p>Discover what members are building, start your own idea and ask to join a team.</p><ProjectTestNote />
    {projectCoreEnabled()&&<div className="project-actions"><Link className="button button-primary" href="/app/projects/new"><Plus size={18} aria-hidden="true" /> Start a project</Link><Link className="button" href="/app/projects/join"><KeyRound size={18} aria-hidden="true" /> Join with a code</Link></div>}
    <nav className="project-view-tabs" aria-label="Project lists"><Link aria-current={view==='discover'?'page':undefined} href="/app/projects">Discover</Link><Link aria-current={view==='mine'?'page':undefined} href="/app/projects?view=mine">My projects</Link></nav>
    <form className="project-search" action="/app/projects" method="get"><input type="hidden" name="view" value={view} /><label htmlFor="project-search">Search project titles</label><div><input id="project-search" name="q" maxLength={100} defaultValue={query} /><button className="button" type="submit"><Search size={17} aria-hidden="true" /> Search</button></div></form>
    {invalid?<section className="workspace-card" role="alert"><p>This search or page link is invalid. <Link href={`/app/projects?view=${view}`}>Start from the first page</Link>.</p></section>:projects.status==='unavailable'?<ProjectsUnavailable />:projects.data.items.length===0?<section className="project-empty workspace-card"><h2>{query?'No matching projects.':view==='mine'?'Your next idea starts here.':'No projects to discover yet.'}</h2><p>{query?'Try another title or clear the search.':view==='mine'?'Create a project or ask a creator for their join code.':'Public projects will appear here when members choose to share them with signed-in discovery.'}</p></section>:<ProjectCards items={projects.data.items} />}
    {next&&<Link className="button" href={next}>Next projects <ArrowRight size={18} aria-hidden="true" /></Link>}
    {requests.status==='ready'?<OwnProjectRequests accountId={member.user.id} requests={requests.data} />:<section className="workspace-card" role="status"><h2>Your requests couldn’t be loaded.</h2><p>Refresh before sending another request; your existing requests may still be pending.</p></section>}
  </div>;
}
