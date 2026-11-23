import { Injectable, computed, signal } from '@angular/core';
import { BACKEND } from '../../config';
import { User } from '../../models/user.model';
import { AuthBackend, ResetRequestResult, SignUpInput, SignUpResult, SocialProvider } from './auth-backend';
import { LocalAuthBackend } from './local-auth.backend';
import { NeonAuthBackend } from './neon-auth.backend';
import { SupabaseAuthBackend } from './supabase-auth.backend';

function createBackend(): AuthBackend {
  if (BACKEND === 'neon') return new NeonAuthBackend();
  if (BACKEND === 'supabase') return new SupabaseAuthBackend();
  return new LocalAuthBackend();
}

/** Facade over the configured authentication backend. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly backend: AuthBackend = createBackend();

  readonly user = signal<User | null>(null);
  readonly ready = signal(false);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly backendKind = this.backend.kind;
  readonly socialProviders = this.backend.socialProviders;
  readonly verifiesEmail = this.backend.verifiesEmail;

  private readyPromise: Promise<void>;

  constructor() {
    this.backend.onExternalChange((user) => this.user.set(user));
    this.readyPromise = this.backend
      .restore()
      .then((user) => this.user.set(user))
      .catch(() => this.user.set(null))
      .finally(() => this.ready.set(true));
  }

  /** Resolves once the stored session has been restored. */
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const result = await this.backend.signUp(input);
    if (result.user) this.user.set(result.user);
    return result;
  }

  async signIn(email: string, password: string): Promise<User> {
    const user = await this.backend.signIn(email, password);
    this.user.set(user);
    return user;
  }

  async verifyEmail(email: string, code: string): Promise<User | null> {
    const user = await this.backend.verifyEmail(email, code);
    if (user) this.user.set(user);
    return user;
  }

  resendVerification(email: string): Promise<void> {
    return this.backend.resendVerification(email);
  }

  /** Leaves the app for the provider's consent screen; resolves only if the redirect fails to start. */
  signInWithProvider(provider: SocialProvider, next: string): Promise<void> {
    return this.backend.signInWithProvider(provider, next);
  }

  /** Re-reads the session from the backend (e.g. after an OAuth redirect lands back in the app). */
  async refresh(): Promise<User | null> {
    const user = await this.backend.restore().catch(() => null);
    this.user.set(user);
    return user;
  }

  async signOut(): Promise<void> {
    await this.backend.signOut();
    this.user.set(null);
  }

  requestPasswordReset(email: string): Promise<ResetRequestResult> {
    return this.backend.requestPasswordReset(email);
  }

  canResetPassword(params: Record<string, string>): Promise<boolean> {
    return this.backend.canResetPassword(params);
  }

  /** Returns the signed-in user if the backend signs the person in after a reset, otherwise null. */
  async completePasswordReset(newPassword: string, params: Record<string, string>): Promise<User | null> {
    await this.backend.completePasswordReset(newPassword, params);
    const user = await this.backend.restore().catch(() => null);
    this.user.set(user);
    return user;
  }

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.backend.changePassword(currentPassword, newPassword);
  }

  async updateProfile(patch: { name: string }): Promise<User> {
    const user = await this.backend.updateProfile(patch);
    this.user.set(user);
    return user;
  }
}
