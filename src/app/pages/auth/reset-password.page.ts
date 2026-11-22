import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { friendlyAuthError } from '../../services/auth/auth-backend';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { MIN_PASSWORD_LENGTH, passwordStrength, passwordsMatch } from '../../utils/password';
import { AuthShellComponent } from './auth-shell.component';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, IconComponent],
  template: `
    <app-auth-shell heading="Choose a new password" subheading="Make it memorable for you and hard to guess for anyone else.">
      @if (checking()) {
        <div class="success-state" aria-busy="true"><span class="spinner" aria-label="Checking your reset link"></span></div>
      } @else if (!valid()) {
        <div class="success-state" role="alert">
          <span class="success-icon error-icon"><app-icon name="alert" [size]="26" /></span>
          <h2>This link has expired</h2>
          <p class="muted">Password reset links work once and expire after 30 minutes. Request a new one to continue.</p>
          <a routerLink="/forgot-password" class="btn btn-primary btn-lg">Request a new link</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (error()) {
            <div class="alert alert-error" role="alert"><app-icon name="alert" [size]="18" />{{ error() }}</div>
          }
          <div class="field">
            <label class="field-label" for="password">New password</label>
            <div class="pw-wrap">
              <input
                id="password"
                class="input"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="new-password"
                [placeholder]="'At least ' + minLength + ' characters'"
                [attr.aria-invalid]="showError('password')"
              />
              <button
                type="button"
                class="icon-btn pw-toggle"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="18" />
              </button>
            </div>
            <div class="strength" [attr.data-score]="strength().score" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
            @if (showError('password')) {
              <span class="field-error">Use at least {{ minLength }} characters.</span>
            }
          </div>
          <div class="field">
            <label class="field-label" for="confirm">Confirm password</label>
            <input
              id="confirm"
              class="input"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="confirm"
              autocomplete="new-password"
              [attr.aria-invalid]="mismatch()"
            />
            @if (mismatch()) {
              <span class="field-error">Passwords don’t match.</span>
            }
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block submit" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner" aria-hidden="true"></span> Saving…
            } @else {
              Save new password
            }
          </button>
        </form>
      }
    </app-auth-shell>
  `,
  styleUrl: './auth-form.css',
  styles: `
    .error-icon {
      background: var(--danger-soft);
      color: var(--danger);
    }
  `,
})
export class ResetPasswordPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly token = input<string>();
  readonly email = input<string>();

  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly checking = signal(true);
  protected readonly valid = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly strength = computed(() => passwordStrength(this.passwordValue()));

  async ngOnInit(): Promise<void> {
    try {
      this.valid.set(await this.auth.canResetPassword(this.params()));
    } finally {
      this.checking.set(false);
    }
  }

  protected showError(name: 'password' | 'confirm'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected mismatch(): boolean {
    return !!this.form.errors?.['mismatch'] && (this.form.controls.confirm.touched || this.submitted());
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
      const user = await this.auth.completePasswordReset(this.form.getRawValue().password, this.params());
      if (user) {
        this.toast.success('Password updated. You’re signed in.');
        await this.router.navigateByUrl('/library');
      } else {
        this.toast.success('Password updated. Sign in with your new password.');
        await this.router.navigateByUrl('/login');
      }
    } catch (err) {
      this.error.set(friendlyAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }

  private params(): Record<string, string> {
    return { token: this.token() ?? '', email: this.email() ?? '' };
  }
}
