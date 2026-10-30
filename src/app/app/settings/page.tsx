import Link from 'next/link';
import { ArrowRight, LockKeyhole, Settings2 } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';
import { requireMember } from '@/lib/member';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await requireMember();

  return (
    <div className="workspace-page">
      <span className="eyebrow">YOUR WORKSPACE</span>
      <h1>Settings.</h1>
      <p>Set the appearance for this device and review the account options available in this release.</p>

      <section className="member-settings-card" aria-labelledby="settings-appearance-title">
        <div>
          <span className="eyebrow">APPEARANCE</span>
          <h2 id="settings-appearance-title">Choose your theme</h2>
          <p>The light and dark control saves your choice on this device. It does not change account data.</p>
        </div>
        <ThemePicker />
      </section>

      <section className="workspace-card" aria-labelledby="settings-account-title">
        <Settings2 size={24} aria-hidden="true" />
        <h3 id="settings-account-title">Account settings</h3>
        <p>Review your saved details and manage your MEC registration from your profile. Notification preferences are not available yet.</p>
        <Link className="card-link" href="/app/profile">Review your profile <ArrowRight size={17} aria-hidden="true" /></Link>
      </section>

      <p className="small-copy"><LockKeyhole size={15} aria-hidden="true" /> Profile privacy permissions are still being validated. Theme preferences apply to this device.</p>
    </div>
  );
}
