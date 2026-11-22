/*
  Folio schema for Neon (Managed Better Auth + Data API).

  Every table is keyed by the signed-in user's id, which the Data API exposes
  through auth.user_id() (the JWT "sub" claim). Row-level security restricts
  each reader to their own rows; the Data API's default grants give the
  `authenticated` role table access, and RLS then filters every request.
*/

CREATE TABLE IF NOT EXISTS public.library_entries (
  user_id text NOT NULL DEFAULT (auth.user_id()),
  book_id text NOT NULL,
  shelf text CHECK (shelf IN ('want', 'reading', 'finished')),
  favorite boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  PRIMARY KEY (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.reading_progress (
  user_id text NOT NULL DEFAULT (auth.user_id()),
  book_id text NOT NULL,
  chapter integer NOT NULL CHECK (chapter >= 0),
  position real NOT NULL CHECK (position BETWEEN 0 AND 1),
  percent real NOT NULL CHECK (percent BETWEEN 0 AND 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY,
  user_id text NOT NULL DEFAULT (auth.user_id()),
  book_id text NOT NULL,
  chapter integer NOT NULL CHECK (chapter >= 0),
  position real NOT NULL CHECK (position BETWEEN 0 AND 1),
  excerpt text NOT NULL DEFAULT '' CHECK (char_length(excerpt) <= 400),
  note text CHECK (char_length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookmarks_user_book_idx ON public.bookmarks (user_id, book_id);

CREATE TABLE IF NOT EXISTS public.reading_activity (
  user_id text NOT NULL DEFAULT (auth.user_id()),
  day date NOT NULL,
  seconds integer NOT NULL DEFAULT 0 CHECK (seconds >= 0),
  PRIMARY KEY (user_id, day)
);

-- Answers from the welcome questionnaire (interests, occupation, reading habits).
CREATE TABLE IF NOT EXISTS public.reading_profiles (
  user_id text PRIMARY KEY DEFAULT (auth.user_id()),
  profile jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Readers manage their library" ON public.library_entries;
CREATE POLICY "Readers manage their library" ON public.library_entries FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id) WITH CHECK ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Readers manage their progress" ON public.reading_progress;
CREATE POLICY "Readers manage their progress" ON public.reading_progress FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id) WITH CHECK ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Readers manage their bookmarks" ON public.bookmarks;
CREATE POLICY "Readers manage their bookmarks" ON public.bookmarks FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id) WITH CHECK ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Readers manage their activity" ON public.reading_activity;
CREATE POLICY "Readers manage their activity" ON public.reading_activity FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id) WITH CHECK ((SELECT auth.user_id()) = user_id);

DROP POLICY IF EXISTS "Readers manage their profile" ON public.reading_profiles;
CREATE POLICY "Readers manage their profile" ON public.reading_profiles FOR ALL TO authenticated
  USING ((SELECT auth.user_id()) = user_id) WITH CHECK ((SELECT auth.user_id()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.library_entries, public.reading_progress, public.bookmarks, public.reading_activity, public.reading_profiles
  TO authenticated;
