import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { loadPublicProfile } from '@/features/profile/public-profile-data';
import { ThemePicker } from '@/components/theme-picker';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Member profile · IDEALAB MEC', robots: { index: false, follow: false } };

export default async function SharedProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await loadPublicProfile(id);
  if (!profile) notFound();
  return <main id="main-content" className="public-member-profile"><div className="button-row"><Link className="text-link" href="/">IDEALAB MEC</Link><ThemePicker /></div>
    <article className="public-member-profile-card"><span className="workspace-pixel-label">A CURIOUS MIND / MEC</span><h1>{profile.display_name || 'Lab member'}</h1>
      {profile.bio && <p>{profile.bio}</p>}
      {profile.interests.length > 0 && <section aria-labelledby="public-interests"><h2 id="public-interests">Interests</h2><p>Self-selected interests, not verified awards or machine permissions.</p><ul className="public-member-tags">{profile.interests.map(item => <li key={item}>{item}</li>)}</ul></section>}
      {profile.skills.length > 0 && <section aria-labelledby="public-skills"><h2 id="public-skills">Skills</h2><p>Described by this member.</p><ul className="public-member-tags">{profile.skills.map(item => <li key={item}>{item}</li>)}</ul></section>}
      {profile.links.length > 0 && <section aria-labelledby="public-links"><h2 id="public-links">Around the web</h2><ul className="public-member-links">{profile.links.map((link, index) => <li key={index}><a href={link.url} rel="nofollow noreferrer noopener" target="_blank">{link.label}<ArrowUpRight size={18} aria-hidden="true" /><span className="sr-only">Opens in a new tab</span></a></li>)}</ul></section>}
    </article>
  </main>;
}
