import { User } from '../../models/user.model';
import { readJson, removeKey, storageKey, writeJson } from '../../utils/storage';
import { uid } from '../../utils/text';
import { AuthBackend, AuthError, ResetRequestResult, SignUpInput, SignUpResult, SocialProvider } from './auth-backend';

interface StoredAccount {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  salt: string;
  hash: string;
  iterations: number;
  reset?: { tokenHash: string; expiresAt: number };
}

interface StoredSession {
  userId: string;
  createdAt: string;
}

const ACCOUNTS_KEY = 'accounts';
const SESSION_KEY = 'session';
const ITERATIONS = 210_000;
const RESET_TTL_MS = 30 * 60 * 1000;

/**
 * Browser-only authentication. Accounts are stored in localStorage with
 * PBKDF2-SHA-256 password hashes (never plain text), and the session is shared
 * across tabs via the storage event. Suitable for single-device use and demos;
 * switch to the Supabase backend for real multi-device accounts.
 */
export class LocalAuthBackend implements AuthBackend {
  readonly kind = 'local' as const;
  /** Social sign-in needs a server-side OAuth client, which the browser-only backend doesn't have. */
  readonly socialProviders: readonly SocialProvider[] = [];
  /** The browser-only backend can't send email, so addresses aren't verified. */
  readonly verifiesEmail = false;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    window.addEventListener('storage', (e) => {
      if (e.key === storageKey(SESSION_KEY) || e.key === storageKey(ACCOUNTS_KEY)) {
        const user = this.currentUser();
        this.listeners.forEach((l) => l(user));
      }
    });
  }

  async restore(): Promise<User | null> {
    return this.currentUser();
  }

  onExternalChange(listener: (user: User | null) => void): void {
    this.listeners.push(listener);
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const email = input.email.trim().toLowerCase();
    const accounts = this.accounts();
    if (accounts.some((a) => a.email === email)) {
      throw new AuthError('An account with this email already exists. Try signing in instead.', 'exists');
    }
    const salt = randomBytes(16);
    const account: StoredAccount = {
      id: uid(),
      email,
      name: input.name.trim(),
      createdAt: new Date().toISOString(),
      salt: toBase64(salt),
      hash: await hashPassword(input.password, salt, ITERATIONS),
      iterations: ITERATIONS,
    };
    writeJson(ACCOUNTS_KEY, [...accounts, account]);
    this.startSession(account.id);
    return { user: toUser(account), needsVerification: false };
  }

  async signIn(email: string, password: string): Promise<User> {
    const account = this.accounts().find((a) => a.email === email.trim().toLowerCase());
    // Hash even when the account is missing so timing doesn't reveal which emails exist.
    const salt = account ? fromBase64(account.salt) : randomBytes(16);
    const hash = await hashPassword(password, salt, account?.iterations ?? ITERATIONS);
    if (!account || !timingSafeEqual(hash, account.hash)) {
      throw new AuthError('That email and password don’t match our records.', 'invalid_credentials');
    }
    this.startSession(account.id);
    return toUser(account);
  }

  async verifyEmail(): Promise<User | null> {
    throw new AuthError('Email verification isn’t available in local mode.', 'unsupported');
  }

  async resendVerification(): Promise<void> {
    throw new AuthError('Email verification isn’t available in local mode.', 'unsupported');
  }

  async signInWithProvider(): Promise<void> {
    throw new AuthError('Google sign-in isn’t available in local mode.', 'unsupported');
  }

  async signOut(): Promise<void> {
    removeKey(SESSION_KEY);
  }

  async requestPasswordReset(email: string): Promise<ResetRequestResult> {
    const accounts = this.accounts();
    const account = accounts.find((a) => a.email === email.trim().toLowerCase());
    if (!account) return {}; // Don't reveal whether the email is registered.
    const token = toBase64Url(randomBytes(24));
    account.reset = { tokenHash: await sha256(token), expiresAt: Date.now() + RESET_TTL_MS };
    writeJson(ACCOUNTS_KEY, accounts);
    const params = new URLSearchParams({ token, email: account.email });
    return { directLink: `/reset-password?${params}` };
  }

  async canResetPassword(params: Record<string, string>): Promise<boolean> {
    return !!(await this.findResetAccount(params));
  }

  async completePasswordReset(newPassword: string, params: Record<string, string>): Promise<void> {
    const accounts = this.accounts();
    const match = await this.findResetAccount(params, accounts);
    if (!match) throw new AuthError('This reset link is invalid or has expired. Please request a new one.', 'invalid_token');
    await this.setPassword(match, newPassword);
    delete match.reset;
    writeJson(ACCOUNTS_KEY, accounts);
    this.startSession(match.id);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const accounts = this.accounts();
    const account = accounts.find((a) => a.id === this.session()?.userId);
    if (!account) throw new AuthError('Your session has ended. Please sign in again.', 'no_session');
    const hash = await hashPassword(currentPassword, fromBase64(account.salt), account.iterations);
    if (!timingSafeEqual(hash, account.hash)) throw new AuthError('Your current password is incorrect.', 'invalid_credentials');
    await this.setPassword(account, newPassword);
    writeJson(ACCOUNTS_KEY, accounts);
  }

  async updateProfile(patch: { name: string }): Promise<User> {
    const accounts = this.accounts();
    const account = accounts.find((a) => a.id === this.session()?.userId);
    if (!account) throw new AuthError('Your session has ended. Please sign in again.', 'no_session');
    account.name = patch.name.trim();
    writeJson(ACCOUNTS_KEY, accounts);
    return toUser(account);
  }

  private async setPassword(account: StoredAccount, password: string): Promise<void> {
    const salt = randomBytes(16);
    account.salt = toBase64(salt);
    account.iterations = ITERATIONS;
    account.hash = await hashPassword(password, salt, ITERATIONS);
  }

  private async findResetAccount(params: Record<string, string>, accounts = this.accounts()): Promise<StoredAccount | undefined> {
    const { token, email } = params;
    if (!token || !email) return undefined;
    const account = accounts.find((a) => a.email === email.toLowerCase());
    if (!account?.reset || account.reset.expiresAt < Date.now()) return undefined;
    return timingSafeEqual(await sha256(token), account.reset.tokenHash) ? account : undefined;
  }

  private accounts(): StoredAccount[] {
    return readJson<StoredAccount[]>(ACCOUNTS_KEY, []);
  }

  private session(): StoredSession | null {
    return readJson<StoredSession | null>(SESSION_KEY, null);
  }

  private currentUser(): User | null {
    const session = this.session();
    const account = session && this.accounts().find((a) => a.id === session.userId);
    return account ? toUser(account) : null;
  }

  private startSession(userId: string): void {
    writeJson(SESSION_KEY, { userId, createdAt: new Date().toISOString() } satisfies StoredSession);
  }
}

function toUser(a: StoredAccount): User {
  return { id: a.id, email: a.email, name: a.name, createdAt: a.createdAt };
}

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new AuthError('Secure sign-in needs HTTPS (or localhost). Please open Folio over a secure connection.', 'insecure_context');
  }
  return crypto.subtle;
}

async function hashPassword(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await subtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return toBase64(new Uint8Array(bits));
}

async function sha256(text: string): Promise<string> {
  const digest = await subtle().digest('SHA-256', new TextEncoder().encode(text));
  return toBase64(new Uint8Array(digest));
}

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
