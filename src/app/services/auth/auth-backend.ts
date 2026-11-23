import { User } from '../../models/user.model';

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

export function friendlyAuthError(err: unknown): string {
  if (err instanceof AuthError) return err.message;
  const msg = (err as { message?: string })?.message ?? '';
  if (/invalid login credentials/i.test(msg)) return 'That email and password don’t match our records.';
  if (/already registered|already exists/i.test(msg)) return 'An account with this email already exists. Try signing in instead.';
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email address first — check your inbox for the link.';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a minute and try again.';
  if (/password should be|weak password/i.test(msg)) return 'Please choose a stronger password (at least 8 characters).';
  if (/failed to fetch|network/i.test(msg)) return 'We couldn’t reach the server. Check your connection and try again.';
  if (/user already exists|already been taken|USER_ALREADY_EXISTS/i.test(msg)) return 'An account with this email already exists. Try signing in instead.';
  if (/invalid (email or )?password|INVALID_EMAIL_OR_PASSWORD|invalid credentials/i.test(msg)) return 'That email and password don’t match our records.';
  if (/password (is )?too short|PASSWORD_TOO_SHORT/i.test(msg)) return 'Please choose a longer password (at least 8 characters).';
  if (/invalid token|INVALID_TOKEN|token expired/i.test(msg)) return 'This reset link is invalid or has expired. Please request a new one.';
  if (/INVALID_OTP|invalid otp|token has expired or is invalid/i.test(msg)) return 'That code isn’t right. Check the latest email from us and try again.';
  if (/OTP_EXPIRED|otp expired|code expired/i.test(msg)) return 'This code has expired. Request a new one below.';
  if (/TOO_MANY_ATTEMPTS|too many attempts/i.test(msg)) return 'Too many incorrect attempts. Request a new code below.';
  return msg || 'Something went wrong. Please try again.';
}
