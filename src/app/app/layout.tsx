import { LogOut } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { signOut } from '@/app/auth/actions';
import { loadOwnVisits } from '@/lib/visits';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';
import { ActiveSessionReminder } from '@/components/active-session-reminder';
import { randomUUID } from 'node:crypto';
import { Suspense } from 'react';
export const dynamic = 'force-dynamic';

async function ActiveSessionReminderSlot({ accountId }: { accountId: string }) {
  const visits = await loadOwnVisits();
  const activeVisit = visits.status === 'ready' ? visits.visits.find(visit => visit.checkout_time === null) : undefined;
  return activeVisit ? <ActiveSessionReminder key={activeVisit.id} accountId={accountId} visitId={activeVisit.id} checkinTime={activeVisit.checkin_time} commandId={randomUUID()} /> : null;
}

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  // requireMember also guards individual page/data callers; the layout is not
  // the authorization boundary for concurrently rendered children.
  return <MemberWorkspaceShell signOutControl={<form action={signOut}><input type="hidden" name="expected_account" value={member.user.id} /><button type="submit"><LogOut size={18} aria-hidden="true" /><span>Sign out</span></button></form>} activeSessionReminder={<Suspense fallback={null}><ActiveSessionReminderSlot accountId={member.user.id} /></Suspense>}>{children}</MemberWorkspaceShell>;
}
