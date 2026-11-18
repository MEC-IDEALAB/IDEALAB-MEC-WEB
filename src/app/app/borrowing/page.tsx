import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/member';

export const metadata = { title: 'Make & borrow' };

export default async function BorrowingPage() {
  await requireMember();
  redirect('/app/make-and-borrow?section=borrow');
}
