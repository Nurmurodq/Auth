import { User } from '../../models/user.model';

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignUpResult {
  user: User | null;
  /** True when the backend requires email confirmation before the first sign-in. */
  needsConfirmation: boolean;
}

export interface ResetRequestResult {
  /**
   * The local backend cannot send email, so it returns a one-time link the
   * person can follow directly. Remote backends email the link instead.
   */
  directLink?: string;
}

export interface AuthBackend {
  readonly kind: 'local' | 'supabase';
  restore(): Promise<User | null>;
  /** Subscribe to sign-in/out changes that happen outside the current call flow (other tabs, token refresh). */
  onExternalChange(listener: (user: User | null) => void): void;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<User>;
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
  return msg || 'Something went wrong. Please try again.';
}
