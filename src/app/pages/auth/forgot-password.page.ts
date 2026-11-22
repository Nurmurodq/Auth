import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
    <app-auth-shell heading="Forgot your password?" subheading="It happens to the best of readers. Enter your email and we’ll help you reset it.">
      @if (sent()) {
        <div class="success-state" role="status">
          <span class="success-icon"><app-icon name="mail" [size]="26" /></span>
          @if (directLink()) {
            <h2>Reset link ready</h2>
            <p class="muted">
              This copy of Folio keeps accounts on this device, so we can’t send email. Use the secure one-time link below within 30 minutes.
            </p>
            <button type="button" class="btn btn-primary btn-lg" (click)="openLink()">Choose a new password</button>
          } @else {
            <h2>Check your email</h2>
            <p class="muted">
              If an account exists for <strong>{{ form.controls.email.value }}</strong>, you’ll receive a link to reset your password in the next few minutes.
            </p>
          }
          <a routerLink="/login" class="btn btn-ghost">Back to sign in</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (error()) {
            <div class="alert alert-error" role="alert"><app-icon name="alert" [size]="18" />{{ error() }}</div>
          }
          <div class="field">
            <label class="field-label" for="email">Email</label>
            <input
              id="email"
              class="input"
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
              placeholder="you@example.com"
              [attr.aria-invalid]="showError()"
              aria-describedby="email-error"
            />
            @if (showError()) {
              <span class="field-error" id="email-error">Enter a valid email address.</span>
            }
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block submit" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner" aria-hidden="true"></span> Sending…
            } @else {
              Send reset link
            }
          </button>
        </form>
        <p class="switch">Remembered it? <a routerLink="/login" class="link">Back to sign in</a></p>
      }
    </app-auth-shell>
  `,
  styleUrl: './auth-form.css',
})
export class ForgotPasswordPage {
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
