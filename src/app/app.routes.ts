import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards';
import { CatalogService } from './services/catalog.service';

/** Route titles are message keys ("title.*") or "book:<id>"; AppTitleStrategy translates them. */
const bookTitle = (route: ActivatedRouteSnapshot) => {
  const book = inject(CatalogService).get(route.paramMap.get('id') ?? '');
  return book ? `book:${book.id}` : 'title.bookMissing';
};

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
  { path: 'browse', title: 'title.browse', loadComponent: () => import('./pages/browse/browse.page').then((m) => m.BrowsePage) },
  { path: 'book/:id', title: bookTitle, loadComponent: () => import('./pages/book/book.page').then((m) => m.BookPage) },
  {
    path: 'read/:id',
    title: bookTitle,
    data: { layout: 'immersive' },
    loadComponent: () => import('./pages/reader/reader.page').then((m) => m.ReaderPage),
  },
  {
    path: 'library',
    title: 'title.library',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/library/library.page').then((m) => m.LibraryPage),
  },
  {
    path: 'account',
    title: 'title.account',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/account/account.page').then((m) => m.AccountPage),
  },
  {
    path: 'login',
    title: 'title.signIn',
    data: { layout: 'bare' },
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'title.register',
    data: { layout: 'bare' },
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'verify-email',
    title: 'title.verify',
    data: { layout: 'bare' },
    loadComponent: () => import('./pages/auth/verify-email.page').then((m) => m.VerifyEmailPage),
  },
  {
    path: 'auth/callback',
    title: 'title.callback',
    data: { layout: 'bare' },
    loadComponent: () => import('./pages/auth/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'welcome',
    title: 'title.welcome',
    data: { layout: 'bare' },
    canActivate: [authGuard],
    loadComponent: () => import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'forgot-password',
    title: 'title.forgot',
    data: { layout: 'bare' },
    loadComponent: () => import('./pages/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    title: 'title.reset',
    data: { layout: 'bare' },
    loadComponent: () => import('./pages/auth/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  { path: '**', title: 'title.notFound', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage) },
];
