import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { friendlyAuthError } from '../../services/auth/auth-backend';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon.component';
import {
  PendingVerification,
  clearPendingVerification,
  readPendingVerification,
  savePendingVerification,
} from '../../utils/pending-verification';
import { AuthShellComponent } from './auth-shell.component';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_S = 60;

/** Second step of email sign-up: enter the one-time code that was emailed to the new address. */
@Component({
  selector: 'app-verify-email',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AuthShellComponent, IconComponent],
  template: `
    <app-auth-shell heading="Check your email" [subheading]="subheading()">
      @if (!pending()) {
        <div class="success-state" role="alert">
          <p class="muted">There’s no sign-up waiting for a code on this device. Start again, or sign in if you’ve already verified.</p>
          <a routerLink="/register" class="btn btn-primary btn-lg">Create an account</a>
          <a routerLink="/login" class="btn btn-ghost">Sign in</a>
        </div>
      } @else {
        <form class="verify" (submit)="$event.preventDefault(); submit()" novalidate>
          <div class="mail-card" aria-hidden="true">
            <span class="mail-icon"><app-icon name="mail" [size]="22" /></span>
            <span class="mail-to">{{ pending()!.email }}</span>
          </div>

          @if (error()) {
            <div class="alert alert-error" role="alert"><app-icon name="alert" [size]="18" />{{ error() }}</div>
          }

          <div class="field">
            <label class="field-label" for="code">6-digit code</label>
            <input
              #codeInput
              id="code"
              class="input code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              pattern="[0-9]*"
              [attr.maxlength]="length"
              placeholder="••••••"
              [value]="code()"
              (input)="onInput($any($event.target))"
              [attr.aria-invalid]="!!error()"
              aria-describedby="code-help"
              [disabled]="verifying()"
            />
            <span class="field-hint" id="code-help">The code expires after a few minutes. Can’t find it? Check your spam or promotions folder.</span>
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="verifying() || code().length !== length">
            @if (verifying()) {
              <span class="spinner" aria-hidden="true"></span> Verifying…
            } @else {
              Verify email
            }
          </button>

          <div class="resend" aria-live="polite">
            @if (cooldown() > 0) {
              <span class="muted">You can request a new code in {{ cooldownLabel() }}</span>
            } @else {
              <span class="muted">Didn’t get it?</span>
              <button type="button" class="link" (click)="resend()" [disabled]="resending()">{{ resending() ? 'Sending…' : 'Send a new code' }}</button>
            }
          </div>
        </form>

        <p class="switch">Wrong address? <button type="button" class="link" (click)="startOver()">Use a different email</button></p>
      }
    </app-auth-shell>
  `,
  styleUrl: './auth-form.css',
  styles: `
    .verify {
      margin-top: 28px;
    }
    .mail-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: var(--radius);
      background: var(--surface);
      min-width: 0;
    }
    .mail-icon {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      flex: none;
      border-radius: 50%;
      background: var(--bg-elevated);
      color: var(--accent-text);
    }
    .mail-to {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .code {
      height: 64px;
      text-align: center;
      font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
      font-size: 1.9rem;
      font-weight: 600;
      letter-spacing: 0.5em;
      padding-left: 0.5em;
    }
    .code::placeholder {
      color: var(--border-strong);
      letter-spacing: 0.5em;
    }
    .resend {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      min-height: 24px;
    }
    .link {
      font-size: inherit;
    }
    .link:disabled {
      opacity: 0.6;
    }
  `,
})
export class VerifyEmailPage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  protected readonly length = CODE_LENGTH;
  protected readonly pending = signal<PendingVerification | null>(readPendingVerification());
  protected readonly code = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly verifying = signal(false);
  protected readonly resending = signal(false);
  protected readonly cooldown = signal(0);
  protected readonly cooldownLabel = computed(() => `0:${String(this.cooldown()).padStart(2, '0')}`);
  protected readonly subheading = computed(() =>
    this.pending() ? 'We’ve sent a 6-digit code to your email. Enter it below to confirm it’s really you.' : '',
  );

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const p = this.pending();
    if (!p) return;
    this.startCooldown(Math.max(0, RESEND_COOLDOWN_S - Math.floor((Date.now() - p.sentAt) / 1000)));
    queueMicrotask(() => this.codeInput()?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected onInput(el: HTMLInputElement): void {
    const digits = el.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    el.value = digits;
    this.code.set(digits);
    if (this.error()) this.error.set(null);
    // Submit automatically once the full code is in (typed, pasted or autofilled).
    if (digits.length === CODE_LENGTH) void this.submit();
  }

  protected async submit(): Promise<void> {
    const p = this.pending();
    if (!p || this.code().length !== CODE_LENGTH || this.verifying()) return;
    this.verifying.set(true);
    this.error.set(null);
    try {
      const user = await this.auth.verifyEmail(p.email, this.code());
      clearPendingVerification();
      if (!user) {
        this.toast.success('Email verified. Please sign in.');
        await this.router.navigate(['/login'], { queryParams: { returnUrl: p.returnUrl } });
        return;
      }
      if (p.isNew) {
        this.toast.success('Email verified — welcome to Folio!');
        await this.router.navigate(['/welcome'], { queryParams: { new: 1, returnUrl: p.returnUrl } });
      } else {
        this.toast.success(`Email verified. Welcome back, ${user.name.split(' ')[0]}.`);
        await this.router.navigateByUrl(p.returnUrl);
      }
    } catch (err) {
      this.error.set(friendlyAuthError(err));
      this.code.set('');
      const input = this.codeInput()?.nativeElement;
      if (input) {
        input.value = '';
        queueMicrotask(() => input.focus());
      }
    } finally {
      this.verifying.set(false);
    }
  }

  protected async resend(): Promise<void> {
    const p = this.pending();
    if (!p || this.cooldown() > 0) return;
    this.resending.set(true);
    this.error.set(null);
    try {
      await this.auth.resendVerification(p.email);
      const next = { ...p, sentAt: Date.now() };
      savePendingVerification(next);
      this.pending.set(next);
      this.startCooldown(RESEND_COOLDOWN_S);
      this.toast.success('A new code is on its way.');
    } catch (err) {
      this.error.set(friendlyAuthError(err));
    } finally {
      this.resending.set(false);
    }
  }

  protected startOver(): void {
    clearPendingVerification();
    void this.router.navigate(['/register']);
  }

  private startCooldown(seconds: number): void {
    if (this.timer) clearInterval(this.timer);
    this.cooldown.set(seconds);
    if (seconds <= 0) return;
    this.timer = setInterval(() => {
      const next = this.cooldown() - 1;
      this.cooldown.set(Math.max(0, next));
      if (next <= 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }, 1000);
  }
}
