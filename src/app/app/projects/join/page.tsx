import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { ArrowLeft } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { ProjectJoinForm } from '@/features/projects/project-forms';
import { ProjectTestNote } from '@/features/projects/project-surfaces';
import { projectCoreEnabled } from '@/features/projects/project-config';
export const metadata={title:'Join a project'};
export default async function JoinProjectPage() {
  const member=await requireMember();return <div className="workspace-page"><Link className="text-link" href="/app/projects"><ArrowLeft size={18} aria-hidden="true" /> Projects</Link><span className="eyebrow">FIND YOUR PEOPLE</span><h1>A code. A conversation.<br />A place on the team.</h1><p>Request to join using a code shared by the project creator. They decide who joins.</p><ProjectTestNote /><section className="workspace-card project-editor-panel">{projectCoreEnabled()?<ProjectJoinForm key={member.user.id} accountId={member.user.id} initialCommandId={randomUUID()} />:<p>Project joining is not available in this environment yet.</p>}</section></div>;
}
