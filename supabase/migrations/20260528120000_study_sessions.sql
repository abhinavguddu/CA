-- Create study_sessions table
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  duration_seconds integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage own study sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'study_sessions'
      AND policyname = 'Users can manage own study sessions'
  ) THEN
    CREATE POLICY "Users can manage own study sessions"
      ON public.study_sessions FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS study_sessions_user_id_created_at_idx
  ON public.study_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS study_sessions_subject_id_idx
  ON public.study_sessions(subject_id);
