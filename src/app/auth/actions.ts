'use server';

import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase';

export async function signIn(form: FormData) {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password || email.length > 254 || password.length > 1024) redirect('/sign-in?notice=invalid');
  const client = await serverClient();
  if (!client) redirect('/sign-in?notice=configuration');
  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) redirect('/sign-in?notice=invalid');
  } catch (error) {
    // Preserve framework redirects without reflecting backend errors or credentials.
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    redirect('/sign-in?notice=connection');
  }
  redirect('/app');
}

export async function signOut() {
  const client = await serverClient();
  if (client) {
    try { const { error } = await client.auth.signOut({ scope: 'local' }); if (error) redirect('/app?notice=signout'); }
    catch (error) {
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
      redirect('/app?notice=signout');
    }
  }
  redirect('/sign-in');
}
