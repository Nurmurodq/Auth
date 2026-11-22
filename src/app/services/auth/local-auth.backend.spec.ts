import { webcrypto } from 'node:crypto';
import { LocalAuthBackend } from './local-auth.backend';

describe('LocalAuthBackend', () => {
  let backend: LocalAuthBackend;

  beforeAll(() => {
    if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto);
  });

  beforeEach(() => {
    localStorage.clear();
    backend = new LocalAuthBackend();
  });

  it('registers, persists a hashed password and restores the session', async () => {
    const { user, needsConfirmation } = await backend.signUp({ name: 'Ada', email: 'Ada@Example.com', password: 'Correct-Horse-42' });
    expect(needsConfirmation).toBe(false);
    expect(user?.email).toBe('ada@example.com');
    expect(localStorage.getItem('folio:accounts')).not.toContain('Correct-Horse-42');
    expect((await backend.restore())?.id).toBe(user?.id);
  });

  it('rejects duplicate emails and wrong passwords', async () => {
    await backend.signUp({ name: 'Ada', email: 'ada@example.com', password: 'Correct-Horse-42' });
    await expect(backend.signUp({ name: 'Ada', email: 'ADA@example.com', password: 'whatever-123' })).rejects.toThrow(/already exists/);
    await backend.signOut();
    expect(await backend.restore()).toBeNull();
    await expect(backend.signIn('ada@example.com', 'nope-nope')).rejects.toThrow(/don’t match/);
    await expect(backend.signIn('nobody@example.com', 'nope-nope')).rejects.toThrow(/don’t match/);
    expect((await backend.signIn('ada@example.com', 'Correct-Horse-42')).name).toBe('Ada');
  });

  it('changes password only with the current one', async () => {
    await backend.signUp({ name: 'Ada', email: 'ada@example.com', password: 'Correct-Horse-42' });
    await expect(backend.changePassword('wrong', 'New-Password-1')).rejects.toThrow(/incorrect/);
    await backend.changePassword('Correct-Horse-42', 'New-Password-1');
    await backend.signOut();
    await expect(backend.signIn('ada@example.com', 'Correct-Horse-42')).rejects.toThrow();
    expect(await backend.signIn('ada@example.com', 'New-Password-1')).toBeTruthy();
  });

  it('resets a password with a one-time token', async () => {
    await backend.signUp({ name: 'Ada', email: 'ada@example.com', password: 'Correct-Horse-42' });
    await backend.signOut();
    expect(await backend.requestPasswordReset('unknown@example.com')).toEqual({});
    const { directLink } = await backend.requestPasswordReset('ada@example.com');
    const params = Object.fromEntries(new URL(directLink!, 'https://folio.test').searchParams);
    expect(await backend.canResetPassword({ ...params, token: 'forged' })).toBe(false);
    expect(await backend.canResetPassword(params)).toBe(true);
    await backend.completePasswordReset('Reset-Password-7', params);
    expect(await backend.canResetPassword(params)).toBe(false);
    await backend.signOut();
    expect(await backend.signIn('ada@example.com', 'Reset-Password-7')).toBeTruthy();
  });

  it('updates the display name', async () => {
    await backend.signUp({ name: 'Ada', email: 'ada@example.com', password: 'Correct-Horse-42' });
    expect((await backend.updateProfile({ name: '  Ada Lovelace ' })).name).toBe('Ada Lovelace');
  });
});
