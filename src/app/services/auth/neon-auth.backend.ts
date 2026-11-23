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
  /** Email/password sign-ups confirm their address with a 6-digit code (Neon setting: OTP verification). */
  readonly verifiesEmail = true;

  async restore(): Promise<User | null> {
    const { auth } = await getNeon();
    const res = await call(() => auth.getSession());
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
    const res = await call(() => auth.signUp.email({ email: input.email.trim(), password: input.password, name: input.name.trim() }));
    unwrap(res);
    // With email verification required, Neon emails a code and creates no session until it's confirmed.
    const session = await call(() => auth.getSession());
    const user = session.data?.user ? toUser(session.data.user) : null;
    return { user, needsVerification: !user };
  }

  async signIn(email: string, password: string): Promise<User> {
    const { auth } = await getNeon();
    const res = await call(() => auth.signIn.email({ email: email.trim(), password }));
    // The SDK normalises Better Auth's EMAIL_NOT_VERIFIED into `email_not_confirmed` / "Email verification required".
    if (res.error && /EMAIL_NOT_VERIFIED|email_not_confirmed|email not verified|verification required/i.test(`${res.error.code} ${res.error.message}`)) {
      // Neon sends a fresh code when an unverified account tries to sign in.
      throw new AuthError('Please verify your email first — we’ve sent you a new code.', 'email_not_verified');
    }
    return toUser(unwrap(res).user);
  }

  async verifyEmail(email: string, code: string): Promise<User | null> {
    const { auth } = await getNeon();
    const res = await call(() => auth.emailOtp.verifyEmail({ email: email.trim(), otp: code.trim() }));
    if (res.error) throw toError(res.error);
    // Neon signs the reader in automatically after verification.
    const session = await call(() => auth.getSession());
    return session.data?.user ? toUser(session.data.user) : null;
  }

  async resendVerification(email: string): Promise<void> {
    const { auth } = await getNeon();
    const res = await call(() => auth.emailOtp.sendVerificationOtp({ email: email.trim(), type: 'email-verification' }));
    if (res.error) throw toError(res.error);
  }

  async signInWithProvider(provider: SocialProvider, next: string): Promise<void> {
    const { auth } = await getNeon();
    const origin = location.origin;
    const dest = encodeURIComponent(next);
    const res = await call(() => auth.signIn.social({
      provider,
      callbackURL: `${origin}/auth/callback?next=${dest}`,
      newUserCallbackURL: `${origin}/welcome?new=1&returnUrl=${dest}`,
      errorCallbackURL: `${origin}/login?oauthError=1&returnUrl=${dest}`,
    }));
    if (res.error) throw toError(res.error);
    // The client normally redirects by itself; follow the URL explicitly if it didn't.
    if (res.data?.url && location.href !== res.data.url) location.assign(res.data.url);
  }

  async signOut(): Promise<void> {
    const { auth } = await getNeon();
    await call(() => auth.signOut());
  }

  async requestPasswordReset(email: string): Promise<ResetRequestResult> {
    const { auth } = await getNeon();
    const res = await call(() => auth.requestPasswordReset({ email: email.trim(), redirectTo: `${location.origin}/reset-password` }));
    // Don't reveal whether the address is registered; only surface transport problems.
    if (res.error && (res.error.status ?? 0) >= 500) throw toError(res.error);
    return {};
  }

  async canResetPassword(params: Record<string, string>): Promise<boolean> {
    return !!params['token'] && !params['error'];
  }

  async completePasswordReset(newPassword: string, params: Record<string, string>): Promise<void> {
    const { auth } = await getNeon();
    unwrap(await call(() => auth.resetPassword({ newPassword, token: params['token'] ?? '' })));
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { auth } = await getNeon();
    const res = await call(() => auth.changePassword({ currentPassword, newPassword, revokeOtherSessions: false }));
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
    unwrap(await call(() => auth.updateUser({ name: patch.name.trim() })));
    const user = await this.restore();
    if (!user) throw new AuthError('Your session has ended. Please sign in again.', 'no_session');
    return user;
  }
}

/**
 * Runs a Neon auth call and always resolves to `{ data, error }`. The SDK returns errors for some
 * failures and throws for others (HTTP 4xx/5xx); this keeps Better Auth's raw code (e.g.
 * EMAIL_NOT_VERIFIED, INVALID_OTP) when available, rather than the SDK's normalised one.
 */
async function call<T>(fn: () => Promise<NeonResult<T>>): Promise<NeonResult<T>> {
  try {
    const res = await fn();
    return res ?? { data: null, error: null };
  } catch (err) {
    const e = err as { message?: string; code?: string; status?: number; error?: { code?: string; message?: string; status?: number } };
    return { data: null, error: { code: e.error?.code ?? e.code, message: e.error?.message ?? e.message, status: e.error?.status ?? e.status } };
  }
}

function toUser(u: NeonAuthUser): User {
  const created = u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt || new Date().toISOString();
  return { id: u.id, email: u.email, name: u.name || u.email.split('@')[0], createdAt: created };
}

function toError(error: NonNullable<NeonResult<unknown>['error']>): Error {
  // Keep the machine-readable code in the message so friendlyAuthError can map it.
  const parts = [error.code, error.message].filter(Boolean);
  return new Error(parts.join(': ') || 'Something went wrong. Please try again.');
}

function unwrap<T>(res: NeonResult<T>): T {
  if (res.error || !res.data) throw toError(res.error ?? {});
  return res.data;
}
