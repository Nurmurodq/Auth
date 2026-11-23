import { User } from '../../models/user.model';
import { MessageKey, t } from '../../i18n/i18n';

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignUpResult {
  /** The signed-in user, or null while the email address still has to be verified. */
  user: User | null;
  /** True when a verification code was emailed and must be entered before the account can be used. */
  needsVerification: boolean;
}

export interface ResetRequestResult {
  /**
   * The local backend cannot send email, so it returns a one-time link the
   * person can follow directly. Remote backends email the link instead.
   */
  directLink?: string;
}

export type SocialProvider = 'google';

export interface AuthBackend {
  readonly kind: 'local' | 'supabase' | 'neon';
  /** Social sign-in providers this backend can offer. */
  readonly socialProviders: readonly SocialProvider[];
  /** Whether new email/password accounts confirm their address with an emailed one-time code. */
  readonly verifiesEmail: boolean;
  restore(): Promise<User | null>;
  /** Subscribe to sign-in/out changes that happen outside the current call flow (other tabs, token refresh). */
  onExternalChange(listener: (user: User | null) => void): void;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  /** Throws an AuthError with code `email_not_verified` when the address hasn't been confirmed yet. */
  signIn(email: string, password: string): Promise<User>;
  /** Confirms an email address with the code that was sent to it. Returns the signed-in user, if the backend signs in automatically. */
  verifyEmail(email: string, code: string): Promise<User | null>;
  /** Emails a fresh verification code. */
  resendVerification(email: string): Promise<void>;
  /**
   * Starts a redirect-based social sign-in. The browser leaves the app; it returns to
   * `/auth/callback` (or `/welcome` for brand-new accounts) carrying `next` as the destination.
   */
  signInWithProvider(provider: SocialProvider, next: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<ResetRequestResult>;
  /** Completes a reset started from an emailed/direct link. */
  completePasswordReset(newPassword: string, params: Record<string, string>): Promise<void>;
  /** Whether the current URL carries a valid reset context. */
  canResetPassword(params: Record<string, string>): Promise<boolean>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  updateProfile(patch: { name: string }): Promise<User>;
}

export class AuthError extends Error {
  constructor(message: string, readonly code: string = 'auth_error') {
    super(message);
    this.name = 'AuthError';
  }
}

/** The provider rejected the request because this web address isn't on its trusted list. */
export function isOriginError(err: unknown): boolean {
  const e = err as { message?: string; code?: string } | null;
  return /INVALID_ORIGIN|MISSING_OR_NULL_ORIGIN|invalid origin|null origin|INVALID_CALLBACK_?URL|invalid callback ?url/i.test(`${e?.code ?? ''} ${e?.message ?? ''}`);
}

/** Known auth failures (from any backend), mapped to translated messages. Order matters. */
const AUTH_ERRORS: [RegExp, MessageKey][] = [
  [/INVALID_ORIGIN|MISSING_OR_NULL_ORIGIN|invalid origin|null origin|INVALID_CALLBACK_?URL|invalid callback ?url/i, 'authErr.origin'],
  [/verify your email first|EMAIL_NOT_VERIFIED|email_not_confirmed|email not confirmed/i, 'login.verifyFirst'],
  [/current password is incorrect/i, 'authErr.currentWrong'],
  [/signed up with Google/i, 'authErr.noPassword'],
  [/session has ended/i, 'authErr.noSession'],
  [/needs HTTPS|insecure/i, 'authErr.insecure'],
  [/account has been disabled/i, 'authErr.disabled'],
  [/Email verification isn’t available in local mode/i, 'authErr.localVerify'],
  [/Google sign-in isn’t available in local mode/i, 'authErr.localGoogle'],
  [/invalid login credentials|don’t match our records|invalid (email or )?password|INVALID_EMAIL_OR_PASSWORD|invalid credentials/i, 'authErr.invalid'],
  [/already registered|already exists|already been taken|USER_ALREADY_EXISTS/i, 'authErr.exists'],
  [/TOO_MANY_ATTEMPTS|too many attempts/i, 'authErr.tooManyAttempts'],
  [/rate limit|too many/i, 'authErr.rateLimit'],
  [/password should be|weak password/i, 'authErr.weak'],
  [/password (is )?too short|PASSWORD_TOO_SHORT/i, 'authErr.tooShort'],
  [/failed to fetch|network/i, 'authErr.network'],
  [/OTP_EXPIRED|otp expired|code expired/i, 'authErr.otpExpired'],
  [/INVALID_OTP|invalid otp|token has expired or is invalid/i, 'authErr.otpInvalid'],
  [/reset link is invalid|invalid token|INVALID_TOKEN|token expired/i, 'authErr.invalidToken'],
];

export function friendlyAuthError(err: unknown): string {
  const raw = err as { message?: string; code?: string } | null;
  const text = `${raw?.message ?? ''} ${err instanceof AuthError ? '' : (raw?.code ?? '')}`;
  for (const [pattern, key] of AUTH_ERRORS) if (pattern.test(text)) return t(key);
  return raw?.message || t('authErr.generic');
}
