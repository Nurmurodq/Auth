import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthUser } from '../../models/user.model';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <nav class="dashboard-nav">
        <div class="nav-content">
          <div class="logo">
            <h2>AuthApp</h2>
          </div>
          <div class="nav-actions">
            <a routerLink="/user/profile" class="btn btn-text">Profile</a>
            <button (click)="logout()" class="btn btn-secondary">Logout</button>
          </div>
        </div>
      </nav>

      <main class="dashboard-main">
        <div class="container">
          <div class="welcome-section">
            <h1>Welcome back, {{ user?.profile?.full_name || 'User' }}!</h1>
            <p class="subtitle">Here's your dashboard overview</p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">👤</div>
              <div class="stat-content">
                <h3>Account Type</h3>
                <p class="stat-value">{{ user?.profile?.role || 'User' }}</p>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">✅</div>
              <div class="stat-content">
                <h3>Account Status</h3>
                <p class="stat-value">{{ user?.profile?.is_active ? 'Active' : 'Inactive' }}</p>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">📧</div>
              <div class="stat-content">
                <h3>Email</h3>
                <p class="stat-value">{{ user?.email }}</p>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">📅</div>
              <div class="stat-content">
                <h3>Member Since</h3>
                <p class="stat-value">{{ formatDate(user?.profile?.created_at) }}</p>
              </div>
            </div>
          </div>

          <div class="actions-section">
            <h2>Quick Actions</h2>
            <div class="actions-grid">
              <a routerLink="/user/profile" class="action-card">
                <div class="action-icon">⚙️</div>
                <h3>Manage Profile</h3>
                <p>Update your personal information and settings</p>
              </a>

              <div class="action-card">
                <div class="action-icon">🔐</div>
                <h3>Security</h3>
                <p>Manage your password and security settings</p>
              </div>

              <div class="action-card">
                <div class="action-icon">📊</div>
                <h3>Activity</h3>
                <p>View your recent account activity</p>
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

    .dashboard-main {
      padding: 3rem 2rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-section {
      margin-bottom: 3rem;
    }

    .welcome-section h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #6b7280;
      font-size: 1.125rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .stat-icon {
      font-size: 2.5rem;
    }

    .stat-content h3 {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 0.25rem 0;
      font-weight: 500;
    }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .actions-section h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 1.5rem;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .action-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .action-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .action-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .action-card h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 0.5rem 0;
    }

    .action-card p {
      color: #6b7280;
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .welcome-section h1 {
        font-size: 1.75rem;
      }

      .stats-grid,
      .actions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class UserDashboardComponent implements OnInit {
  user: AuthUser | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
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
