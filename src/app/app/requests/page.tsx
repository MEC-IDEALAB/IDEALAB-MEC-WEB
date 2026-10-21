import { requireMember } from '@/lib/member';
import { RequestWorkspace } from '@/features/requests/request-workspace';
export const metadata = { title: 'Work requests' };
export default async function RequestsPage() {
  const { user } = await requireMember();
  return <div className="workspace-page"><span className="eyebrow">FROM IDEA TO NEXT STEP</span><h1>Your work requests.</h1><p>Prepare your idea here, then coordinate with the lab team.</p><RequestWorkspace accountId={user.id} composeHref="/app/requests/new" /></div>;
}
