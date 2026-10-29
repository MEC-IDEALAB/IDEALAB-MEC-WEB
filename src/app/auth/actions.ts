'use server';

import { redirect } from 'next/navigation';
import { readAuthCredentials, readAuthEmail, readNewPassword } from '@/lib/auth-input';
import { serverClient, clearLocalAuthSession } from '@/lib/supabase';
import { googleAuthConfig, passwordRecoveryConfig, signupAuthConfig } from '@/lib/auth-config';
import { exitLocalAuthSession } from '@/lib/local-auth-exit';
import { attemptSignupAndClearSession } from '@/lib/signup-cleanup';
import { matchesFormAccount } from '@/lib/form-account';

export async function signInWithGoogle() {
  const config = googleAuthConfig();
  const client = await serverClient({ writable: true });
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
  const credentials = readAuthCredentials(form);
  if (!credentials) redirect('/sign-in?notice=invalid');
  const { email, password } = credentials;
  const client = await serverClient({ writable: true });
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
  const email = readAuthEmail(form);
  const config = passwordRecoveryConfig();
  if (!config) redirect('/forgot-password?notice=configuration');
  if (!email) redirect('/forgot-password?notice=invalid');
  const client = await serverClient({ writable: true });
  if (!client) redirect('/forgot-password?notice=configuration');

  // Supabase deliberately does not disclose whether an address has an account.
  // Keep the same response for unknown addresses and provider-side errors.
  try { await client.auth.resetPasswordForEmail(email, { redirectTo: config.callback }); } catch { /* Never expose provider details or account existence. */ }
  redirect('/forgot-password?notice=requested');
}

export async function updatePassword(form: FormData) {
  const password = readNewPassword(form);
  if (!password) redirect('/reset-password?notice=mismatch');
  if (!passwordRecoveryConfig()) redirect('/reset-password?notice=configuration');
  const client = await serverClient({ writable: true });
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
  const exit = await exitLocalAuthSession(() => client.auth.signOut({ scope: 'local' }), clearLocalAuthSession);
  if (exit !== 'cleared') redirect('/sign-in?notice=password-updated-cleanup');
  redirect('/sign-in?notice=password-updated');
}

export async function signOut(form: FormData) {
  const client = await serverClient({ writable: true });
  if (client) {
    let sameAccount = false;
    try {
      const identity = await client.auth.getUser();
      sameAccount = !identity.error && !!identity.data.user && matchesFormAccount(form, identity.data.user.id);
    } catch { /* Do not sign out an account we could not verify. */ }
    if (!sameAccount) redirect('/sign-in?notice=session');
    try { const { error } = await client.auth.signOut({ scope: 'local' }); if (error) redirect('/app?notice=signout'); }
    catch (error) {
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
      redirect('/app?notice=signout');
    }
  }
  redirect('/sign-in');
}

/** Recovery-only retry: never take a failed cleanup back into the workspace. */
export async function finishPasswordResetSignOut() {
  const client = await serverClient({ writable: true });
  if (!client) redirect('/sign-in?notice=password-updated-cleanup');
  const exit = await exitLocalAuthSession(() => client.auth.signOut({ scope: 'local' }), clearLocalAuthSession);
  redirect(exit === 'cleared' ? '/sign-in?notice=password-updated' : '/sign-in?notice=password-updated-cleanup');
}

/** Supabase Auth owns identity creation; never insert profiles from client metadata. */
export async function signUp(form: FormData) {
  const config = signupAuthConfig();
  if (!config) redirect('/sign-up?notice=configuration');
  const credentials = readAuthCredentials(form, true);
  if (!credentials) redirect('/sign-up?notice=signup-invalid');
  const client = await serverClient({ writable: true });
  if (!client) redirect('/sign-up?notice=configuration');
  // Clear session cookies for every outcome, including a lost response. Do not use
  // SDK signOut here: it also removes the PKCE verifier for email confirmation.
  const cleanup = await attemptSignupAndClearSession(
    () => client.auth.signUp({ ...credentials, options: { emailRedirectTo: config.callback } }),
    clearLocalAuthSession,
  );
  if (cleanup !== 'cleared') redirect('/confirm-email?notice=cleanup');
  redirect('/confirm-email?notice=requested');
}

export async function retrySignupCleanup() {
  try { await clearLocalAuthSession(); } catch { redirect('/confirm-email?notice=cleanup'); }
  redirect('/confirm-email?notice=requested');
}

export async function resendSignupConfirmation(form: FormData) {
  const config = signupAuthConfig();
  if (!config) redirect('/confirm-email?notice=configuration');
  const email = readAuthEmail(form);
  if (!email) redirect('/confirm-email?notice=invalid');
  const client = await serverClient({ writable: true });
  if (!client) redirect('/confirm-email?notice=configuration');
  try {
    await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: config.callback } });
  } catch { /* Generic response also covers provider limits and missing accounts. */ }
  redirect('/confirm-email?notice=resent');
}
