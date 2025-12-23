import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Profile } from '../../models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <nav class="dashboard-nav">
        <div class="nav-content">
          <div class="logo">
            <h2>AuthApp Admin</h2>
          </div>
          <div class="nav-actions">
            <button (click)="logout()" class="btn btn-secondary">Logout</button>
          </div>
        </div>
      </nav>

      <main class="admin-main">
        <div class="container">
          <div class="header-section">
            <h1>User Management</h1>
            <p class="subtitle">Manage all user accounts and permissions</p>
          </div>

          <div class="stats-row">
            <div class="stat-box">
              <div class="stat-number">{{ profiles.length }}</div>
              <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">{{ getActiveUsersCount() }}</div>
              <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">{{ getAdminCount() }}</div>
              <div class="stat-label">Admins</div>
            </div>
          </div>

          <div class="table-card">
            <div class="table-header">
              <h2>All Users</h2>
              <button (click)="loadProfiles()" class="btn btn-text" [disabled]="loading">
                <span *ngIf="!loading">🔄 Refresh</span>
                <span *ngIf="loading">Loading...</span>
              </button>
            </div>

            <div class="error-message" *ngIf="errorMessage">
              {{ errorMessage }}
            </div>

            <div class="success-message" *ngIf="successMessage">
              {{ successMessage }}
            </div>

            <div class="table-container">
              <table class="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let profile of profiles">
                    <td>
                      <div class="user-info">
                        <div class="user-avatar">{{ getInitials(profile.full_name) }}</div>
                        <span>{{ profile.full_name || 'N/A' }}</span>
                      </div>
                    </td>
                    <td>{{ profile.email }}</td>
                    <td>
                      <span class="badge" [class.badge-admin]="profile.role === 'admin'" [class.badge-user]="profile.role === 'user'">
                        {{ profile.role }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" [class.badge-active]="profile.is_active" [class.badge-inactive]="!profile.is_active">
                        {{ profile.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td>{{ formatDate(profile.created_at) }}</td>
                    <td>
                      <div class="action-buttons">
                        <button
                          (click)="toggleUserStatus(profile)"
                          class="btn btn-sm"
                          [class.btn-danger]="profile.is_active"
                          [class.btn-success]="!profile.is_active"
                          [disabled]="profile.id === currentUserId"
                        >
                          {{ profile.is_active ? 'Disable' : 'Enable' }}
                        </button>
                        <button
                          (click)="toggleUserRole(profile)"
                          class="btn btn-sm btn-outline"
                          [disabled]="profile.id === currentUserId"
                        >
                          {{ profile.role === 'admin' ? 'Make User' : 'Make Admin' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div *ngIf="profiles.length === 0 && !loading" class="empty-state">
                <p>No users found</p>
              </div>
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
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo h2 {
      margin: 0;
      color: #7c3aed;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .nav-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .admin-main {
      padding: 3rem 2rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header-section {
      margin-bottom: 2rem;
    }

    .header-section h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #6b7280;
      font-size: 1.125rem;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-box {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .stat-number {
      font-size: 2.5rem;
      font-weight: 700;
      color: #7c3aed;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: #6b7280;
      font-size: 0.95rem;
    }

    .table-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .table-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
    }

    .table-container {
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table thead {
      background: #f9fafb;
    }

    .users-table th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #6b7280;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .users-table td {
      padding: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-admin {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-user {
      background: #dbeafe;
      color: #1e40af;
    }

    .badge-active {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-inactive {
      background: #fee2e2;
      color: #991b1b;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #059669;
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      color: #6b7280;
    }

    .error-message {
      margin: 1rem 2rem;
      padding: 0.75rem;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .success-message {
      margin: 1rem 2rem;
      padding: 0.75rem;
      background: #d1fae5;
      color: #065f46;
      border-radius: 8px;
      font-size: 0.875rem;
    }

    @media (max-width: 1024px) {
      .table-container {
        overflow-x: scroll;
      }

      .users-table {
        min-width: 900px;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  profiles: Profile[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  currentUserId = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUserId = currentUser.id;
    }
    this.loadProfiles();
  }

  async loadProfiles() {
    this.loading = true;
    this.errorMessage = '';

    const result = await this.authService.getAllProfiles();

    if (result.data) {
      this.profiles = result.data;
    } else {
      this.errorMessage = result.error || 'Failed to load profiles';
    }

    this.loading = false;
  }

  async toggleUserStatus(profile: Profile) {
    this.errorMessage = '';
    this.successMessage = '';

    const result = await this.authService.adminUpdateProfile(profile.id, {
      is_active: !profile.is_active
    });

    if (result.success) {
      this.successMessage = `User ${profile.is_active ? 'disabled' : 'enabled'} successfully`;
      await this.loadProfiles();
      setTimeout(() => this.successMessage = '', 3000);
    } else {
      this.errorMessage = result.error || 'Failed to update user status';
    }
  }

  async toggleUserRole(profile: Profile) {
    this.errorMessage = '';
    this.successMessage = '';

    const newRole = profile.role === 'admin' ? 'user' : 'admin';

    const result = await this.authService.adminUpdateProfile(profile.id, {
      role: newRole
    });

    if (result.success) {
      this.successMessage = `User role updated to ${newRole} successfully`;
      await this.loadProfiles();
      setTimeout(() => this.successMessage = '', 3000);
    } else {
      this.errorMessage = result.error || 'Failed to update user role';
    }
  }

  getActiveUsersCount(): number {
    return this.profiles.filter(p => p.is_active).length;
  }

  getAdminCount(): number {
    return this.profiles.filter(p => p.role === 'admin').length;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }
}
