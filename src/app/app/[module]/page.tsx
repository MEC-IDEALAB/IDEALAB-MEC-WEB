import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CircleDashed } from 'lucide-react';
import { requireMember } from '@/lib/member';
const modules: Record<string, { title: string; description: string; state: string }> = {
  notifications: { title: 'Your notifications', description: 'Updates that keep your work moving.', state: 'Notifications are being connected. No live updates are available here yet.' },
};
export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  await requireMember();
  const { module } = await params;
  const item = modules[module]; if (!item) notFound();
  return <div className="workspace-page"><Link className="text-link" href="/app"><ArrowLeft size={18} /> Your space</Link><h1>{item.title}</h1><p>{item.description}</p><section className="empty-state"><CircleDashed size={42} aria-hidden="true" /><h2>Not connected yet</h2><p>{item.state}</p><a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a></section></div>;
}
