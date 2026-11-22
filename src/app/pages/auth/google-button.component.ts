import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { friendlyAuthError } from '../../services/auth/auth-backend';
import { ToastService } from '../../services/toast.service';

/** "Continue with Google" — rendered only when the active backend supports it. */
@Component({
  selector: 'app-google-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (available) {
      <button type="button" class="btn btn-secondary btn-lg btn-block google" (click)="start()" [disabled]="busy()">
        @if (busy()) {
          <span class="spinner" aria-hidden="true"></span> Redirecting to Google…
        } @else {
          <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          {{ label() }}
        }
      </button>
      <div class="divider-row" role="separator"><span>{{ dividerText() }}</span></div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .google {
      gap: 12px;
      font-weight: 600;
    }
    .spinner {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid currentColor;
      border-right-color: transparent;
      animation: spin 700ms linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .divider-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 22px 0 2px;
      font-size: 0.82rem;
      color: var(--text-3);
    }
    .divider-row::before,
    .divider-row::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }
  `,
})
export class GoogleButtonComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  /** Where to go after signing in. */
  readonly next = input('/');
  readonly label = input('Continue with Google');
  readonly dividerText = input('or use your email');

  protected readonly available = this.auth.socialProviders.includes('google');
  protected readonly busy = signal(false);

  protected async start(): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.signInWithProvider('google', this.next());
      // Normally the page navigates away; if we're still here after a moment, re-enable the button.
      setTimeout(() => this.busy.set(false), 8000);
    } catch (err) {
      this.busy.set(false);
      this.toast.error(friendlyAuthError(err));
    }
  }
}
