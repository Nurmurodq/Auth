import { Injectable, computed, signal } from '@angular/core';
import { BACKEND, markOriginFallback, originFallbackActive } from '../../config';
import { t } from '../../i18n/i18n';
import { User } from '../../models/user.model';
import { AuthBackend, AuthError, ResetRequestResult, SignUpInput, SignUpResult, SocialProvider, isOriginError } from './auth-backend';
import { LocalAuthBackend } from './local-auth.backend';
import { NeonAuthBackend } from './neon-auth.backend';
import { SupabaseAuthBackend } from './supabase-auth.backend';

function createCloudBackend(): AuthBackend | null {
  if (BACKEND === 'neon') return new NeonAuthBackend();
  if (BACKEND === 'supabase') return new SupabaseAuthBackend();
  return null;
}

/**
 * Facade over the configured authentication backend.
 *
 * If the cloud provider refuses this web address (it isn't on the provider's trusted list), the
 * service switches to on-device accounts for this address and retries the request there, so
 * signing up and signing in keep working wherever Folio is hosted. `onDeviceFallback()` tells the
 * UI to explain that accounts on this address aren't synced.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly local = new LocalAuthBackend();
  private readonly cloud = createCloudBackend();
  private readonly active = signal<AuthBackend>(this.initialBackend());

  readonly user = signal<User | null>(null);
  readonly ready = signal(false);
  readonly isAuthenticated = computed(() => this.user() !== null);
  /** True when the cloud is configured but this address has to use on-device accounts. */
  readonly onDeviceFallback = computed(() => !!this.cloud && this.active() === this.local);

  /** The backend in use right now (reactive: it can change from the cloud to on-device). */
  get backendKind(): AuthBackend['kind'] {
    return this.active().kind;
  }
  get socialProviders(): readonly SocialProvider[] {
    return this.active().socialProviders;
  }
  get verifiesEmail(): boolean {
    return this.active().verifiesEmail;
  }

  private readyPromise: Promise<void>;

  constructor() {
    const update = (backend: AuthBackend) => (user: User | null) => this.active() === backend && this.user.set(user);
    this.local.onExternalChange(update(this.local));
    this.cloud?.onExternalChange(update(this.cloud));
    this.readyPromise = this.active()
      .restore()
      .then((user) => this.user.set(user))
      .catch(() => this.user.set(null))
      .finally(() => this.ready.set(true));
  }

  private initialBackend(): AuthBackend {
    if (!this.cloud) return this.local;
    return originFallbackActive(this.local.hasSession()) ? this.local : this.cloud;
  }

  private get backend(): AuthBackend {
    return this.active();
  }

  /**
   * Runs an action on the active backend. If the cloud rejects this address, switch to on-device
   * accounts and run it again there (unless `retry` is false).
   */
  private async run<T>(action: (backend: AuthBackend) => Promise<T>, retry = true): Promise<T> {
    const backend = this.backend;
    try {
      return await action(backend);
    } catch (err) {
      if (backend === this.local || !isOriginError(err)) throw err;
      console.warn(
        `[Folio] Cloud sign-in rejected ${location.origin} (not a trusted domain). Using on-device accounts on this address. ` +
          'To enable cloud accounts here, add this address under Neon Console → Auth → Trusted domains.',
      );
      markOriginFallback();
      this.active.set(this.local);
      if (!retry) throw err;
      return action(this.local);
    }
  }

  /** Resolves once the stored session has been restored. */
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const result = await this.run((b) => b.signUp(input));
    if (result.user) this.user.set(result.user);
    return result;
  }

  async signIn(email: string, password: string): Promise<User> {
    const user = await this.run((b) => b.signIn(email, password));
    this.user.set(user);
    return user;
  }

  async verifyEmail(email: string, code: string): Promise<User | null> {
    const user = await this.run((b) => b.verifyEmail(email, code), false);
    if (user) this.user.set(user);
    return user;
  }

  resendVerification(email: string): Promise<void> {
    return this.run((b) => b.resendVerification(email), false);
  }

  /** Leaves the app for the provider's consent screen; resolves only if the redirect fails to start. */
  async signInWithProvider(provider: SocialProvider, next: string): Promise<void> {
    try {
      await this.run((b) => b.signInWithProvider(provider, next), false);
    } catch (err) {
      if (isOriginError(err)) throw new AuthError(t('authErr.googleOrigin'), 'origin');
      throw err;
    }
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
    return this.run((b) => b.requestPasswordReset(email));
  }

  canResetPassword(params: Record<string, string>): Promise<boolean> {
    return this.backend.canResetPassword(params);
  }

  /** Returns the signed-in user if the backend signs the person in after a reset, otherwise null. */
  async completePasswordReset(newPassword: string, params: Record<string, string>): Promise<User | null> {
    await this.run((b) => b.completePasswordReset(newPassword, params), false);
    const user = await this.backend.restore().catch(() => null);
    this.user.set(user);
    return user;
  }

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.run((b) => b.changePassword(currentPassword, newPassword), false);
  }

  async updateProfile(patch: { name: string }): Promise<User> {
    const user = await this.run((b) => b.updateProfile(patch), false);
    this.user.set(user);
    return user;
  }
}
