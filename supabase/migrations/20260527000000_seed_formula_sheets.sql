-- ============================================================
-- CA Formula Sheets Seed Data
-- Run this in Supabase SQL Editor
-- ============================================================

-- Helper: get subject id by name (returns null if not found)
-- We use a DO block so it works even if some subjects don't exist

DO $$
DECLARE
  sid uuid;
BEGIN

-- ── FOUNDATION ──────────────────────────────────────────────

-- Maths & Statistics
SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%mathematics%' AND level = 'Foundation' LIMIT 1;
IF sid IS NOT NULL THEN
  INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Maths — Key Formulas', $MD$
## Arithmetic Progressions
- **nth term:** aₙ = a + (n−1)d
- **Sum of n terms:** Sₙ = n/2 × [2a + (n−1)d]

## Geometric Progressions
- **nth term:** aₙ = arⁿ⁻¹
- **Sum of n terms:** Sₙ = a(rⁿ−1)/(r−1) when r ≠ 1

## Simple & Compound Interest
- **SI** = P × R × T / 100
- **CI** = P[(1 + R/100)ⁿ − 1]
- **Effective Rate** = (1 + r/m)ᵐ − 1

## Permutations & Combinations
- **nPr** = n! / (n−r)!
- **nCr** = n! / [r!(n−r)!]
- **nCr = nC(n−r)**

## Sets
- **n(A∪B)** = n(A) + n(B) − n(A∩B)
- **n(A∪B∪C)** = n(A)+n(B)+n(C) − n(A∩B) − n(B∩C) − n(A∩C) + n(A∩B∩C)

## Quadratic Equation
- **Roots:** x = [−b ± √(b²−4ac)] / 2a
- **Sum of roots** = −b/a | **Product of roots** = c/a

> **Exam tip:** Always check if the question asks for SI or CI — a common mistake is mixing them up.
$MD$);
END IF;

-- Accounts (Foundation)
SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%accounting%' AND level = 'Foundation' LIMIT 1;
IF sid IS NOT NULL THEN
  INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Accounting — Key Concepts & Entries', $MD$
## Accounting Equation
**Assets = Liabilities + Capital**

## Important Journal Entries
| Transaction | Debit | Credit |
|---|---|---|
| Purchase of goods (cash) | Purchases A/c | Cash A/c |
| Sales (credit) | Debtor A/c | Sales A/c |
| Depreciation | Depreciation A/c | Asset A/c |
| Bad debt | Bad Debt A/c | Debtor A/c |
| Interest on capital | Interest on Capital A/c | Capital A/c |

## Depreciation
- **SLM:** (Cost − Scrap) / Useful Life
- **WDV:** Book Value × Rate%

## Rectification of Errors
- **Errors of Omission** — completely omitted, both sides affected equally
- **Errors of Commission** — wrong amount, wrong account
- **Compensating Errors** — two errors cancel each other

## Final Accounts Adjustments
- Outstanding expense → Add to expense + Show as liability
- Prepaid expense → Deduct from expense + Show as asset
- Accrued income → Add to income + Show as asset
- Unearned income → Deduct from income + Show as liability

> **Exam tip:** In rectification, always identify whether the error affects one side or both sides of the trial balance.
$MD$);
END IF;

-- ── INTERMEDIATE ────────────────────────────────────────────

-- Advanced Accounting
SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%advanced accounting%' AND level = 'Intermediate' LIMIT 1;
IF sid IS NOT NULL THEN
  INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Advanced Accounting — Depreciation & Amalgamation', $MD$
## AS 10 — Property, Plant & Equipment
- **Depreciable Amount** = Cost − Residual Value
- **SLM Rate** = 100 / Useful Life
- **WDV Rate** = 1 − (Residual Value / Cost)^(1/n)

## AS 14 — Amalgamation
### Purchase Consideration
- **Net Assets Method:** Assets taken over − Liabilities taken over
- **Intrinsic Value Method:** Net Assets / No. of shares

### Goodwill / Capital Reserve
- **Goodwill** = Purchase Consideration > Net Assets
- **Capital Reserve** = Net Assets > Purchase Consideration

### Types
| Type | Treatment |
|---|---|
| Amalgamation in nature of merger | Pooling of interests method |
| Amalgamation in nature of purchase | Purchase method |

## AS 4 — Contingencies
- **Provision** → probable + reliably estimable → recognise
- **Contingent Liability** → possible → disclose only
- **Contingent Asset** → virtually certain → recognise

> **Exam tip:** In amalgamation questions, always calculate purchase consideration first, then compare with net assets to find goodwill/capital reserve.
$MD$);

  INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Advanced Accounting — Partnership', $MD$
## Goodwill Valuation
- **Average Profit Method:** Goodwill = Average Profit × Years of Purchase
- **Super Profit Method:** Goodwill = Super Profit × Years of Purchase
  - Super Profit = Actual Profit − Normal Profit
  - Normal Profit = Capital Employed × Normal Rate / 100
- **Capitalisation Method:** Goodwill = Super Profit / Normal Rate × 100

## Admission of Partner
1. Calculate new profit sharing ratio
2. Calculate sacrificing ratio = Old ratio − New ratio
3. Revalue assets & liabilities
4. Distribute accumulated profits/losses
5. Adjust goodwill

## Retirement / Death
- **Gaining Ratio** = New ratio − Old ratio
- Goodwill credited to retiring partner in gaining ratio

## Dissolution
- **Garner vs Murray Rule:** Insolvent partner's deficiency borne by solvent partners in capital ratio

> **Exam tip:** Always prepare Revaluation A/c and Partners' Capital A/c in columnar format for full presentation marks.
$MD$);
END IF;

-- Taxation
SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%taxation%' AND level = 'Intermediate' LIMIT 1;
IF sid IS NOT NULL THEN
  INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Income Tax — Key Provisions', $MD$
## Heads of Income (Sec 14)
1. Salaries
2. House Property
3. Profits & Gains of Business/Profession
4. Capital Gains
5. Other Sources

## Salary (Sec 15–17)
- **HRA Exemption** [Sec 10(13A)] = Least of:
  - Actual HRA received
  - 50%/40% of Basic Salary (Metro/Non-metro)
  - Rent paid − 10% of Basic Salary
- **Standard Deduction** = ₹75,000 (AY 2025-26)

## House Property (Sec 22–27)
- **NAV** = GAV − Municipal Taxes paid by owner
- **GAV** = Higher of Expected Rent or Actual Rent
- **Deductions u/s 24:**
  - 30% of NAV (standard)
  - Interest on borrowed capital (actual, max ₹2L for self-occupied)

## Capital Gains
- **STCG** = Sale Price − Cost − Transfer Expenses
- **LTCG** = Sale Price − Indexed Cost − Transfer Expenses
- **Indexed Cost** = Actual Cost × (CII of sale year / CII of purchase year)

## Set Off & Carry Forward
| Loss | Can be set off against | Carry forward |
|---|---|---|
| House Property | Any head | 8 years |
| Business Loss | Business income only | 8 years |
| Speculation Loss | Speculation profit only | 4 years |
| LTCL | LTCG only | 8 years |

> **Exam tip:** For HRA, always check metro/non-metro status. Delhi, Mumbai, Chennai, Kolkata = Metro (50%).
$MD$);

  INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'GST — Key Concepts', $MD$
## GST Rates
| Category | Rate |
|---|---|
| Essential goods | 0% / 5% |
| Standard goods | 12% / 18% |
| Luxury / demerit goods | 28% |

## Input Tax Credit (ITC) — Sec 16
**Conditions:**
1. Registered person
2. Tax invoice available
3. Goods/services received
4. Tax actually paid by supplier
5. Return filed (GSTR-3B)

**Blocked Credits (Sec 17(5)):**
- Motor vehicles (except specific use)
- Food, beverages, outdoor catering
- Club membership, health services
- Works contract for immovable property

## Time of Supply
- **Goods:** Earlier of — invoice date OR receipt of payment
- **Services:** Earlier of — invoice date (within 30 days) OR receipt of payment

## Place of Supply
- **Goods:** Location where goods delivered
- **Services (general):** Location of recipient

## Composition Scheme (Sec 10)
- Turnover limit: ₹1.5 crore (₹75L for special category states)
- Cannot claim ITC
- Cannot make inter-state supply

> **Exam tip:** ITC blocked credits (Sec 17(5)) is a very frequently tested area — memorise the list.
$MD$);
END IF;

-- Costing
SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%cost%' AND level = 'Intermediate' LIMIT 1;
IF sid IS NOT NULL THEN
  INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Cost Accounting — Key Formulas', $MD$
## Cost Sheet Format
```
Prime Cost = DM + DL + Direct Expenses
Works Cost = Prime Cost + Factory Overhead
Cost of Production = Works Cost + Admin Overhead
Cost of Goods Sold = Cost of Production + Opening FG − Closing FG
Total Cost / Cost of Sales = COGS + Selling & Distribution Overhead
Profit = Sales − Total Cost
```

## Material
- **EOQ** = √(2 × Annual Demand × Ordering Cost / Carrying Cost per unit)
- **Reorder Level** = Max Consumption × Max Lead Time
- **Min Level** = Reorder Level − (Normal Consumption × Normal Lead Time)
- **Max Level** = Reorder Level + EOQ − (Min Consumption × Min Lead Time)

## Labour
- **Piece Rate Earnings** = Units produced × Rate per unit
- **Halsey Premium** = 50% × (Time Saved × Hourly Rate)
- **Rowan Premium** = (Time Saved / Time Allowed) × Time Taken × Hourly Rate
- **Labour Turnover** = (Separations / Avg Workers) × 100

## Overhead Absorption
- **Blanket Rate** = Total Overhead / Total Base
- **Departmental Rate** = Dept Overhead / Dept Base
- **Machine Hour Rate** = Dept Overhead / Machine Hours

## Marginal Costing
- **Contribution** = Sales − Variable Cost
- **P/V Ratio** = Contribution / Sales × 100
- **BEP (Units)** = Fixed Cost / Contribution per unit
- **BEP (₹)** = Fixed Cost / P/V Ratio
- **Margin of Safety** = Actual Sales − BEP Sales

> **Exam tip:** In marginal costing, fixed costs are period costs — never include them in stock valuation.
$MD$);
END IF;

-- Auditing
SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%audit%' AND level = 'Intermediate' LIMIT 1;
IF sid IS NOT NULL THEN
  INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Auditing — Standards & Key Concepts', $MD$
## Important SAs
| SA | Topic |
|---|---|
| SA 200 | Overall Objectives of Auditor |
| SA 210 | Agreeing Terms of Audit Engagement |
| SA 230 | Audit Documentation |
| SA 240 | Auditor's Responsibilities — Fraud |
| SA 260 | Communication with TCWG |
| SA 299 | Joint Audit |
| SA 315 | Risk Assessment |
| SA 320 | Materiality |
| SA 500 | Audit Evidence |
| SA 520 | Analytical Procedures |
| SA 530 | Audit Sampling |
| SA 700 | Forming Opinion & Reporting |
| SA 705 | Modifications to Opinion |
| SA 706 | Emphasis of Matter |

## Types of Audit Opinion
- **Unmodified** — financial statements give true & fair view
- **Qualified** — material but not pervasive misstatement / limitation
- **Adverse** — material AND pervasive misstatement
- **Disclaimer** — material AND pervasive limitation of scope

## Audit Risk
**Audit Risk = Inherent Risk × Control Risk × Detection Risk**

- IR & CR → assessed by auditor (cannot change)
- DR → auditor controls this by changing substantive procedures

## Materiality
- Quantitative: typically 0.5%–1% of revenue or 5%–10% of PBT
- Qualitative: nature of item regardless of amount

> **Exam tip:** Know the difference between Qualified, Adverse, and Disclaimer opinions — ICAI frequently tests this with scenarios.
$MD$);
END IF;

-- ── FINAL ───────────────────────────────────────────────────

-- Financial Reporting
SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%financial reporting%' AND level = 'Final' LIMIT 1;
IF sid IS NOT NULL THEN
  INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Ind AS — Key Standards Quick Reference', $MD$
## Ind AS 2 — Inventories
- **Cost** = Purchase Cost + Conversion Cost + Other Costs
- **NRV** = Estimated Selling Price − Estimated Costs to Complete − Selling Costs
- **Measurement:** Lower of Cost and NRV
- **Cost Formulas:** FIFO or Weighted Average (LIFO not permitted)

## Ind AS 16 — PPE
- **Initial Recognition:** Cost model
- **Subsequent:** Cost model OR Revaluation model
- **Depreciation:** Component approach mandatory
- **Derecognition:** Gain/loss to P&L (not OCI)

## Ind AS 109 — Financial Instruments
### Classification of Financial Assets
| Business Model | Cash Flow Test | Category |
|---|---|---|
| Hold to collect | SPPI | Amortised Cost |
| Hold to collect & sell | SPPI | FVOCI |
| Other | Any | FVTPL |

### Impairment — ECL Model
- **Stage 1:** 12-month ECL (no significant increase in credit risk)
- **Stage 2:** Lifetime ECL (significant increase, not credit-impaired)
- **Stage 3:** Lifetime ECL (credit-impaired)

## Ind AS 115 — Revenue
**5-Step Model:**
1. Identify the contract
2. Identify performance obligations
3. Determine transaction price
4. Allocate transaction price
5. Recognise revenue when/as PO satisfied

## Ind AS 116 — Leases (Lessee)
- **Right-of-Use Asset** = Lease Liability + Initial Direct Costs + Prepayments − Lease Incentives
- **Lease Liability** = PV of future lease payments
- Short-term leases (≤12 months) & low-value assets → straight-line expense

> **Exam tip:** Ind AS 109 ECL stages and Ind AS 115 five-step model are very high-frequency exam topics.
$MD$);
END IF;

-- SFM
SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%strategic financial%' AND level = 'Final' LIMIT 1;
IF sid IS NOT NULL THEN
  INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'SFM — Key Formulas', $MD$
## Capital Budgeting
- **NPV** = Σ [CFt / (1+r)t] − Initial Investment
- **IRR** = r at which NPV = 0
- **Payback Period** = Initial Investment / Annual Cash Flow
- **PI (Profitability Index)** = PV of Cash Inflows / Initial Investment
- **MIRR** = (FV of Cash Inflows / PV of Cash Outflows)^(1/n) − 1

## Cost of Capital
- **Kd (post-tax)** = I(1−t) / NP (for irredeemable)
- **Ke (Gordon Model)** = D1/P0 + g
- **Ke (CAPM)** = Rf + β(Rm − Rf)
- **WACC** = Σ (Weight × Cost of each component)

## Leverages
- **Operating Leverage** = Contribution / EBIT
- **Financial Leverage** = EBIT / EBT
- **Combined Leverage** = OL × FL = Contribution / EBT

## Portfolio Management
- **Expected Return** = Σ (Probability × Return)
- **Portfolio Return** = w₁R₁ + w₂R₂
- **Portfolio Variance** = w₁²σ₁² + w₂²σ₂² + 2w₁w₂ρ₁₂σ₁σ₂
- **Beta of Portfolio** = w₁β₁ + w₂β₂
- **Sharpe Ratio** = (Rp − Rf) / σp
- **Treynor Ratio** = (Rp − Rf) / βp

## Forex
- **Direct Quote:** 1 Foreign = x Domestic
- **Indirect Quote:** 1 Domestic = x Foreign
- **Cross Rate:** A/C = (A/B) × (B/C)
- **Forward Premium/Discount** = [(F−S)/S] × (12/n) × 100

> **Exam tip:** In CAPM, always use the risk-free rate carefully — sometimes T-bill rate and T-bond rate both are given; use the one specified.
$MD$);
END IF;

END $$;
