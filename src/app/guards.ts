import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth/auth.service';

/** Only signed-in readers may continue; others are sent to sign in and brought back afterwards. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Sign-in and registration pages redirect readers who are already signed in. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  return auth.isAuthenticated() ? router.createUrlTree(['/library']) : true;
};

/** Returns a safe in-app path from a returnUrl query param (never an external URL). */
export function safeReturnUrl(value: string | null | undefined, fallback = '/library'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/^\/(login|register|forgot-password|reset-password)\b/.test(value)) return fallback;
  return value;
}
