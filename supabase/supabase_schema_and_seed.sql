-- ============================================================
-- CA Guru AI — Master Database Setup & Seed Script
-- Execute this entire file in Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ca_level') THEN
    CREATE TYPE public.ca_level AS ENUM ('Foundation', 'Intermediate', 'Final');
  END IF;
END $$;

-- 2. CORE TABLES

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  level public.ca_level DEFAULT 'Foundation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper Functions & Triggers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level public.ca_level NOT NULL,
  name text NOT NULL,
  code text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Topics
CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index int NOT NULL DEFAULT 0,
  estimated_hours int DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- User Progress
CREATE TABLE IF NOT EXISTS public.user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  confidence int DEFAULT 0,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Doubts
CREATE TABLE IF NOT EXISTS public.doubts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Doubt',
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;

-- Doubt Messages
CREATE TABLE IF NOT EXISTS public.doubt_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doubt_id uuid NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  citations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doubt_messages ENABLE ROW LEVEL SECURITY;

-- Knowledge Documents
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  source_title text NOT NULL,
  source_url text,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS knowledge_documents_embedding_idx
  ON public.knowledge_documents USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_subject uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_title text,
  source_url text,
  content text,
  similarity float
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT k.id, k.source_title, k.source_url, k.content,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_documents k
  WHERE (filter_subject IS NULL OR k.subject_id = filter_subject)
    AND k.embedding IS NOT NULL
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Permissions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.match_knowledge(vector, int, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.match_knowledge(vector, int, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- Past Questions
CREATE TABLE IF NOT EXISTS public.past_questions (
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
ALTER TABLE public.past_questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_past_questions_subject ON public.past_questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_past_questions_year ON public.past_questions(exam_year DESC, exam_month);
CREATE INDEX IF NOT EXISTS idx_past_questions_level ON public.past_questions(level);

-- Question Answers
CREATE TABLE IF NOT EXISTS public.question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.past_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  citations jsonb DEFAULT '[]'::jsonb,
  model text,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_question_answers_question ON public.question_answers(question_id, created_at DESC);

-- Feature Tables
CREATE TABLE IF NOT EXISTS public.mock_test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  level text,
  total_questions int NOT NULL DEFAULT 0,
  attempted int NOT NULL DEFAULT 0,
  correct int NOT NULL DEFAULT 0,
  score_pct numeric(5,2) NOT NULL DEFAULT 0,
  time_taken_seconds int NOT NULL DEFAULT 0,
  question_ids uuid[] NOT NULL DEFAULT '{}',
  answers jsonb NOT NULL DEFAULT '{}',
  completed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_test_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('question', 'topic')),
  ref_id uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, ref_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.formula_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.formula_sheets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.study_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  minutes int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE public.study_streaks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_date date NOT NULL,
  daily_hours integer NOT NULL DEFAULT 4,
  level text DEFAULT 'Foundation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  front text NOT NULL,
  back text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  ease integer DEFAULT 2,
  interval_days integer DEFAULT 1,
  next_review date DEFAULT CURRENT_DATE,
  last_reviewed timestamptz,
  reviews_count integer DEFAULT 0,
  UNIQUE (user_id, flashcard_id)
);
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.exam_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  exam_date date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, label)
);
ALTER TABLE public.exam_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  duration_seconds integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- 3. ROW LEVEL SECURITY POLICIES

DO $$ BEGIN
  -- Profiles
  DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
  CREATE POLICY "Profiles are viewable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

  -- User Roles
  DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
  CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
  CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

  -- Subjects & Topics
  DROP POLICY IF EXISTS "Anyone authenticated can view subjects" ON public.subjects;
  CREATE POLICY "Anyone authenticated can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS "Anyone authenticated can view topics" ON public.topics;
  CREATE POLICY "Anyone authenticated can view topics" ON public.topics FOR SELECT TO authenticated USING (true);

  -- User Progress
  DROP POLICY IF EXISTS "Users view their own progress" ON public.user_progress;
  CREATE POLICY "Users view their own progress" ON public.user_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Users upsert their own progress" ON public.user_progress;
  CREATE POLICY "Users upsert their own progress" ON public.user_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Users update their own progress" ON public.user_progress;
  CREATE POLICY "Users update their own progress" ON public.user_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

  -- Doubts & Messages
  DROP POLICY IF EXISTS "Users view own doubts" ON public.doubts;
  CREATE POLICY "Users view own doubts" ON public.doubts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Users insert own doubts" ON public.doubts;
  CREATE POLICY "Users insert own doubts" ON public.doubts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Users view own messages" ON public.doubt_messages;
  CREATE POLICY "Users view own messages" ON public.doubt_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Users insert own messages" ON public.doubt_messages;
  CREATE POLICY "Users insert own messages" ON public.doubt_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

  -- Knowledge Documents
  DROP POLICY IF EXISTS "Authenticated can read knowledge" ON public.knowledge_documents;
  CREATE POLICY "Authenticated can read knowledge" ON public.knowledge_documents FOR SELECT TO authenticated USING (true);

  -- Past Questions & Answers
  DROP POLICY IF EXISTS "Authenticated can view past questions" ON public.past_questions;
  CREATE POLICY "Authenticated can view past questions" ON public.past_questions FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS "Authenticated can view answers" ON public.question_answers;
  CREATE POLICY "Authenticated can view answers" ON public.question_answers FOR SELECT TO authenticated USING (true);

  -- Feature Tables
  DROP POLICY IF EXISTS "Users can manage own sessions" ON public.mock_test_sessions;
  CREATE POLICY "Users can manage own sessions" ON public.mock_test_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.bookmarks;
  CREATE POLICY "Users manage own bookmarks" ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Anyone authenticated can read formula sheets" ON public.formula_sheets;
  CREATE POLICY "Anyone authenticated can read formula sheets" ON public.formula_sheets FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS "Teachers can manage formula sheets" ON public.formula_sheets;
  CREATE POLICY "Teachers can manage formula sheets" ON public.formula_sheets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
  DROP POLICY IF EXISTS "Users manage own streaks" ON public.study_streaks;
  CREATE POLICY "Users manage own streaks" ON public.study_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Users can view own study plans" ON public.study_plans;
  CREATE POLICY "Users can view own study plans" ON public.study_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Users can insert own study plans" ON public.study_plans;
  CREATE POLICY "Users can insert own study plans" ON public.study_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Authenticated can view flashcards" ON public.flashcards;
  CREATE POLICY "Authenticated can view flashcards" ON public.flashcards FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS "Users manage own flashcard reviews" ON public.flashcard_reviews;
  CREATE POLICY "Users manage own flashcard reviews" ON public.flashcard_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Users manage own exam settings" ON public.exam_settings;
  CREATE POLICY "Users manage own exam settings" ON public.exam_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  DROP POLICY IF EXISTS "Users can manage own study sessions" ON public.study_sessions;
  CREATE POLICY "Users can manage own study sessions" ON public.study_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END $$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ca-materials', 'ca-materials', false)
ON CONFLICT (id) DO NOTHING;

-- 4. SEED DATA (SUBJECTS & TOPICS)

INSERT INTO public.subjects (id, level, name, code, description) VALUES
-- Foundation
('cd1b92d9-8dc9-4a50-a677-4936f842c1ab', 'Foundation', 'Accounting', 'P1', 'Principles and Practice of Accounting'),
('8c581379-6366-44ba-afc9-dedea14477ac', 'Foundation', 'Business Laws', 'P2', 'Business Laws & Business Correspondence'),
('a1b2c3d4-0001-4000-8000-000000000001', 'Foundation', 'Business Mathematics & Statistics', 'P3', 'Quantitative Aptitude'),
('a1b2c3d4-0002-4000-8000-000000000002', 'Foundation', 'Business Economics', 'P4', 'Business Economics & Commercial Knowledge'),

-- Intermediate
('15d8ad21-2edd-42bf-832f-8b1790df1575', 'Intermediate', 'Advanced Accounting', 'P1', 'Advanced Financial Accounting Standards & Statements'),
('13b653d1-19fd-4f9b-92bb-8331c35af90e', 'Intermediate', 'Corporate and Other Laws', 'P2', 'Company Law & Other Legal Provisions'),
('e03c8bdb-a3ef-479c-bd6c-cc370ea640ec', 'Intermediate', 'Taxation (Income Tax & GST)', 'P3', 'Direct and Indirect Taxation'),
('4a427d15-2b2d-466b-ae80-707c3c6359b6', 'Intermediate', 'Cost and Management Accounting', 'P4', 'Costing Principles & Management Accounting'),
('f91f9059-472b-4e78-893b-71bacb27208b', 'Intermediate', 'Auditing and Ethics', 'P5', 'Auditing Standards & Professional Ethics'),
('2e70e531-442e-45fe-868c-11e6d177aceb', 'Intermediate', 'Financial Management & Strategic Management', 'P6', 'FM & SM Concepts'),

-- Final
('396d6c97-1896-4455-847e-b491ae4fdab2', 'Final', 'Financial Reporting', 'P1', 'Ind AS & Advanced Financial Reporting'),
('7d824c83-57d3-43a9-aded-216dfae5717a', 'Final', 'Strategic Financial Management', 'P2', 'Advanced Financial Management'),
('d1b5ccbb-10eb-40ce-9e9e-c27bca788d19', 'Final', 'Advanced Auditing', 'P3', 'Advanced Auditing & Professional Ethics'),
('471e6620-c672-4071-8f45-c6f1d517ce40', 'Final', 'Direct Tax Laws', 'P4', 'Direct Tax & International Taxation'),
('97154e3b-9276-4edf-8d8f-8176261353ac', 'Final', 'Indirect Tax Laws (GST)', 'P5', 'GST & Customs Laws'),
('b1c2d3e4-0006-4000-8000-000000000006', 'Final', 'Integrated Business Solutions', 'P6', 'Multi-disciplinary Case Studies')
ON CONFLICT (id) DO NOTHING;

-- Seed Topics
INSERT INTO public.topics (subject_id, title, description, order_index, estimated_hours) VALUES
('cd1b92d9-8dc9-4a50-a677-4936f842c1ab', 'Theoretical Framework', 'Meaning, scope, concepts, conventions, policies', 1, 3),
('cd1b92d9-8dc9-4a50-a677-4936f842c1ab', 'Accounting Process', 'Journal, Ledger, Trial Balance, Cash Book', 2, 5),
('cd1b92d9-8dc9-4a50-a677-4936f842c1ab', 'Bank Reconciliation Statement', 'BRS preparation and adjusted cash book', 3, 4),
('cd1b92d9-8dc9-4a50-a677-4936f842c1ab', 'Inventories', 'AS 2 valuation methods (FIFO, LIFO, Weighted Avg)', 4, 4),
('cd1b92d9-8dc9-4a50-a677-4936f842c1ab', 'Depreciation & Amortisation', 'SLM, WDV, Change of method', 5, 5),
('cd1b92d9-8dc9-4a50-a677-4936f842c1ab', 'Partnership Accounts', 'Admission, Retirement, Death, Dissolution', 6, 8),

('15d8ad21-2edd-42bf-832f-8b1790df1575', 'Applicability of Accounting Standards', 'AS vs Ind AS framework overview', 1, 3),
('15d8ad21-2edd-42bf-832f-8b1790df1575', 'Consolidation of Financial Statements (AS 21)', 'Parent & Subsidiary accounts, Minority Interest, Goodwill', 2, 10),
('15d8ad21-2edd-42bf-832f-8b1790df1575', 'Amalgamation of Companies (AS 14)', 'Pooling of interest vs Purchase method', 3, 8),

('4a427d15-2b2d-466b-ae80-707c3c6359b6', 'Material Cost', 'EOQ, Stock levels, Valuation methods', 1, 4),
('4a427d15-2b2d-466b-ae80-707c3c6359b6', 'Employee Cost & Overheads', 'Halsey, Rowan plans, Primary & Secondary distribution', 2, 6),
('4a427d15-2b2d-466b-ae80-707c3c6359b6', 'Marginal Costing', 'CVP Analysis, BEP, Margin of Safety', 3, 8),
('4a427d15-2b2d-466b-ae80-707c3c6359b6', 'Standard Costing', 'Variance analysis (Material, Labour, Overhead)', 4, 8),

('396d6c97-1896-4455-847e-b491ae4fdab2', 'Ind AS 109 Financial Instruments', 'Classification, EIR, ECL Impairment', 1, 12),
('396d6c97-1896-4455-847e-b491ae4fdab2', 'Ind AS 115 Revenue from Contracts', '5-step model, Variable consideration', 2, 10),
('396d6c97-1896-4455-847e-b491ae4fdab2', 'Ind AS 116 Leases', 'Lessee accounting, ROU Asset, Lease Liability', 3, 8);

-- 5. SEED DATA (FLASHCARDS)
INSERT INTO public.flashcards (front, back) VALUES
('What is the Accounting Equation?', 'Assets = Liabilities + Equity'),
('State the formula for CAPM (Cost of Equity)', 'Ke = Rf + Beta(Rm - Rf)'),
('What is Time Value of Money?', 'The concept that a sum of money is worth more now than the same sum will be at a future date due to its earnings potential.'),
('What is the formula for Break-Even Point (in units)?', 'Fixed Costs / Contribution per unit'),
('What does Section 135 of the Companies Act, 2013 relate to?', 'Corporate Social Responsibility (CSR)'),
('What is the Net Present Value (NPV) decision rule?', 'Accept project if NPV > 0. Reject if NPV < 0.'),
('What is the formula for Margin of Safety?', '(Actual Sales - Break-Even Sales) / Actual Sales * 100'),
('What does AS-1 deal with?', 'Disclosure of Accounting Policies'),
('Define Going Concern Concept', 'The assumption that an entity will remain in business for the foreseeable future.'),
('What is the formula for Quick Ratio?', '(Current Assets - Inventory - Prepaid Expenses) / Current Liabilities'),
('What does Section 139 of the Companies Act, 2013 state?', 'Appointment of Auditors. 1st auditor by BOD within 30 days.'),
('What is the formula for Economic Order Quantity (EOQ)?', '√[(2 * Annual Demand * Ordering Cost) / Carrying Cost per unit]'),
('What does AS-2 deal with?', 'Valuation of Inventories (Lower of Cost and NRV)'),
('Define Prudence (Conservatism) in accounting', 'Do not anticipate profits, but provide for all possible losses.'),
('What is Operating Leverage?', 'Contribution / EBIT'),
('What is Financial Leverage?', 'EBIT / EBT'),
('What is the formula for WACC?', '(Weight of Equity * Cost of Equity) + (Weight of Debt * Cost of Debt * (1-Tax))'),
('What is Section 16 of CGST Act?', 'Conditions for claiming Input Tax Credit (ITC)'),
('What is Section 194C of Income Tax Act?', 'TDS on Payments to Contractors'),
('Define Audit Risk', 'The risk that the auditor expresses an inappropriate audit opinion when the financial statements are materially misstated.'),
('What is Materiality in auditing?', 'Information is material if its omission or misstatement could influence the economic decisions of users taken on the basis of the financial statements.'),
('What is a One Person Company (OPC)?', 'A company which has only one person as a member.'),
('What is Section 44AD of Income Tax Act?', 'Presumptive Taxation for business (8% of turnover, or 6% for digital).'),
('What does AS-9 deal with?', 'Revenue Recognition'),
('What is the formula for Return on Equity (ROE)?', 'Net Income / Shareholder''s Equity'),
('What does AS-3 deal with?', 'Cash Flow Statements'),
('What is the formula for Current Ratio?', 'Current Assets / Current Liabilities'),
('What is the formula for Debt to Equity Ratio?', 'Total Debt / Total Equity'),
('What is the formula for Inventory Turnover Ratio?', 'Cost of Goods Sold / Average Inventory'),
('What does Section 141 of the Companies Act, 2013 relate to?', 'Eligibility, qualifications and disqualifications of auditors'),
('What is the formula for Price Earnings (P/E) Ratio?', 'Market Value per Share / Earnings per Share (EPS)'),
('What is the formula for Earnings Per Share (EPS)?', '(Net Income - Preferred Dividends) / End-of-Period Common Shares Outstanding'),
('What does AS-10 deal with?', 'Property, Plant and Equipment'),
('What is the formula for Dividend Yield?', 'Annual Dividends per Share / Price per Share'),
('What is the formula for Gross Profit Margin?', '(Revenue - Cost of Goods Sold) / Revenue'),
('What does Section 80C of the Income Tax Act relate to?', 'Deduction in respect of life insurance premia, deferred annuity, contributions to provident fund, subscription to certain equity shares or debentures, etc. (Limit ₹1,50,000)'),
('What is the formula for Operating Profit Margin?', 'Operating Profit (EBIT) / Revenue'),
('What does Section 134 of the Companies Act, 2013 deal with?', 'Financial statement, Board''s report, etc.'),
('What is the formula for Net Profit Margin?', 'Net Profit / Revenue'),
('What does AS-26 deal with?', 'Intangible Assets'),
('What is the formula for Acid Test (Quick) Ratio?', '(Cash + Cash Equivalents + Marketable Securities + Accounts Receivable) / Current Liabilities'),
('What does Section 194J of the Income Tax Act relate to?', 'TDS on Fees for Professional or Technical Services'),
('What is the formula for Return on Assets (ROA)?', 'Net Income / Total Assets'),
('What does AS-18 deal with?', 'Related Party Disclosures');

-- 6. SEED DATA (FORMULA SHEETS)
INSERT INTO public.formula_sheets (subject_id, title, content) VALUES
('a1b2c3d4-0001-4000-8000-000000000001', 'Maths — Progressions & Interest', $MD$
## Arithmetic Progression
- **nth Term** = $a_n = a + (n-1)d$
- **Sum of n Terms** = $S_n = \dfrac{n}{2}[2a + (n-1)d]$
- **Sum (first & last)** = $S_n = \dfrac{n}{2}(a + l)$

## Geometric Progression
- **nth Term** = $a_n = ar^{n-1}$
- **Sum of n Terms** = $S_n = \dfrac{a(r^n - 1)}{r - 1}$ when $r \neq 1$
- **Sum to Infinity** = $S_\infty = \dfrac{a}{1-r}$ when $|r| < 1$

## Simple & Compound Interest
- **Simple Interest** = $SI = \dfrac{P \times R \times T}{100}$
- **Compound Interest** = $CI = P\left[\left(1 + \dfrac{R}{100}\right)^n - 1\right]$
- **Effective Annual Rate** = $EAR = \left(1 + \dfrac{r}{m}\right)^m - 1$

## Permutations & Combinations
- **Permutation** = $^nP_r = \dfrac{n!}{(n-r)!}$
- **Combination** = $^nC_r = \dfrac{n!}{r!(n-r)!}$
- **Symmetry** = $^nC_r = ^nC_{n-r}$

## Quadratic Equation
- **Roots** = $x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
- **Sum of Roots** = $\alpha + \beta = \dfrac{-b}{a}$
- **Product of Roots** = $\alpha \cdot \beta = \dfrac{c}{a}$
$MD$),

('cd1b92d9-8dc9-4a50-a677-4936f842c1ab', 'Accounts — Depreciation & Adjustments', $MD$
## Accounting Equation
- **Fundamental** = $\text{Assets} = \text{Liabilities} + \text{Capital}$

## Depreciation
- **SLM Annual Charge** = $\dfrac{\text{Cost} - \text{Scrap Value}}{\text{Useful Life (years)}}$
- **SLM Rate** = $\dfrac{100}{\text{Useful Life}} \%$
- **WDV Charge** = $\text{Book Value} \times \text{Rate\%}$
- **WDV Rate** = $\left[1 - \left(\dfrac{S}{C}\right)^{1/n}\right] \times 100$

## Final Accounts Adjustments
| Adjustment | P&L Effect | Balance Sheet |
|---|---|---|
| Outstanding Expense | Add to expense | Current Liability |
| Prepaid Expense | Deduct from expense | Current Asset |
| Accrued Income | Add to income | Current Asset |
| Unearned Income | Deduct from income | Current Liability |
| Bad Debt | Debit P&L | Reduce Debtors |
| Provision for Bad Debt | Debit P&L | Deduct from Debtors |
$MD$),

('15d8ad21-2edd-42bf-832f-8b1790df1575', 'Partnership — Goodwill & Ratios', $MD$
## Goodwill Valuation
- **Average Profit** = $\dfrac{\text{Total Adjusted Profits}}{\text{Number of Years}}$
- **Super Profit** = $\text{Actual Profit} - \text{Normal Profit}$
- **Normal Profit** = $\text{Capital Employed} \times \dfrac{\text{Normal Rate}}{100}$
- **Goodwill (Super Profit)** = $\text{Super Profit} \times \text{Years of Purchase}$
- **Goodwill (Capitalisation)** = $\dfrac{\text{Super Profit}}{\text{Normal Rate}} \times 100$

## Profit Sharing Ratios
- **Sacrificing Ratio** = $\text{Old Ratio} - \text{New Ratio}$
- **Gaining Ratio** = $\text{New Ratio} - \text{Old Ratio}$

## Amalgamation (AS 14)
- **Purchase Consideration (Net Assets)** = $\text{Assets Taken} - \text{Liabilities Taken}$
- **Goodwill** = $\text{PC} > \text{Net Assets}$
- **Capital Reserve** = $\text{Net Assets} > \text{PC}$
$MD$),

('e03c8bdb-a3ef-479c-bd6c-cc370ea640ec', 'Income Tax — Salary & House Property', $MD$
## Salary Income
- **Gross Salary** = $\text{Basic} + \text{DA} + \text{HRA} + \text{Allowances} + \text{Perquisites}$
- **Standard Deduction** = $₹75{,}000$ (AY 2025-26)

## HRA Exemption [Sec 10(13A)]
Exempt = $\min$ of:
1. $\text{Actual HRA received}$
2. $50\%\ \text{or}\ 40\%\ \text{of Basic+DA}$ (Metro / Non-metro)
3. $\text{Rent Paid} - 10\%\ \text{of Basic+DA}$

## House Property
- **GAV** = $\max(\text{Expected Rent},\ \text{Actual Rent})$
- **NAV** = $\text{GAV} - \text{Municipal Tax paid by owner}$
- **Deduction u/s 24(a)** = $30\%\ \text{of NAV}$
- **Deduction u/s 24(b)** = $\text{Interest on loan}$ (max $₹2L$ for self-occupied)
- **Taxable HP Income** = $\text{NAV} - \text{Deductions u/s 24}$
$MD$),

('4a427d15-2b2d-466b-ae80-707c3c6359b6', 'Costing — Material, Labour & Overhead', $MD$
## Material Management
- **EOQ** = $\sqrt{\dfrac{2 \times D \times O}{C}}$
  where D = Annual Demand, O = Ordering Cost, C = Carrying Cost per unit
- **Reorder Level** = $\text{Max Consumption} \times \text{Max Lead Time}$
- **Minimum Level** = $\text{ROL} - (\text{Normal Consumption} \times \text{Normal Lead Time})$
- **Maximum Level** = $\text{ROL} + \text{EOQ} - (\text{Min Consumption} \times \text{Min Lead Time})$

## Labour Incentives
- **Halsey Premium** = $50\% \times \text{Time Saved} \times \text{Hourly Rate}$
- **Rowan Premium** = $\dfrac{\text{Time Saved}}{\text{Time Allowed}} \times \text{Time Taken} \times \text{Hourly Rate}$

## Marginal Costing
- **Contribution** = $\text{Sales} - \text{Variable Cost}$
- **P/V Ratio** = $\dfrac{\text{Contribution}}{\text{Sales}} \times 100$
- **BEP (Units)** = $\dfrac{\text{Fixed Cost}}{\text{Contribution per unit}}$
- **BEP (₹)** = $\dfrac{\text{Fixed Cost}}{\text{P/V Ratio}}$
- **Margin of Safety** = $\text{Actual Sales} - \text{BEP Sales}$
$MD$),

('396d6c97-1896-4455-847e-b491ae4fdab2', 'Ind AS — Financial Instruments & Revenue', $MD$
## Ind AS 109 — Classification of Financial Assets
| Business Model | SPPI Test | Measurement |
|---|---|---|
| Hold to collect | Pass | Amortised Cost |
| Hold to collect & sell | Pass | FVOCI |
| Other / Trading | Any | FVTPL |

## Effective Interest Rate (EIR)
$$\text{Amortised Cost}_{t} = \text{Amortised Cost}_{t-1} + \text{EIR} \times \text{AC}_{t-1} - \text{Cash Flow}_t$$

## Ind AS 115 — 5-Step Revenue Model
1. Identify the **contract** with customer
2. Identify **performance obligations**
3. Determine **transaction price**
4. **Allocate** TP to POs (based on SSP)
5. Recognise revenue when/as **PO satisfied**
$MD$);

-- 7. SEED DATA (PAST QUESTIONS & ANSWERS)
INSERT INTO public.past_questions (subject_id, level, exam_month, exam_year, paper, question_number, marks, question_text, topic_tags, difficulty, official_answer) VALUES
('cd1b92d9-8dc9-4a50-a677-4936f842c1ab','Foundation','December',2023,'Paper 1','1(a)',10,'X, Y and Z are partners sharing profits and losses in the ratio of 5:3:2. They decide to dissolve the partnership firm on 31st March, 2023. Prepare the Realisation Account and Partners Capital Accounts assuming the assets realized ₹ 5,00,000 and liabilities were paid at ₹ 1,50,000. Realisation expenses amounted to ₹ 10,000.', ARRAY['Partnership','Dissolution','Realisation'],'medium', '**Model Answer:**\n1. Realisation Account will be credited with assets realized (₹ 5,00,000) and debited with liabilities paid (₹ 1,50,000) and expenses (₹ 10,00,000).\n2. Net profit/loss on realisation will be distributed in 5:3:2 ratio.\n3. Partners Capital Accounts will be settled accordingly.'),
('8c581379-6366-44ba-afc9-dedea14477ac','Foundation','June',2022,'Paper 2','3(b)',6,'What are the essentials of a valid acceptance under the Indian Contract Act, 1872? Explain with suitable examples.', ARRAY['Contract Act','Acceptance'],'easy', '**Model Answer:**\n1. Absolute and Unqualified\n2. Communicated to offeror\n3. Prescribed or reasonable mode\n4. Within specified/reasonable time\n5. Intention to fulfill (silence is not acceptance).'),
('cd1b92d9-8dc9-4a50-a677-4936f842c1ab','Foundation','June',2024,'Paper 1','1(a)',5,'A and B are partners sharing profits in the ratio 3:2. They admit C for 1/5th share. C brings ₹50,000 as capital but is unable to bring his share of goodwill of ₹20,000 in cash. Pass the necessary journal entries assuming goodwill does not appear in the books.', ARRAY['Partnership','Admission','Goodwill'],'medium', 'Pass journal entry debiting C''s Current Account and crediting A and B''s Capital Accounts in sacrificing ratio (3:2).'),
('8c581379-6366-44ba-afc9-dedea14477ac','Foundation','June',2024,'Paper 2','3(b)',4,'Explain the doctrine of "Caveat Emptor" under the Sale of Goods Act, 1930 and state any three exceptions to it.', ARRAY['Sale of Goods Act','Caveat Emptor'],'easy', 'Caveat Emptor means "Let the buyer beware". Exceptions: Fitness as to quality or use, Sale by sample, Sale by description, Fraud or active concealment.'),

('15d8ad21-2edd-42bf-832f-8b1790df1575','Intermediate','May',2024,'Paper 1','2',10,'X Ltd. acquired 80% equity shares of Y Ltd. on 1st April 2023 for ₹16,00,000. The net assets of Y Ltd. on the date of acquisition stood at ₹15,00,000. During the year, Y Ltd. earned a profit of ₹3,00,000 and paid a dividend of ₹1,00,000. Compute Goodwill / Capital Reserve on acquisition and Minority Interest as on 31st March 2024 as per AS 21.', ARRAY['AS 21','Consolidation','Goodwill','Minority Interest'],'hard', 'Goodwill on Acquisition = ₹16,00,000 - (80% of ₹15,00,000) = ₹4,00,000. Minority Interest as on 31.03.2024 = 20% of (15,00,000 + 3,00,000 - 1,00,000) = ₹3,40,000.'),
('4a427d15-2b2d-466b-ae80-707c3c6359b6','Intermediate','May',2024,'Paper 3','1(a)',8,'A factory produces a single product. The selling price is ₹100 per unit. Variable cost per unit is ₹60 and fixed cost for the year is ₹4,00,000. Calculate: (i) BEP in units and value (ii) Margin of Safety if actual sales are 15,000 units (iii) Sales required to earn a profit of ₹2,00,000 (iv) New BEP if selling price is reduced by 10%.', ARRAY['Marginal Costing','BEP','Margin of Safety'],'medium', 'Contribution = ₹40. (i) BEP = 10,000 units (₹10,00,000). (ii) MOS = 5,000 units (₹5,00,000). (iii) Desired Sales = 15,000 units. (iv) New BEP (SP=90, Cont=30) = 13,333.33 units.'),
('e03c8bdb-a3ef-479c-bd6c-cc370ea640ec','Intermediate','May',2024,'Paper 4','5(b)',6,'Mr. Raj, a resident individual aged 45 years, has the following income for the PY 2023-24: Salary ₹8,00,000; Income from house property ₹1,50,000; LTCG on listed equity shares (STT paid) ₹1,80,000; Interest on savings bank ₹15,000. Compute his total income and tax liability under the default new tax regime u/s 115BAC for AY 2024-25.', ARRAY['Income Tax','115BAC','LTCG','Computation'],'hard', 'Salary after std ded = ₹7,50,000. Total Income computed under 115BAC slabs with LTCG u/s 112A taxed @ 10% above ₹1 Lakh.'),
('13b653d1-19fd-4f9b-92bb-8331c35af90e','Intermediate','May',2024,'Paper 2','4(a)',6,'Explain the provisions of Section 149 of the Companies Act, 2013 regarding appointment of Independent Directors. State the conditions a person must satisfy to be appointed as an Independent Director.', ARRAY['Companies Act 2013','Section 149','Independent Director'],'medium', 'Listed companies must have at least 1/3rd independent directors. Section 149(6) lays down criteria for independence.'),
('2e70e531-442e-45fe-868c-11e6d177aceb','Intermediate','November',2023,'Paper 6','3',10,'A Ltd. is considering a project requiring an initial investment of ₹20,00,000. The project is expected to generate annual cash inflows of ₹6,00,000 for 5 years. The cost of capital is 12%. Calculate: (i) NPV (ii) IRR (iii) Payback Period (iv) Discounted Payback Period. Advise whether the project should be accepted.', ARRAY['Capital Budgeting','NPV','IRR','Payback'],'medium', 'PV factor @ 12% for 5 years = 3.6048. PV of Inflows = ₹21,62,880. NPV = +₹1,62,880. Payback = 3.33 years. Accept project since NPV > 0.'),
('f91f9059-472b-4e78-893b-71bacb27208b','Intermediate','November',2023,'Paper 5','2(a)',5,'Define "True and Fair View" in the context of financial statements. What are the key considerations an auditor should keep in mind while forming an opinion on whether the financial statements give a true and fair view?', ARRAY['Auditing','True and Fair','SA 700'],'medium', 'True and fair view requires compliance with Accounting Standards, statutory disclosures, and no material misstatements.'),

('396d6c97-1896-4455-847e-b491ae4fdab2','Final','May',2024,'Paper 1','1',14,'PQR Ltd. issued 10,000, 10% Debentures of ₹100 each at par on 1st April 2023, redeemable at a premium of 10% at the end of 5 years. Transaction costs were ₹50,000. Compute the effective interest rate and prepare the amortization table for the first 2 years as per Ind AS 109. Pass journal entries for the first year.', ARRAY['Ind AS 109','EIR','Debentures','Amortised Cost'],'hard', 'Initial Recognition = ₹9,50,000. Calculate EIR by discounting annual interest (₹1,00,000) and redemption value (₹11,00,000) to equal ₹9,50,000.'),
('471e6620-c672-4071-8f45-c6f1d517ce40','Final','May',2024,'Paper 4','3(a)',8,'Discuss the concept of "Place of Effective Management (POEM)" under section 6(3) of the Income Tax Act, 1961 for determining residential status of a foreign company. Explain the guiding principles issued by CBDT in this regard.', ARRAY['POEM','Section 6(3)','International Tax','Residential Status'],'hard', 'POEM is the place where key management and commercial decisions that are necessary for the conduct of business of an entity as a whole are made.'),
('97154e3b-9276-4edf-8d8f-8176261353ac','Final','May',2024,'Paper 5','2',10,'M/s ABC, a registered person under GST, supplied goods worth ₹10,00,000 (excluding GST @ 18%) to M/s XYZ on 5th April 2024. Tax invoice was issued on 10th April 2024. Payment was received on 25th May 2024. Determine the time of supply, due date for issue of invoice, and the tax period in which the supplier must pay GST. Also state the consequences if invoice is issued late.', ARRAY['GST','Time of Supply','Section 12','CGST Act'],'medium', 'Due date for invoice = 5th April 2024 (before or at removal of goods). Issued on 10th April (late). TOS = 5th April 2024. GST payable in April return.'),
('d1b5ccbb-10eb-40ce-9e9e-c27bca788d19','Final','November',2023,'Paper 3','4(b)',6,'During the audit of XYZ Ltd., the auditor identifies a material uncertainty related to going concern. Discuss the auditor''s reporting responsibilities under SA 570 (Revised) — both when management has made adequate disclosure and when disclosure is inadequate.', ARRAY['SA 570','Going Concern','Audit Report'],'hard', 'If adequate disclosure is made: Unmodified opinion with "Material Uncertainty Related to Going Concern" section. If inadequate: Qualified or Adverse opinion as appropriate.'),
('7d824c83-57d3-43a9-aded-216dfae5717a','Final','November',2023,'Paper 2','5(a)',8,'A US-based company has entered into a forward contract to buy ₹5 crore at a rate of ₹83/USD for delivery 3 months later. Spot rate is ₹82.50/USD. 3-month interest rates are 5.5% p.a. in India and 5% p.a. in USA. Determine whether arbitrage opportunity exists. If yes, demonstrate how an arbitrageur can profit with USD 1,00,000.', ARRAY['Forex','Interest Rate Parity','Arbitrage','AFM'],'hard', 'Compare theoretical forward rate from IRP formula $F = S \times (1 + r_d)/(1 + r_f)$ with actual forward rate (83.00). If unequal, arbitrage opportunity exists.');

-- Done!
