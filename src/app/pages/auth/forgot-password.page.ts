import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { t } from '../../i18n/i18n';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { friendlyAuthError } from '../../services/auth/auth-backend';
import { IconComponent } from '../../shared/icon.component';
import { AuthShellComponent } from './auth-shell.component';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, IconComponent],
  template: `
    <app-auth-shell [heading]="t('forgot.title')" [subheading]="t('forgot.subtitle')">
      @if (sent()) {
        <div class="success-state" role="status">
          <span class="success-icon"><app-icon name="mail" [size]="26" /></span>
          @if (directLink()) {
            <h2>{{ t('forgot.linkReady') }}</h2>
            <p class="muted">{{ t('forgot.localText') }}</p>
            <button type="button" class="btn btn-primary btn-lg" (click)="openLink()">{{ t('reset.title') }}</button>
          } @else {
            <h2>{{ t('verify.title') }}</h2>
            <p class="muted">{{ t('forgot.sentBefore') }} <strong>{{ form.controls.email.value }}</strong>{{ t('forgot.sentAfter') }}</p>
          }
          <a routerLink="/login" class="btn btn-ghost">{{ t('auth.backToSignIn') }}</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (error()) {
            <div class="alert alert-error" role="alert"><app-icon name="alert" [size]="18" />{{ error() }}</div>
          }
          <div class="field">
            <label class="field-label" for="email">{{ t('auth.email') }}</label>
            <input
              id="email"
              class="input"
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
              [placeholder]="t('auth.emailPlaceholder')"
              [attr.aria-invalid]="showError()"
              aria-describedby="email-error"
            />
            @if (showError()) {
              <span class="field-error" id="email-error">{{ t('auth.emailInvalid') }}</span>
            }
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block submit" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner" aria-hidden="true"></span> {{ t('forgot.sending') }}
            } @else {
              {{ t('forgot.send') }}
            }
          </button>
        </form>
        <p class="switch">{{ t('forgot.remembered') }} <a routerLink="/login" class="link">{{ t('auth.backToSignIn') }}</a></p>
      }
    </app-auth-shell>
  `,
  styleUrl: './auth-form.css',
})
export class ForgotPasswordPage {
  protected readonly t = t;
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sent = signal(false);
  protected readonly directLink = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });

  protected showError(): boolean {
    const c = this.form.controls.email;
    return c.invalid && (c.touched || this.submitted());
  }

  protected openLink(): void {
    const link = this.directLink();
    if (link) void this.router.navigateByUrl(link);
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;
    this.loading.set(true);
    try {
      const result = await this.auth.requestPasswordReset(this.form.getRawValue().email);
      this.directLink.set(result.directLink ?? null);
      this.sent.set(true);
    } catch (err) {
      this.error.set(friendlyAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
