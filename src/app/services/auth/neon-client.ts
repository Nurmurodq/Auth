import { environment } from '../../../environments/environment';

/* Minimal typings for the parts of the Neon (Better Auth) client this app uses. */

export interface NeonResult<T> {
  data: T | null;
  error: { message?: string; code?: string; status?: number } | null;
}

export interface NeonAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  createdAt: string | Date;
}

export interface NeonSessionData {
  user: NeonAuthUser;
  session: { token?: string; expiresAt?: string | Date };
}

export interface NeonAuthApi {
  signUp: { email(input: { email: string; password: string; name: string }): Promise<NeonResult<{ user: NeonAuthUser }>> };
  signIn: {
    email(input: { email: string; password: string }): Promise<NeonResult<{ user: NeonAuthUser }>>;
    social(input: {
      provider: 'google';
      callbackURL: string;
      newUserCallbackURL?: string;
      errorCallbackURL?: string;
    }): Promise<NeonResult<{ url?: string; redirect?: boolean }>>;
  };
  signOut(): Promise<NeonResult<unknown>>;
  emailOtp: {
    verifyEmail(input: { email: string; otp: string }): Promise<NeonResult<{ status?: boolean; user?: NeonAuthUser }>>;
    sendVerificationOtp(input: { email: string; type: 'email-verification' | 'sign-in' | 'forget-password' }): Promise<NeonResult<unknown>>;
  };
  getSession(): Promise<NeonResult<NeonSessionData | null>>;
  updateUser(input: { name?: string }): Promise<NeonResult<unknown>>;
  changePassword(input: { currentPassword: string; newPassword: string; revokeOtherSessions?: boolean }): Promise<NeonResult<unknown>>;
  requestPasswordReset(input: { email: string; redirectTo: string }): Promise<NeonResult<unknown>>;
  resetPassword(input: { newPassword: string; token: string }): Promise<NeonResult<unknown>>;
  useSession?: { subscribe(listener: (value: { data: NeonSessionData | null; isPending: boolean }) => void): () => void };
}

/** PostgREST-style query client (shared shape with supabase-js). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataClient = { from(table: string): any };

export interface NeonClient extends DataClient {
  auth: NeonAuthApi;
}

let client: Promise<NeonClient> | null = null;

/** Lazily loads @neon/neon-js so other backends never ship it in their bundles. */
export function getNeon(): Promise<NeonClient> {
  client ??= import('@neon/neon-js').then(({ createClient }) => createClient(environment.neonUrl) as unknown as NeonClient);
  return client;
}
