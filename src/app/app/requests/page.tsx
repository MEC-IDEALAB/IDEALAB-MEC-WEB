import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/member';

export const metadata = { title: 'Make & borrow' };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireMember();
  const current = new URLSearchParams();
  current.set('section', 'make');
  const params = await searchParams;
  for (const key of ['before', 'cursor']) {
    const value = params[key];
    if (typeof value === 'string') current.set(key, value);
  }
  redirect(`/app/make-and-borrow?${current.toString()}`);
}
