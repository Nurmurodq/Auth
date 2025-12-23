import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="landing-container">
      <header class="landing-header">
        <div class="container">
          <div class="logo">
            <h2>AuthApp</h2>
          </div>
          <nav class="nav-links" *ngIf="!(authService.currentUser$ | async)">
            <a routerLink="/login" class="btn btn-text">Login</a>
            <a routerLink="/register" class="btn btn-primary">Get Started</a>
          </nav>
          <nav class="nav-links" *ngIf="authService.currentUser$ | async as user">
            <a [routerLink]="user.profile?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'" class="btn btn-text">
              Dashboard
            </a>
            <button (click)="logout()" class="btn btn-secondary">Logout</button>
          </nav>
        </div>
      </header>

      <main class="hero-section">
        <div class="container">
          <div class="hero-content">
            <h1 class="hero-title">Secure Authentication System</h1>
            <p class="hero-subtitle">
              A comprehensive role-based authentication platform built with Angular and Supabase
            </p>
            <div class="hero-features">
              <div class="feature">
                <div class="feature-icon">🔐</div>
                <h3>Secure Authentication</h3>
                <p>Industry-standard security with email verification and password reset</p>
              </div>
              <div class="feature">
                <div class="feature-icon">👥</div>
                <h3>Role-Based Access</h3>
                <p>Separate user and admin roles with granular permissions</p>
              </div>
              <div class="feature">
                <div class="feature-icon">⚡</div>
                <h3>Real-Time Updates</h3>
                <p>Powered by Supabase for instant data synchronization</p>
              </div>
            </div>
            <div class="cta-buttons" *ngIf="!(authService.currentUser$ | async)">
              <a routerLink="/register" class="btn btn-primary btn-lg">Create Account</a>
              <a routerLink="/login" class="btn btn-outline btn-lg">Sign In</a>
            </div>
          </div>
        </div>
      </main>

      <footer class="landing-footer">
        <div class="container">
          <p>&copy; 2024 AuthApp. Built with Angular & Supabase.</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .landing-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .landing-header {
      background: #ffffff;
      border-bottom: 1px solid #e5e7eb;
      padding: 1rem 0;
    }

    .container {
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

    .nav-links {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .hero-section {
      flex: 1;
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4rem 0;
    }

    .hero-section .container {
      flex-direction: column;
    }

    .hero-content {
      text-align: center;
      max-width: 900px;
    }

    .hero-title {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      line-height: 1.2;
    }

    .hero-subtitle {
      font-size: 1.25rem;
      margin-bottom: 3rem;
      opacity: 0.95;
      line-height: 1.6;
    }

    .hero-features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .feature {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .feature-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .feature h3 {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .feature p {
      font-size: 0.95rem;
      opacity: 0.9;
      line-height: 1.5;
    }

    .cta-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .landing-footer {
      background: #1f2937;
      color: #9ca3af;
      padding: 2rem 0;
      text-align: center;
    }

    .landing-footer p {
      margin: 0;
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 2rem;
      }

      .hero-subtitle {
        font-size: 1rem;
      }

      .hero-features {
        grid-template-columns: 1fr;
      }

      .cta-buttons {
        flex-direction: column;
      }

      .cta-buttons .btn {
        width: 100%;
      }
    }
  `]
})
export class LandingComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }
}
