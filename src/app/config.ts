import { environment } from '../environments/environment';

export const APP_NAME = 'Folio';

/** Average adult silent-reading speed used for time estimates. */
export const WORDS_PER_MINUTE = 238;

/** Words on a typical printed page, used for page estimates. */
export const WORDS_PER_PAGE = 275;

export type BackendKind = 'local' | 'supabase' | 'neon';

function resolveBackend(): BackendKind {
  if (environment.backend === 'neon' && environment.neonUrl) return 'neon';
  if (environment.backend === 'supabase' && environment.supabaseUrl && environment.supabaseAnonKey) return 'supabase';
  return 'local';
}

export const BACKEND: BackendKind = resolveBackend();

/*
 * Cloud sign-in only accepts requests from the web addresses listed as trusted in the auth
 * provider (Neon Auth → Trusted domains; localhost is always allowed). When Folio runs somewhere
 * that isn't listed, the provider rejects sign-up and sign-in with "Invalid origin". Rather than
 * leave readers stuck, Folio then keeps accounts on the device for that address, and tries the
 * cloud again the next day in case the address has since been added.
 */
const ORIGIN_FALLBACK_KEY = 'folio:auth-origin-fallback';
const ORIGIN_RECHECK_MS = 24 * 60 * 60 * 1000;

interface OriginFallback {
  origin: string;
  since: number;
}

function readOriginFallback(): OriginFallback | null {
  try {
    const value = JSON.parse(localStorage.getItem(ORIGIN_FALLBACK_KEY) ?? 'null') as OriginFallback | null;
    return value?.origin === location.origin ? value : null;
  } catch {
    return null;
  }
}

/**
 * Whether this address should use on-device accounts. `hasLocalSession` keeps a reader who signed
 * in on the device signed in, even after the daily re-check window.
 */
export function originFallbackActive(hasLocalSession: boolean): boolean {
  const fallback = readOriginFallback();
  if (!fallback) return false;
  return hasLocalSession || Date.now() - fallback.since < ORIGIN_RECHECK_MS;
}

export function markOriginFallback(): void {
  try {
    localStorage.setItem(ORIGIN_FALLBACK_KEY, JSON.stringify({ origin: location.origin, since: Date.now() } satisfies OriginFallback));
  } catch {
    /* storage unavailable: the fallback still applies for this visit */
  }
}

export function clearOriginFallback(): void {
  try {
    localStorage.removeItem(ORIGIN_FALLBACK_KEY);
  } catch {
    /* ignore */
  }
}
