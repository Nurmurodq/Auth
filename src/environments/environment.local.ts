/**
 * Browser-only mode (no server): `npm run start:local` / `npm run build:local`.
 * Swapped in for environment.ts by the "local" build configuration; used for offline
 * development and the unit tests.
 */
export const environment: {
  backend: 'local' | 'supabase' | 'neon';
  neonUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseGoogle: boolean;
} = {
  backend: 'local',
  neonUrl: '',
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseGoogle: false,
};
