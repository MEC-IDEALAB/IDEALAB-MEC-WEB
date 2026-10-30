import { AuthExperience } from '@/components/auth-experience';

export const metadata = { title: 'Sign in' };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  return <AuthExperience initialView="sign-in" notice={notice} />;
}
