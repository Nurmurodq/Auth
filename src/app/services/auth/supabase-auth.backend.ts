import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';
import { AuthBackend, AuthError, ResetRequestResult, SignUpInput, SignUpResult, SocialProvider } from './auth-backend';
import { getSupabase } from './supabase-client';

/** Supabase Auth backend. Profiles live in public.profiles (see supabase/migrations). */
export class SupabaseAuthBackend implements AuthBackend {
  readonly kind = 'supabase' as const;
  readonly socialProviders: readonly SocialProvider[] = environment.supabaseGoogle ? ['google'] : [];
  /** Requires "Confirm email" with {{ .Token }} in the Supabase confirmation email template. */
  readonly verifiesEmail = true;
  private recovery = false;

  async restore(): Promise<User | null> {
    const sb = await getSupabase();
    const { data } = await sb.auth.getSession();
    return data.session ? this.toUser(sb, data.session.user) : null;
  }

  onExternalChange(listener: (user: User | null) => void): void {
    void getSupabase().then((sb) =>
      sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') this.recovery = true;
        if (event === 'SIGNED_OUT') listener(null);
        else if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY')) {
          // Defer: calling Supabase from inside the callback can deadlock its auth lock.
          setTimeout(() => void this.toUser(sb, session.user).then(listener), 0);
        }
      }),
    );
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const sb = await getSupabase();
    const { data, error } = await sb.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: { data: { full_name: input.name.trim() }, emailRedirectTo: `${location.origin}/library` },
    });
    if (error) throw error;
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities?.length === 0) {
      throw new AuthError('An account with this email already exists. Try signing in instead.', 'exists');
    }
    return { user: data.session && data.user ? await this.toUser(sb, data.user) : null, needsVerification: !data.session };
  }

  async signIn(email: string, password: string): Promise<User> {
    const sb = await getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error && /email not confirmed/i.test(error.message)) {
      await sb.auth.resend({ type: 'signup', email: email.trim() });
      throw new AuthError('Please verify your email first — we’ve sent you a new code.', 'email_not_verified');
    }
    if (error) throw error;
    const user = await this.toUser(sb, data.user);
    const { data: profile } = await sb.from('profiles').select('is_active').eq('id', data.user.id).maybeSingle();
    if (profile && profile.is_active === false) {
      await sb.auth.signOut();
      throw new AuthError('This account has been disabled. Please contact support.', 'disabled');
    }
    return user;
  }

  async verifyEmail(email: string, code: string): Promise<User | null> {
    const sb = await getSupabase();
    const { data, error } = await sb.auth.verifyOtp({ email: email.trim(), token: code, type: 'signup' });
    if (error) throw error;
    return data.user && data.session ? this.toUser(sb, data.user) : null;
  }

  async resendVerification(email: string): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.auth.resend({ type: 'signup', email: email.trim() });
    if (error) throw error;
  }

  async signInWithProvider(provider: SocialProvider, next: string): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const sb = await getSupabase();
    await sb.auth.signOut();
  }

  async requestPasswordReset(email: string): Promise<ResetRequestResult> {
    const sb = await getSupabase();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/reset-password` });
    if (error) throw error;
    return {};
  }

  async canResetPassword(): Promise<boolean> {
    const sb = await getSupabase();
    // The recovery link signs the person in; give detectSessionInUrl a moment to finish.
    for (let i = 0; i < 10; i++) {
      const { data } = await sb.auth.getSession();
      if (data.session) return true;
      await new Promise((r) => setTimeout(r, 200));
    }
    return this.recovery;
  }

  async completePasswordReset(newPassword: string): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
    this.recovery = false;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const sb = await getSupabase();
    const { data } = await sb.auth.getUser();
    if (!data.user?.email) throw new AuthError('Your session has ended. Please sign in again.', 'no_session');
    const check = await sb.auth.signInWithPassword({ email: data.user.email, password: currentPassword });
    if (check.error) throw new AuthError('Your current password is incorrect.', 'invalid_credentials');
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async updateProfile(patch: { name: string }): Promise<User> {
    const sb = await getSupabase();
    const { data, error } = await sb.auth.updateUser({ data: { full_name: patch.name.trim() } });
    if (error) throw error;
    await sb.from('profiles').update({ full_name: patch.name.trim() }).eq('id', data.user.id);
    return this.toUser(sb, data.user);
  }

  private async toUser(sb: SupabaseClient, u: SupabaseUser): Promise<User> {
    const meta = (u.user_metadata ?? {}) as { full_name?: string };
    let name = meta.full_name ?? '';
    if (!name) {
      const { data } = await sb.from('profiles').select('full_name').eq('id', u.id).maybeSingle();
      name = (data?.full_name as string | undefined) ?? '';
    }
    return { id: u.id, email: u.email ?? '', name: name || (u.email ?? '').split('@')[0], createdAt: u.created_at };
  }
}
