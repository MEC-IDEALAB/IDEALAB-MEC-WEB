import { notFound } from 'next/navigation';
import { Radio } from 'lucide-react';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';
import { MemberSignalArt } from '@/components/member-signal-art';
import { EventDraftEditor } from '@/features/events/event-draft-editor';
import '@/app/app/events/manage/event-manager.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Event studio visual preview', robots: { index: false, follow: false } };
export default function EventStudioPreview() {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  return <MemberWorkspaceShell variant="preview" activeScreen="lab" activeLabel="Event studio visual preview"><div className="workspace-page event-manager-page">
    <header className="event-manager-hero"><div><span className="eyebrow">EVENT STUDIO / VISUAL PREVIEW</span><h1>Make room<br />for what’s next.</h1><p>Draft privately. Review the details. Bring people together.</p></div><div className="event-manager-art"><Radio size={26} aria-hidden="true" /><MemberSignalArt variant="home" /></div></header>
    <p className="notice">Visual preview only. No account, event assignment, save or publication is connected.</p>
    <section className="event-manager-panel"><h2>Start with a spark.</h2><EventDraftEditor preview accountId="00000000-0000-0000-0000-000000000002" scopeId="20000000-0000-0000-0000-000000000001" draft={null} /></section>
  </div></MemberWorkspaceShell>;
}
