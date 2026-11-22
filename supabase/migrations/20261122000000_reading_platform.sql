/*
  # Reading platform schema

  Adds per-user reading data for Folio and fixes the recursive admin policies
  on `profiles` from the initial migration (a policy on `profiles` that selects
  from `profiles` triggers "infinite recursion detected in policy").

  ## New tables (all keyed by auth.users, protected by row-level security)
  - library_entries   – shelf (want / reading / finished) and favourite flag per book
  - reading_progress  – last position in each book
  - bookmarks         – saved positions with an excerpt and optional note
  - reading_activity  – seconds read per day, for streaks and statistics
*/

-- ---------------------------------------------------------------------------
-- Fix recursive admin policies on profiles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users may edit their own name/avatar but never their role or active flag.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() is NULL for trusted server-side contexts (SQL editor, service role).
  IF auth.uid() IS NOT NULL AND NOT public.is_admin()
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    RAISE EXCEPTION 'Not allowed to change role or account status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Library
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.library_entries (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id text NOT NULL,
  shelf text CHECK (shelf IN ('want', 'reading', 'finished')),
  favorite boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  PRIMARY KEY (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.reading_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id text NOT NULL,
  chapter integer NOT NULL CHECK (chapter >= 0),
  position real NOT NULL CHECK (position BETWEEN 0 AND 1),
  percent real NOT NULL CHECK (percent BETWEEN 0 AND 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id text NOT NULL,
  chapter integer NOT NULL CHECK (chapter >= 0),
  position real NOT NULL CHECK (position BETWEEN 0 AND 1),
  excerpt text NOT NULL DEFAULT '' CHECK (char_length(excerpt) <= 400),
  note text CHECK (char_length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookmarks_user_book_idx ON public.bookmarks (user_id, book_id);

CREATE TABLE IF NOT EXISTS public.reading_activity (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  seconds integer NOT NULL DEFAULT 0 CHECK (seconds >= 0),
  PRIMARY KEY (user_id, day)
);

-- ---------------------------------------------------------------------------
-- Row-level security: every row belongs to exactly one reader.
-- ---------------------------------------------------------------------------

ALTER TABLE public.library_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Readers manage their library"
  ON public.library_entries FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Readers manage their progress"
  ON public.reading_progress FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Readers manage their bookmarks"
  ON public.bookmarks FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Readers manage their activity"
  ON public.reading_activity FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
