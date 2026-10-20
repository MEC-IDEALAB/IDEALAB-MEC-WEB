import Link from 'next/link';
import { Home, FlaskConical, UserRound, ArrowUpRight, Bell, LogOut } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { signOut } from '@/app/auth/actions';
export const dynamic = 'force-dynamic';
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  if (member.profileState !== 'ready') return <main className="section narrow"><span className="eyebrow">ACCOUNT ACCESS</span><h1>{member.profileState === 'inactive' ? 'Account access is paused.' : 'Your profile isn’t available yet.'}</h1><p>Please contact the lab team to check your account before continuing.</p><a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a><form action={signOut}><button className="button" type="submit">Sign out</button></form></main>;
  return <div className="member-shell"><aside className="member-sidebar"><Link className="member-brand" href="/app">IDEALAB <span>MEC</span></Link><span className="eyebrow">YOUR SPACE</span><nav aria-label="Member navigation"><Link href="/app"><Home size={20} /> Home</Link><Link href="/app/lab"><FlaskConical size={20} /> Lab</Link><Link href="/app/profile"><UserRound size={20} /> Profile</Link><hr /><Link href="/app/requests">Work requests <ArrowUpRight size={16} /></Link><Link href="/app/projects">Projects <ArrowUpRight size={16} /></Link><Link href="/app/events">Events <ArrowUpRight size={16} /></Link></nav><div className="sidebar-bottom"><Link href="/">Visit public website</Link><form action={signOut}><button type="submit" className="text-link"><LogOut size={16} /> Sign out</button></form></div></aside><div className="member-body"><header className="member-topbar"><span>IDEA Lab / Fab Lab</span><Link href="/app/notifications" aria-label="Notifications"><Bell size={22} /></Link></header><main id="main-content">{children}</main></div></div>;
}
