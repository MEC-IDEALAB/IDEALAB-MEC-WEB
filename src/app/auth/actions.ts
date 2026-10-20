'use server';

import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase';
import { googleAuthConfig } from '@/lib/auth-config';

export async function signInWithGoogle() {
  const config = googleAuthConfig();
  const client = await serverClient();
  if (!config || !client) redirect('/sign-in?notice=configuration');
  let destination: string | undefined;
  try {
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: config.callback } });
    if (!error && data.url) {
      const url = new URL(data.url);
      if (url.protocol === 'https:' && url.origin === new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin) destination = url.href;
    }
  } catch { /* Keep provider errors and credentials out of the response. */ }
  if (!destination) redirect('/sign-in?notice=connection');
  redirect(destination);
}

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
