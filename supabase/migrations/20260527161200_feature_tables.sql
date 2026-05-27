-- Create study_plans table
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

CREATE POLICY "Users can view own study plans"
  ON public.study_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study plans"
  ON public.study_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans"
  ON public.study_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans"
  ON public.study_plans FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  front text NOT NULL,
  back text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view flashcards"
  ON public.flashcards FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Teachers can manage flashcards"
  ON public.flashcards FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- Create flashcard_reviews table
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

CREATE POLICY "Users manage own flashcard reviews"
  ON public.flashcard_reviews FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed Flashcards
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
('What does AS-9 deal with?', 'Revenue Recognition');
