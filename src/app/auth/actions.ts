'use server';

import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase';
import { googleAuthConfig, passwordRecoveryConfig } from '@/lib/auth-config';

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

export async function requestPasswordReset(form: FormData) {
  const email = String(form.get('email') ?? '').trim();
  const config = passwordRecoveryConfig();
  if (!config) redirect('/forgot-password?notice=configuration');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/forgot-password?notice=invalid');
  const client = await serverClient();
  if (!client) redirect('/forgot-password?notice=configuration');

  // Supabase deliberately does not disclose whether an address has an account.
  // Keep the same response for unknown addresses and provider-side errors.
  try { await client.auth.resetPasswordForEmail(email, { redirectTo: config.callback }); } catch { /* Never expose provider details or account existence. */ }
  redirect('/forgot-password?notice=requested');
}

export async function updatePassword(form: FormData) {
  const password = String(form.get('new_password') ?? '');
  const confirmation = String(form.get('confirm_password') ?? '');
  if (!password || password.length > 1024 || password !== confirmation) redirect('/reset-password?notice=mismatch');
  if (!passwordRecoveryConfig()) redirect('/reset-password?notice=configuration');
  const client = await serverClient();
  if (!client) redirect('/reset-password?notice=configuration');

  let authenticated = false;
  try {
    const { data, error } = await client.auth.getUser();
    authenticated = !error && !!data.user;
  } catch { /* Fail closed; never reflect auth tokens or provider errors. */ }
  if (!authenticated) redirect('/forgot-password?notice=expired');

  let updated = false;
  try { const { error } = await client.auth.updateUser({ password }); updated = !error; } catch { /* Keep provider details out of the response. */ }
  if (!updated) redirect('/reset-password?notice=update');
  try { await client.auth.signOut({ scope: 'local' }); } catch { /* Password update already succeeded; require a fresh sign-in either way. */ }
  redirect('/sign-in?notice=password-updated');
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
