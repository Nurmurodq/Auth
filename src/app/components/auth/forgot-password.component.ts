import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>Reset Password</h1>
          <p>Enter your email to receive a password reset link</p>
        </div>

        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="auth-form" *ngIf="!emailSent">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="Enter your email"
              [class.error]="resetForm.get('email')?.invalid && resetForm.get('email')?.touched"
            />
            <div class="error-message" *ngIf="resetForm.get('email')?.invalid && resetForm.get('email')?.touched">
              <span *ngIf="resetForm.get('email')?.errors?.['required']">Email is required</span>
              <span *ngIf="resetForm.get('email')?.errors?.['email']">Invalid email format</span>
            </div>
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading || resetForm.invalid">
            <span *ngIf="!loading">Send Reset Link</span>
            <span *ngIf="loading" class="loader">Sending...</span>
          </button>
        </form>

        <div class="success-card" *ngIf="emailSent">
          <div class="success-icon">✓</div>
          <h2>Check Your Email</h2>
          <p>We've sent a password reset link to <strong>{{ resetForm.get('email')?.value }}</strong></p>
          <p class="help-text">Click the link in the email to reset your password. The link will expire in 1 hour.</p>
        </div>

        <div class="auth-footer">
          <p>Remember your password? <a routerLink="/login" class="link-primary">Sign in</a></p>
          <p><a routerLink="/" class="link-text">Back to home</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .auth-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 3rem;
      width: 100%;
      max-width: 450px;
    }

    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .auth-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .auth-header p {
      color: #6b7280;
      font-size: 1rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
    }

    .form-group input {
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group input.error {
      border-color: #ef4444;
    }

    .error-message {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .success-card {
      text-align: center;
      padding: 2rem 0;
    }

    .success-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 3rem;
      font-weight: 700;
    }

    .success-card h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 1rem;
    }

    .success-card p {
      color: #6b7280;
      margin-bottom: 0.75rem;
      line-height: 1.6;
    }

    .success-card strong {
      color: #1f2937;
      font-weight: 600;
    }

    .help-text {
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .link-text {
      color: #6b7280;
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.2s;
    }

    .link-text:hover {
      color: #374151;
    }

    .link-primary {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }

    .link-primary:hover {
      color: #5568d3;
    }

    .auth-footer {
      margin-top: 2rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .auth-footer p {
      margin: 0.5rem 0;
    }

    .loader {
      display: inline-block;
    }

    @media (max-width: 640px) {
      .auth-card {
        padding: 2rem;
      }

      .auth-header h1 {
        font-size: 1.5rem;
      }
    }
  `]
})
export class ForgotPasswordComponent {
  resetForm: FormGroup;
  loading = false;
  errorMessage = '';
  emailSent = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async onSubmit() {
    if (this.resetForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const result = await this.authService.resetPassword(this.resetForm.value);

    if (result.success) {
      this.emailSent = true;
    } else {
      this.errorMessage = result.error || 'Failed to send reset link';
    }

    this.loading = false;
  }
}
