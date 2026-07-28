import type { AuthUser, AuthMode } from '@/lib/auth-store';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

function modeFromUser(user: User): AuthMode {
  const provider =
    user.app_metadata?.provider ??
    user.identities?.[0]?.provider ??
    'email';
  if (provider === 'google') return 'google';
  if (provider === 'apple') return 'apple';
  if (provider === 'facebook') return 'facebook';
  return 'email';
}

export function authUserFromSupabase(user: User): AuthUser {
  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Athlete';
  return {
    id: user.id,
    name,
    email: user.email ?? null,
    mode: modeFromUser(user),
  };
}

export async function getSupabaseSessionUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return authUserFromSupabase(data.user);
}

export async function signInWithEmailMagicLink(email: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase is not configured');
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signInWithOAuthProvider(
  provider: 'google' | 'apple' | 'facebook',
) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase is not configured');
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOutSupabase() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export { isSupabaseConfigured };
