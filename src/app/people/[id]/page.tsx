import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicProfileContent } from '@/features/profile/public-profile-content';
import { loadPublicProfile } from '@/features/profile/public-profile-data';
import { ThemePicker } from '@/components/theme-picker';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Member profile · IDEALAB MEC', robots: { index: false, follow: false } };

export default async function SharedProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await loadPublicProfile(id);
  if (!profile) notFound();
  return <main id="main-content" className="public-member-profile"><div className="button-row"><Link className="text-link" href="/">IDEALAB MEC</Link><ThemePicker /></div>
    <PublicProfileContent profile={profile} />
  </main>;
}
