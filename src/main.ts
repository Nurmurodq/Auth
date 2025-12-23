import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { AuthGuard } from './app/guards/auth.guard';
import { AdminGuard } from './app/guards/admin.guard';

import { LandingComponent } from './app/components/landing/landing.component';
import { LoginComponent } from './app/components/auth/login.component';
import { RegisterComponent } from './app/components/auth/register.component';
import { ForgotPasswordComponent } from './app/components/auth/forgot-password.component';
import { ResetPasswordComponent } from './app/components/auth/reset-password.component';
import { UserDashboardComponent } from './app/components/user/dashboard.component';
import { UserProfileComponent } from './app/components/user/profile.component';
import { AdminDashboardComponent } from './app/components/admin/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class App {}

const routes = [
  {
    path: '',
    component: LandingComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: 'user/dashboard',
    component: UserDashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/profile',
    component: UserProfileComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'admin/dashboard',
    component: AdminDashboardComponent,
    canActivate: [AdminGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

bootstrapApplication(App, {
  providers: [
    provideRouter(routes)
  ]
});
