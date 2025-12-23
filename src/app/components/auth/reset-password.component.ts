import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>Create New Password</h1>
          <p>Enter your new password below</p>
        </div>

        <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label for="password">New Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="Enter new password"
              [class.error]="passwordForm.get('password')?.invalid && passwordForm.get('password')?.touched"
            />
            <div class="error-message" *ngIf="passwordForm.get('password')?.invalid && passwordForm.get('password')?.touched">
              <span *ngIf="passwordForm.get('password')?.errors?.['required']">Password is required</span>
              <span *ngIf="passwordForm.get('password')?.errors?.['minlength']">Password must be at least 6 characters</span>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              formControlName="confirmPassword"
              placeholder="Confirm new password"
              [class.error]="passwordForm.get('confirmPassword')?.invalid && passwordForm.get('confirmPassword')?.touched"
            />
            <div class="error-message" *ngIf="passwordForm.get('confirmPassword')?.invalid && passwordForm.get('confirmPassword')?.touched">
              <span *ngIf="passwordForm.get('confirmPassword')?.errors?.['required']">Please confirm your password</span>
            </div>
            <div class="error-message" *ngIf="passwordForm.errors?.['passwordMismatch'] && passwordForm.get('confirmPassword')?.touched">
              Passwords do not match
            </div>
          </div>

          <div class="success-message" *ngIf="successMessage">
            {{ successMessage }}
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading || passwordForm.invalid">
            <span *ngIf="!loading">Reset Password</span>
            <span *ngIf="loading" class="loader">Resetting...</span>
          </button>
        </form>

        <div class="auth-footer">
          <p><a routerLink="/login" class="link-primary">Back to login</a></p>
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

    .success-message {
      background-color: #d1fae5;
      color: #065f46;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.875rem;
      border: 1px solid #10b981;
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
export class ResetPasswordComponent {
  passwordForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  async onSubmit() {
    if (this.passwordForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const result = await this.authService.updatePassword({
      password: this.passwordForm.value.password
    });

    if (result.success) {
      this.successMessage = 'Password updated successfully! Redirecting to login...';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } else {
      this.errorMessage = result.error || 'Failed to update password';
      this.loading = false;
    }
  }
}
