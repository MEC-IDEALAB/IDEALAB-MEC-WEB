import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, CircleDashed } from 'lucide-react';
import { requireMember } from '@/lib/member';
const modules: Record<string, { title: string; description: string; state: string }> = {
  requests: { title: 'Your work requests', description: 'Machine work and Operations support, with a clear next step.', state: 'Online submission and request history are not connected yet. You can prepare a request on this device.' },
  events: { title: 'Events & workshops', description: 'Learn something. Make something. Meet your people.', state: 'Event listings and registration are being connected. Contact the lab for the current programme.' },
  notifications: { title: 'Your notifications', description: 'Updates that keep your work moving.', state: 'Notifications are being connected. No live updates are available here yet.' },
};
export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  await requireMember();
  const { module } = await params;
  const item = modules[module]; if (!item) notFound();
  return <div className="workspace-page"><Link className="text-link" href="/app"><ArrowLeft size={18} /> Your space</Link><h1>{item.title}</h1><p>{item.description}</p><section className="empty-state"><CircleDashed size={42} aria-hidden="true" /><h2>Not connected yet</h2><p>{item.state}</p>{module === 'requests' ? <Link className="button button-primary" href="/app/requests/new">Prepare a request <ArrowUpRight size={18} /></Link> : <a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a>}</section></div>;
}
