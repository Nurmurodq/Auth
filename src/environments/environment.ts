/**
 * Runtime configuration.
 *
 * backend: 'neon'     – (default) Neon Managed Better Auth: email/password and Google sign-in,
 *                       with library, progress, bookmarks and reading profile synced through the
 *                       Neon Data API (row-level security per user). Schema: neon/migrations.
 *          'supabase' – Supabase Auth + Postgres. Schema: supabase/migrations.
 *          'local'    – accounts and reading data live in this browser (no server needed).
 *
 * All values here are public by design: the Neon URL and Supabase anon key are safe to ship
 * to browsers because every table is protected by row-level security.
 */
export const environment: {
  backend: 'local' | 'supabase' | 'neon';
  /** Neon database URL without credentials: https://<endpoint>.<region>.aws.neon.tech/<db>. */
  neonUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** Set to true once the Google provider is enabled in your Supabase dashboard. */
  supabaseGoogle: boolean;
} = {
  backend: 'neon',
  neonUrl: 'https://ep-lingering-fog-ar4uglrw.c-4.us-west-2.aws.neon.tech/neondb',
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseGoogle: false,
};
