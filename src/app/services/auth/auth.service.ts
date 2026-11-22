import { Injectable, computed, signal } from '@angular/core';
import { BACKEND } from '../../config';
import { User } from '../../models/user.model';
import { AuthBackend, ResetRequestResult, SignUpInput, SignUpResult } from './auth-backend';
import { LocalAuthBackend } from './local-auth.backend';
import { SupabaseAuthBackend } from './supabase-auth.backend';

/** Facade over the configured authentication backend. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly backend: AuthBackend = BACKEND === 'supabase' ? new SupabaseAuthBackend() : new LocalAuthBackend();

  readonly user = signal<User | null>(null);
  readonly ready = signal(false);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly backendKind = this.backend.kind;

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

  async completePasswordReset(newPassword: string, params: Record<string, string>): Promise<void> {
    await this.backend.completePasswordReset(newPassword, params);
    this.user.set(await this.backend.restore());
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
