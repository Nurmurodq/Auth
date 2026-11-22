import { User } from '../../models/user.model';
import { AuthBackend, AuthError, ResetRequestResult, SignUpInput, SignUpResult, SocialProvider } from './auth-backend';
import { NeonAuthUser, NeonResult, getNeon } from './neon-client';

/**
 * Neon Managed Better Auth. Supports email/password and Google sign-in (Google works out of
 * the box with Neon's shared development credentials; add your own OAuth client for production).
 */
export class NeonAuthBackend implements AuthBackend {
  readonly kind = 'neon' as const;
  readonly socialProviders: readonly SocialProvider[] = ['google'];

  async restore(): Promise<User | null> {
    const { auth } = await getNeon();
    const res = await auth.getSession();
    return res.data?.user ? toUser(res.data.user) : null;
  }

  onExternalChange(listener: (user: User | null) => void): void {
    void getNeon().then(({ auth }) => {
      let last: string | null | undefined;
      const emit = (user: User | null) => {
        const id = user?.id ?? null;
        if (id === last) return;
        last = id;
        listener(user);
      };
      // Better Auth broadcasts session changes (including other tabs) through its session store.
      auth.useSession?.subscribe((value) => {
        if (!value.isPending) emit(value.data?.user ? toUser(value.data.user) : null);
      });
      // Re-check when the tab regains focus, in case the session expired or changed elsewhere.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void this.restore().then(emit).catch(() => undefined);
      });
    });
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const { auth } = await getNeon();
    const res = await auth.signUp.email({ email: input.email.trim(), password: input.password, name: input.name.trim() });
    const data = unwrap(res);
    // Email verification is optional in this project, so a session exists right away.
    const session = await auth.getSession();
    return { user: session.data?.user ? toUser(session.data.user) : toUser(data.user), needsConfirmation: !session.data?.user };
  }

  async signIn(email: string, password: string): Promise<User> {
    const { auth } = await getNeon();
    const data = unwrap(await auth.signIn.email({ email: email.trim(), password }));
    return toUser(data.user);
  }

  async signInWithProvider(provider: SocialProvider, next: string): Promise<void> {
    const { auth } = await getNeon();
    const origin = location.origin;
    const dest = encodeURIComponent(next);
    const res = await auth.signIn.social({
      provider,
      callbackURL: `${origin}/auth/callback?next=${dest}`,
      newUserCallbackURL: `${origin}/welcome?new=1&returnUrl=${dest}`,
      errorCallbackURL: `${origin}/login?oauthError=1&returnUrl=${dest}`,
    });
    if (res.error) throw toError(res.error);
    // The client normally redirects by itself; follow the URL explicitly if it didn't.
    if (res.data?.url && location.href !== res.data.url) location.assign(res.data.url);
  }

  async signOut(): Promise<void> {
    const { auth } = await getNeon();
    await auth.signOut();
  }

  async requestPasswordReset(email: string): Promise<ResetRequestResult> {
    const { auth } = await getNeon();
    const res = await auth.requestPasswordReset({ email: email.trim(), redirectTo: `${location.origin}/reset-password` });
    // Don't reveal whether the address is registered; only surface transport problems.
    if (res.error && (res.error.status ?? 0) >= 500) throw toError(res.error);
    return {};
  }

  async canResetPassword(params: Record<string, string>): Promise<boolean> {
    return !!params['token'] && !params['error'];
  }

  async completePasswordReset(newPassword: string, params: Record<string, string>): Promise<void> {
    const { auth } = await getNeon();
    unwrap(await auth.resetPassword({ newPassword, token: params['token'] ?? '' }));
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { auth } = await getNeon();
    const res = await auth.changePassword({ currentPassword, newPassword, revokeOtherSessions: false });
    if (res.error) {
      if (/invalid password|INVALID_PASSWORD/i.test(`${res.error.code} ${res.error.message}`)) {
        throw new AuthError('Your current password is incorrect.', 'invalid_credentials');
      }
      if (/credential account not found|CREDENTIAL_ACCOUNT_NOT_FOUND/i.test(`${res.error.code} ${res.error.message}`)) {
        throw new AuthError('You signed up with Google, so there’s no Folio password to change.', 'no_password');
      }
      throw toError(res.error);
    }
  }

  async updateProfile(patch: { name: string }): Promise<User> {
    const { auth } = await getNeon();
    unwrap(await auth.updateUser({ name: patch.name.trim() }));
    const user = await this.restore();
    if (!user) throw new AuthError('Your session has ended. Please sign in again.', 'no_session');
    return user;
  }
}

function toUser(u: NeonAuthUser): User {
  const created = u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt || new Date().toISOString();
  return { id: u.id, email: u.email, name: u.name || u.email.split('@')[0], createdAt: created };
}

function toError(error: NonNullable<NeonResult<unknown>['error']>): Error {
  return new Error(error.message || error.code || 'Something went wrong. Please try again.');
}

function unwrap<T>(res: NeonResult<T>): T {
  if (res.error || !res.data) throw toError(res.error ?? {});
  return res.data;
}
