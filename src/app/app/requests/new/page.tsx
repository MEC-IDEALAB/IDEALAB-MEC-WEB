import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { RequestDraft } from '@/features/requests/request-draft';
import { randomUUID } from 'node:crypto';
export const metadata = { title: 'Prepare a Work Request' };
export default async function NewRequest({ searchParams }: { searchParams: Promise<{ restore?: string; from?: string }> }) {
  const { user,profile } = await requireMember();
  const { restore, from } = await searchParams;
  const section = from === 'book' || from === 'borrow' ? from : 'make';
  const returnHref = `/app/make-and-borrow?section=${section}`;
  return <div className="workspace-page"><Link href={returnHref} className="text-link"><ArrowLeft size={18} /> Make & borrow</Link><span className="eyebrow">START WITH AN IDEA</span><h1>Prepare a Work Request.</h1><p>Put your thoughts together before talking to the lab team.</p><RequestDraft key={user.id} accountId={user.id} restoreOnOpen={restore === '1'} returnHref={returnHref} initialKind={section === 'borrow' ? 'operations' : 'machine'} onlineCommandId={process.env.ACCOUNT_ENVIRONMENT==='validation'&&process.env.ENABLE_WORK_REQUEST_INTAKE==='true'&&profile.role==='student'?randomUUID():undefined} /></div>;
}
