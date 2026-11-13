import 'server-only';
import { UsersRound } from 'lucide-react';
import { validationFeatureEnabled } from '@/lib/config';
import { requireMember } from '@/lib/member';
import { serverClient } from '@/lib/supabase';
import { LabPresenceUnavailable } from './workspace-arcade';

async function loadPresence(): Promise<{ count: number; names: string[] } | null> {
  if (!validationFeatureEnabled('ownVisits')) return null;
  await requireMember();
  const client = await serverClient();
  if (!client) return null;
  try {
    const { data, error } = await client.rpc('get_lab_presence_v1');
    if (error || !data || typeof data !== 'object') return null;
    const { count, names } = data;
    if (!Number.isSafeInteger(count) || count < 0 || !Array.isArray(names) ||
      names.length !== Math.min(count, 30) ||
      !names.every(name => typeof name === 'string' && name.trim() && [...name].length <= 200)) return null;
    return { count, names };
  } catch {
    return null;
  }
}

export async function LabPresence() {
  const presence = await loadPresence();
  if (!presence) return <LabPresenceUnavailable />;
  return <section className="workspace-card" data-reveal="section" aria-labelledby="presence-heading">
    <UsersRound size={22} aria-hidden="true" />
    <h2 id="presence-heading">Who’s here now?</h2>
    <p>{presence.count === 0 ? 'Nobody is checked in.' : `${presence.count} checked in`}</p>
    {presence.names.length > 0 && <ul>{presence.names.map((name, index) => <li key={index}>{name}</li>)}</ul>}
    {presence.count > presence.names.length && <p>Showing {presence.names.length} names.</p>}
  </section>;
}
