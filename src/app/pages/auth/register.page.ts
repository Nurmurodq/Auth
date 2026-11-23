import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { safeReturnUrl } from '../../guards';
import { AuthService } from '../../services/auth/auth.service';
import { friendlyAuthError } from '../../services/auth/auth-backend';
import { IconComponent } from '../../shared/icon.component';
import { MIN_PASSWORD_LENGTH, passwordStrength } from '../../utils/password';
import { savePendingVerification } from '../../utils/pending-verification';
import { AuthShellComponent } from './auth-shell.component';
import { GoogleButtonComponent } from './google-button.component';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, IconComponent, GoogleButtonComponent],
  template: `
    <app-auth-shell heading="Start your library" subheading="Free forever. Save favourites, track progress and bookmark passages.">
      <app-google-button class="social" [next]="destination()" label="Sign up with Google" dividerText="or sign up with email" />
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (error()) {
          <div class="alert alert-error" role="alert"><app-icon name="alert" [size]="18" />{{ error() }}</div>
        }

        <div class="field">
          <label class="field-label" for="name">Your name</label>
          <input
            id="name"
            class="input"
            type="text"
            formControlName="name"
            autocomplete="name"
            placeholder="Jane Reader"
            [attr.aria-invalid]="showError('name')"
            aria-describedby="name-error"
          />
          @if (showError('name')) {
            <span class="field-error" id="name-error">Tell us what to call you.</span>
          }
        </div>

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
          <label class="field-label" for="password">Password</label>
          <div class="pw-wrap">
            <input
              id="password"
              class="input"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="new-password"
              [placeholder]="'At least ' + minLength + ' characters'"
              [attr.aria-invalid]="showError('password')"
              aria-describedby="password-help"
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
          <div class="strength" [attr.data-score]="strength().score" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
          <div class="strength-row" id="password-help">
            @if (showError('password')) {
              <span class="field-error">Use at least {{ minLength }} characters.</span>
            } @else {
              <span class="field-hint">Use {{ minLength }}+ characters. Mixing in numbers and symbols makes it stronger.</span>
            }
            <span class="field-hint" aria-live="polite">{{ strength().label }}</span>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block submit" [disabled]="loading()">
          @if (loading()) {
            <span class="spinner" aria-hidden="true"></span> Creating your account…
          } @else {
            Create account
          }
        </button>
        <p class="fine-print">By creating an account you agree to read responsibly and often.</p>
      </form>

      <p class="switch">Already have an account? <a [routerLink]="['/login']" [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : {}" class="link">Sign in</a></p>
    </app-auth-shell>
  `,
  styleUrl: './auth-form.css',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly returnUrl = input<string>();
  protected readonly destination = () => safeReturnUrl(this.returnUrl(), '/');

  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly strength = computed(() => passwordStrength(this.passwordValue()));

  protected showError(name: 'name' | 'email' | 'password'): boolean {
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
      const { name, email, password } = this.form.getRawValue();
      const result = await this.auth.signUp({ name, email, password });
      if (result.needsVerification) {
        // A 6-digit code is on its way; confirm it before the account can be used.
        savePendingVerification({ email: email.trim(), returnUrl: safeReturnUrl(this.returnUrl(), '/'), isNew: true });
        await this.router.navigate(['/verify-email']);
        return;
      }
      // New readers (greeted by name on the next screen) answer a few questions so the library can be tailored to them.
      await this.router.navigate(['/welcome'], { queryParams: { new: 1, returnUrl: safeReturnUrl(this.returnUrl(), '/') } });
    } catch (err) {
      this.error.set(friendlyAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
