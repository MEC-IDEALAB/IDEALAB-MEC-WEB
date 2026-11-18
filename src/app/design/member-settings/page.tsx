import { notFound } from 'next/navigation';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';
import { MemberSettingsContent } from '@/components/member-settings-content';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings visual preview', robots: { index: false, follow: false } };

export default function MemberSettingsPreview() {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  return <MemberWorkspaceShell variant="preview" previewPath="/design/member-space" activeScreen="settings" activeLabel="Settings visual preview"><MemberSettingsContent preview /></MemberWorkspaceShell>;
}
