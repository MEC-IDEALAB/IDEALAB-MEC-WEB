import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { ArrowLeft } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { ProjectCreate } from '@/features/projects/project-create';
import { ProjectTestNote } from '@/features/projects/project-surfaces';
import { projectCoreEnabled } from '@/features/projects/project-config';
export const metadata={title:'Start a project'};
export default async function NewProjectPage() {
  const member=await requireMember(); return <div className="workspace-page"><Link className="text-link" href="/app/projects"><ArrowLeft size={18} aria-hidden="true" /> Projects</Link><span className="eyebrow">FROM THE FIRST SKETCH</span><h1>Give your idea a home.</h1><p>You’ll be the creator and lead. Share a code when you’re ready to review join requests.</p><ProjectTestNote /><section className="workspace-card project-editor-panel">{projectCoreEnabled()?<ProjectCreate key={member.user.id} accountId={member.user.id} initialCommandId={randomUUID()} />:<p>Project creation is not available in this environment yet.</p>}</section><p className="small-copy">Project media uploads and ownership transfer are not available in this flow.</p></div>;
}
