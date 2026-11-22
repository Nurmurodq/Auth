import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards';
import { CatalogService } from './services/catalog.service';

const bookTitle = (route: ActivatedRouteSnapshot) => {
  const book = inject(CatalogService).get(route.paramMap.get('id') ?? '');
  return book ? `${book.title} by ${book.author}` : 'Book not found';
};

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
  { path: 'browse', title: 'Browse the library', loadComponent: () => import('./pages/browse/browse.page').then((m) => m.BrowsePage) },
  { path: 'book/:id', title: bookTitle, loadComponent: () => import('./pages/book/book.page').then((m) => m.BookPage) },
  {
    path: 'read/:id',
    title: bookTitle,
    data: { layout: 'immersive' },
    loadComponent: () => import('./pages/reader/reader.page').then((m) => m.ReaderPage),
  },
  {
    path: 'library',
    title: 'My Library',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/library/library.page').then((m) => m.LibraryPage),
  },
  {
    path: 'account',
    title: 'Account & reading stats',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/account/account.page').then((m) => m.AccountPage),
  },
  {
    path: 'login',
    title: 'Sign in',
    data: { layout: 'bare' },
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'Create your account',
    data: { layout: 'bare' },
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'auth/callback',
    title: 'Signing in',
    data: { layout: 'bare' },
    loadComponent: () => import('./pages/auth/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'welcome',
    title: 'Welcome to Folio',
    data: { layout: 'bare' },
    canActivate: [authGuard],
    loadComponent: () => import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'forgot-password',
    title: 'Reset your password',
    data: { layout: 'bare' },
    loadComponent: () => import('./pages/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    title: 'Choose a new password',
    data: { layout: 'bare' },
    loadComponent: () => import('./pages/auth/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  { path: '**', title: 'Page not found', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage) },
];
