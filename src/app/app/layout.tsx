import { LogOut } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { signOut } from '@/app/auth/actions';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';
export const dynamic = 'force-dynamic';
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  // requireMember also guards individual page/data callers; the layout is not
  // the authorization boundary for concurrently rendered children.
  return <MemberWorkspaceShell signOutControl={<form action={signOut}><input type="hidden" name="expected_account" value={member.user.id} /><button type="submit"><LogOut size={18} aria-hidden="true" /><span>Sign out</span></button></form>}>{children}</MemberWorkspaceShell>;
}
