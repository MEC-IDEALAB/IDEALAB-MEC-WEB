import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { RequestDraft } from '@/features/requests/request-draft';
export const metadata = { title: 'Prepare a Work Request' };
export default async function NewRequest() {
  const { user } = await requireMember();
  return <div className="workspace-page"><Link href="/app/requests" className="text-link"><ArrowLeft size={18} /> Work requests</Link><span className="eyebrow">START WITH AN IDEA</span><h1>Prepare a Work Request.</h1><p>Put your thoughts together before talking to the lab team.</p><RequestDraft accountId={user.id} /></div>;
}
