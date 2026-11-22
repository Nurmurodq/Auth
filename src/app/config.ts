import { environment } from '../environments/environment';

export const APP_NAME = 'Folio';

/** Average adult silent-reading speed used for time estimates. */
export const WORDS_PER_MINUTE = 238;

/** Words on a typical printed page, used for page estimates. */
export const WORDS_PER_PAGE = 275;

export type BackendKind = 'local' | 'supabase';

export const BACKEND: BackendKind =
  environment.backend === 'supabase' && environment.supabaseUrl && environment.supabaseAnonKey ? 'supabase' : 'local';
