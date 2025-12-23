import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthUser } from '../../models/user.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <nav class="dashboard-nav">
        <div class="nav-content">
          <div class="logo">
            <h2>AuthApp</h2>
          </div>
          <div class="nav-actions">
            <a routerLink="/user/dashboard" class="btn btn-text">Dashboard</a>
            <button (click)="logout()" class="btn btn-secondary">Logout</button>
          </div>
        </div>
      </nav>

      <main class="profile-main">
        <div class="container">
          <div class="profile-header">
            <h1>My Profile</h1>
            <p class="subtitle">Manage your personal information</p>
          </div>

          <div class="profile-content">
            <div class="profile-card">
              <div class="card-header">
                <h2>Profile Information</h2>
              </div>

              <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="profile-form">
                <div class="form-row">
                  <div class="form-group">
                    <label for="full_name">Full Name</label>
                    <input
                      id="full_name"
                      type="text"
                      formControlName="full_name"
                      placeholder="Enter your full name"
                      [class.error]="profileForm.get('full_name')?.invalid && profileForm.get('full_name')?.touched"
                    />
                    <div class="error-message" *ngIf="profileForm.get('full_name')?.invalid && profileForm.get('full_name')?.touched">
                      <span *ngIf="profileForm.get('full_name')?.errors?.['required']">Full name is required</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="email">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      formControlName="email"
                      placeholder="Your email"
                      [disabled]="true"
                    />
                    <small class="help-text">Email cannot be changed</small>
                  </div>
                </div>

                <div class="form-group">
                  <label for="avatar_url">Avatar URL</label>
                  <input
                    id="avatar_url"
                    type="url"
                    formControlName="avatar_url"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <div class="form-info">
                  <div class="info-item">
                    <span class="info-label">Account Type:</span>
                    <span class="info-value">{{ user?.profile?.role }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="info-value" [class.active]="user?.profile?.is_active" [class.inactive]="!user?.profile?.is_active">
                      {{ user?.profile?.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Member Since:</span>
                    <span class="info-value">{{ formatDate(user?.profile?.created_at) }}</span>
                  </div>
                </div>

                <div class="success-message" *ngIf="successMessage">
                  {{ successMessage }}
                </div>

                <div class="error-message" *ngIf="errorMessage">
                  {{ errorMessage }}
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn btn-primary" [disabled]="loading || profileForm.invalid || !profileForm.dirty">
                    <span *ngIf="!loading">Save Changes</span>
                    <span *ngIf="loading">Saving...</span>
                  </button>
                  <button type="button" class="btn btn-outline" (click)="resetForm()" [disabled]="loading">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #f3f4f6;
    }

    .dashboard-nav {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 1rem 0;
    }

    .nav-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo h2 {
      margin: 0;
      color: #2563eb;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .nav-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .profile-main {
      padding: 3rem 2rem;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .profile-header {
      margin-bottom: 2rem;
    }

    .profile-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #6b7280;
      font-size: 1rem;
    }

    .profile-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .card-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .card-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
    }

    .profile-form {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
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

    .form-group input:disabled {
      background: #f9fafb;
      cursor: not-allowed;
    }

    .form-group input.error {
      border-color: #ef4444;
    }

    .help-text {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .form-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 8px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .info-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .info-value {
      color: #1f2937;
      font-weight: 500;
    }

    .info-value.active {
      color: #10b981;
    }

    .info-value.inactive {
      color: #ef4444;
    }

    .error-message {
      color: #ef4444;
      font-size: 0.875rem;
      padding: 0.75rem;
      background: #fee2e2;
      border-radius: 8px;
      border: 1px solid #fecaca;
    }

    .success-message {
      color: #065f46;
      font-size: 0.875rem;
      padding: 0.75rem;
      background: #d1fae5;
      border-radius: 8px;
      border: 1px solid #10b981;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .form-actions button {
        width: 100%;
      }
    }
  `]
})
export class UserProfileComponent implements OnInit {
  profileForm: FormGroup;
  user: AuthUser | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      full_name: ['', [Validators.required]],
      email: [''],
      avatar_url: ['']
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user?.profile) {
        this.profileForm.patchValue({
          full_name: user.profile.full_name,
          email: user.email,
          avatar_url: user.profile.avatar_url || ''
        });
        this.profileForm.markAsPristine();
      }
    });
  }

  async onSubmit() {
    if (this.profileForm.invalid || !this.user) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { email, ...updateData } = this.profileForm.value;

    const result = await this.authService.updateProfile(this.user.id, updateData);

    if (result.success) {
      this.successMessage = 'Profile updated successfully!';
      this.profileForm.markAsPristine();
    } else {
      this.errorMessage = result.error || 'Failed to update profile';
    }

    this.loading = false;
  }

  resetForm() {
    if (this.user?.profile) {
      this.profileForm.patchValue({
        full_name: this.user.profile.full_name,
        email: this.user.email,
        avatar_url: this.user.profile.avatar_url || ''
      });
      this.profileForm.markAsPristine();
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }
}
