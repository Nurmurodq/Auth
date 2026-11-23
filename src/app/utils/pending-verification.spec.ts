import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearPendingVerification, readPendingVerification, savePendingVerification } from './pending-verification';

describe('pending verification', () => {
  afterEach(() => {
    clearPendingVerification();
    vi.useRealTimers();
  });

  it('remembers the address and stamps when the code was sent', () => {
    vi.useFakeTimers({ now: 1_000_000 });
    savePendingVerification({ email: 'ada@example.com', returnUrl: '/browse', isNew: true });
    expect(readPendingVerification()).toEqual({ email: 'ada@example.com', returnUrl: '/browse', isNew: true, sentAt: 1_000_000 });
  });

  it('forgets a sign-up after a day', () => {
    vi.useFakeTimers({ now: 0 });
    savePendingVerification({ email: 'ada@example.com', returnUrl: '/', isNew: true });
    vi.setSystemTime(24 * 60 * 60 * 1000 + 1);
    expect(readPendingVerification()).toBeNull();
  });

  it('can be cleared', () => {
    savePendingVerification({ email: 'ada@example.com', returnUrl: '/', isNew: false });
    clearPendingVerification();
    expect(readPendingVerification()).toBeNull();
  });
});
