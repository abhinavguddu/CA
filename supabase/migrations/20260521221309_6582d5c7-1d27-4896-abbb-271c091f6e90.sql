
CREATE TABLE public.past_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  level ca_level NOT NULL,
  exam_month text NOT NULL,
  exam_year int NOT NULL,
  paper text,
  question_number text,
  marks int,
  question_text text NOT NULL,
  topic_tags text[] DEFAULT '{}',
  difficulty text DEFAULT 'medium',
  official_answer text,
  source_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_past_questions_subject ON public.past_questions(subject_id);
CREATE INDEX idx_past_questions_year ON public.past_questions(exam_year DESC, exam_month);
CREATE INDEX idx_past_questions_level ON public.past_questions(level);

ALTER TABLE public.past_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view past questions"
  ON public.past_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers manage past questions"
  ON public.past_questions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.past_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  citations jsonb DEFAULT '[]'::jsonb,
  model text,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_answers_question ON public.question_answers(question_id, created_at DESC);

ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view answers"
  ON public.question_answers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert answers"
  ON public.question_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Teachers manage answers"
  ON public.question_answers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
