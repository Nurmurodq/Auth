import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { t } from '../../i18n/i18n';
import { Router, RouterLink } from '@angular/router';
import { safeReturnUrl } from '../../guards';
import { AuthService } from '../../services/auth/auth.service';
import { LibraryService } from '../../services/library.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { LogoComponent } from '../../shared/logo.component';

/**
 * Landing page after a social sign-in redirect. Confirms the session, waits for the
 * reader's synced data, then continues to the questionnaire (first visit) or the destination.
 */
@Component({
  selector: 'app-auth-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, LogoComponent],
  template: `
    <section class="wrap">
      <app-logo />
      @if (failed()) {
        <div class="card fade-up" role="alert">
          <span class="icon err"><app-icon name="alert" [size]="26" /></span>
          <h1 class="display">{{ t('callback.failed') }}</h1>
          <p class="muted">{{ t('callback.failedText') }}</p>
          <a routerLink="/login" class="btn btn-primary btn-lg">{{ t('auth.backToSignIn') }}</a>
        </div>
      } @else {
        <div class="card" aria-live="polite" aria-busy="true">
          <span class="spinner" aria-hidden="true"></span>
          <h1 class="display">{{ t('callback.signingIn') }}</h1>
          <p class="muted">{{ t('callback.settingUp') }}</p>
        </div>
      }
    </section>
  `,
  styles: `
    .wrap {
      min-height: 100dvh;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 32px;
      padding: 24px;
    }
    .card {
      display: grid;
      justify-items: center;
      gap: 12px;
      max-width: 420px;
      text-align: center;
    }
    h1 {
      font-size: 1.8rem;
      letter-spacing: -0.02em;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
    }
    .err {
      background: var(--danger-soft);
      color: var(--danger);
    }
    .btn {
      margin-top: 10px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid var(--surface-2);
      border-top-color: var(--accent);
      animation: spin 800ms linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class AuthCallbackPage implements OnInit {
  protected readonly t = t;
  private readonly auth = inject(AuthService);
  private readonly library = inject(LibraryService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly next = input<string>();
  protected readonly failed = signal(false);

  async ngOnInit(): Promise<void> {
    const next = safeReturnUrl(this.next(), '/');
    await this.auth.whenReady();
    const user = this.auth.user() ?? (await this.auth.refresh());
    if (!user) {
      this.failed.set(true);
      return;
    }
    // Give the first sync a moment so we know whether this reader already answered the questionnaire.
    await Promise.race([this.library.whenSynced(), new Promise((r) => setTimeout(r, 5000))]);
    if (!this.library.profile()) {
      await this.router.navigate(['/welcome'], { queryParams: { returnUrl: next }, replaceUrl: true });
      return;
    }
    this.toast.success(t('login.welcome', { name: user.name.split(' ')[0] }));
    await this.router.navigateByUrl(next, { replaceUrl: true });
  }
}
