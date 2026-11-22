/**
 * Runtime configuration.
 *
 * backend: 'local'    – accounts and reading data live in this browser (no server needed).
 *          'supabase' – accounts via Supabase Auth; library, progress and bookmarks sync across
 *                       devices. Apply the SQL in supabase/migrations first, then set the URL and
 *                       anon (publishable) key of your project below.
 */
export const environment: {
  backend: 'local' | 'supabase';
  supabaseUrl: string;
  supabaseAnonKey: string;
} = {
  backend: 'local',
  supabaseUrl: 'https://ygkoggewgzuqjogvdgvu.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlna29nZ2V3Z3p1cWpvZ3ZkZ3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MDg2ODUsImV4cCI6MjA4MjA4NDY4NX0.TxMrjV39q_4ojufcS04qmkponN2OYbSD27bAQ6gREIo',
};
