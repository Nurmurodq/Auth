import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { safeReturnUrl } from '../../guards';
import { AuthService } from '../../services/auth/auth.service';
import { friendlyAuthError } from '../../services/auth/auth-backend';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { AuthShellComponent } from './auth-shell.component';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, IconComponent],
  template: `
    <app-auth-shell heading="Welcome back" subheading="Sign in to pick up right where you left off.">
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
            [attr.aria-invalid]="showError('email')"
            aria-describedby="email-error"
          />
          @if (showError('email')) {
            <span class="field-error" id="email-error">Enter a valid email address.</span>
          }
        </div>

        <div class="field">
          <div class="label-row">
            <label class="field-label" for="password">Password</label>
            <a routerLink="/forgot-password" class="link">Forgot password?</a>
          </div>
          <div class="pw-wrap">
            <input
              id="password"
              class="input"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              placeholder="Your password"
              [attr.aria-invalid]="showError('password')"
              aria-describedby="password-error"
            />
            <button
              type="button"
              class="icon-btn pw-toggle"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              [attr.aria-pressed]="showPassword()"
            >
              <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="18" />
            </button>
          </div>
          @if (showError('password')) {
            <span class="field-error" id="password-error">Enter your password.</span>
          }
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block submit" [disabled]="loading()">
          @if (loading()) {
            <span class="spinner" aria-hidden="true"></span> Signing in…
          } @else {
            Sign in
          }
        </button>
      </form>

      <p class="switch">New to Folio? <a [routerLink]="['/register']" [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : {}" class="link">Create a free account</a></p>
    </app-auth-shell>
  `,
  styleUrl: './auth-form.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly returnUrl = input<string>();

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected showError(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const user = await this.auth.signIn(email, password);
      this.toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (err) {
      this.error.set(friendlyAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
