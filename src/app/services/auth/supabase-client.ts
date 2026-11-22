import type { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

let client: Promise<SupabaseClient> | null = null;

/** Lazily loads supabase-js so the local backend never ships it in the initial bundle. */
export function getSupabase(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return client;
}
