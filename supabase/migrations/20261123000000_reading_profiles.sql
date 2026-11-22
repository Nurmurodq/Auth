/*
  # Reading profiles

  Stores each reader's welcome-questionnaire answers (occupation, goals,
  favourite genres and moods, preferred length and difficulty) as JSON,
  used to personalise recommendations across devices.
*/

CREATE TABLE IF NOT EXISTS public.reading_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Readers manage their profile"
  ON public.reading_profiles FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
