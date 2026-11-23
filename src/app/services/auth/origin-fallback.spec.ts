import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearOriginFallback, markOriginFallback, originFallbackActive } from '../../config';
import { friendlyAuthError, isOriginError } from './auth-backend';

describe('untrusted web address handling', () => {
  afterEach(() => {
    clearOriginFallback();
    vi.useRealTimers();
  });

  it('recognises the provider rejecting this address', () => {
    expect(isOriginError(new Error('INVALID_ORIGIN: Invalid origin'))).toBe(true);
    expect(isOriginError({ code: 'MISSING_OR_NULL_ORIGIN', message: 'Missing or null Origin' })).toBe(true);
    expect(isOriginError(new Error('INVALID_EMAIL_OR_PASSWORD: Invalid email or password'))).toBe(false);
  });

  it('explains it in plain words instead of showing "Invalid origin"', () => {
    const message = friendlyAuthError(new Error('INVALID_ORIGIN: Invalid origin'));
    expect(message).not.toMatch(/INVALID_ORIGIN/);
    expect(message).toMatch(/web address/);
  });

  it('remembers to use on-device accounts for this address, and re-checks the cloud after a day', () => {
    vi.useFakeTimers({ now: 1_000_000 });
    expect(originFallbackActive(false)).toBe(false);
    markOriginFallback();
    expect(originFallbackActive(false)).toBe(true);
    vi.setSystemTime(1_000_000 + 25 * 60 * 60 * 1000);
    expect(originFallbackActive(false)).toBe(false);
    // …but a reader signed in on this device stays signed in.
    expect(originFallbackActive(true)).toBe(true);
  });
});
