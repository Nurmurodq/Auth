import { readJson, removeKey, writeJson } from './storage';

/** An email address waiting for its verification code, remembered across reloads and tabs. */
export interface PendingVerification {
  email: string;
  returnUrl: string;
  /** When the most recent code was sent (ms since epoch), for the resend cooldown. */
  sentAt: number;
  /** True when this verification follows a brand-new sign-up (continue to the questionnaire). */
  isNew: boolean;
}

const KEY = 'pending-verification';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function savePendingVerification(p: Omit<PendingVerification, 'sentAt'> & { sentAt?: number }): void {
  writeJson(KEY, { ...p, sentAt: p.sentAt ?? Date.now() });
}

export function readPendingVerification(): PendingVerification | null {
  const p = readJson<PendingVerification | null>(KEY, null);
  if (!p?.email || Date.now() - (p.sentAt ?? 0) > MAX_AGE_MS) return null;
  return p;
}

export function clearPendingVerification(): void {
  removeKey(KEY);
}
