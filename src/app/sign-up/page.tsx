import { AuthExperience } from '@/components/auth-experience';

export const metadata = { title: 'Create an account' };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  return <AuthExperience initialView="create-account" notice={notice} />;
}
