import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { loadProjects } from './project-data';
import { ProjectCards, ProjectTestNote } from './project-surfaces';

/** Reuses the same owner-scoped projection as My projects. */
export async function RecentProjects() {
  const projects = await loadProjects('mine', '', null);
  return <section className="recent-projects" aria-labelledby="recent-projects-title">
    <div className="workspace-section-heading"><h2 id="recent-projects-title">Your ideas in motion.</h2><Link className="text-link" href="/app/projects?view=mine">My projects <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    <ProjectTestNote />
    {projects.status === 'unavailable' ? <div className="workspace-card" role="status"><h3>Your projects couldn’t be loaded.</h3><p>Open My projects to check again. Your saved work has not been changed.</p></div>
      : projects.data.items.length === 0 ? <div className="workspace-card"><h3>Make room for your first idea.</h3><p>Start a project or ask its creator for a code to request a place on the team.</p><div className="project-actions"><Link className="button button-primary" href="/app/projects/new"><Plus size={18} aria-hidden="true" /> Start a project</Link><Link className="button" href="/app/projects/join">Join with a code</Link></div></div>
      : <><p className="small-copy">Up to three of your most recently updated projects. Open My projects for the full list.</p><ProjectCards items={projects.data.items.slice(0, 3)} /></>}
  </section>;
}
