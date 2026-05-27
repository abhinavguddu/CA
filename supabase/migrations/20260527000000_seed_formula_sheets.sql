-- ============================================================
-- CA Formula Sheets Seed — with KaTeX math syntax
-- Run in Supabase SQL Editor
-- ============================================================
DO $$
DECLARE sid uuid;
BEGIN

-- ── FOUNDATION ──────────────────────────────────────────────

SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%mathematics%' AND level = 'Foundation' LIMIT 1;
IF sid IS NOT NULL THEN
INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Maths — Progressions & Interest', $MD$
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

> Exam tip: In compound interest, always check if compounding is annual, half-yearly, or quarterly — adjust n and r accordingly.
$MD$);
END IF;

SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%accounting%' AND level = 'Foundation' LIMIT 1;
IF sid IS NOT NULL THEN
INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Accounts — Depreciation & Adjustments', $MD$
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

> Exam tip: Closing stock appears in both Trading A/c (credit) and Balance Sheet (asset) — never in P&L directly.
$MD$);
END IF;

-- ── INTERMEDIATE ────────────────────────────────────────────

SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%advanced accounting%' AND level = 'Intermediate' LIMIT 1;
IF sid IS NOT NULL THEN
INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Partnership — Goodwill & Ratios', $MD$
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

> Exam tip: Always prepare Revaluation A/c and Partners' Capital A/c in columnar format — it earns presentation marks.
$MD$);

INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'AS Standards — Key Formulas', $MD$
## AS 2 — Inventories
- **Cost of Inventory** = $\text{Purchase Cost} + \text{Conversion Cost} + \text{Other Costs}$
- **NRV** = $\text{Est. Selling Price} - \text{Est. Completion Cost} - \text{Selling Cost}$
- **Measurement** = $\min(\text{Cost},\ \text{NRV})$

## AS 10 — PPE
- **Depreciable Amount** = $\text{Cost} - \text{Residual Value}$
- **WDV Rate** = $\left[1 - \left(\dfrac{RV}{C}\right)^{1/n}\right] \times 100$

## AS 22 — Deferred Tax
- **Deferred Tax Asset/Liability** = $\text{Timing Difference} \times \text{Tax Rate}$
- **DTA** → when book profit < taxable profit
- **DTL** → when book profit > taxable profit

> Exam tip: AS 22 DTA is recognised only when there is virtual certainty of future taxable profits.
$MD$);
END IF;

SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%taxation%' AND level = 'Intermediate' LIMIT 1;
IF sid IS NOT NULL THEN
INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Income Tax — Salary & House Property', $MD$
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

## Capital Gains
- **STCG** = $\text{Sale Price} - \text{Cost} - \text{Transfer Expenses}$
- **LTCG** = $\text{Sale Price} - \text{Indexed Cost} - \text{Transfer Expenses}$
- **Indexed Cost** = $\text{Actual Cost} \times \dfrac{\text{CII (Sale Year)}}{\text{CII (Purchase Year)}}$

> Exam tip: Metro cities for HRA = Delhi, Mumbai, Chennai, Kolkata → 50%. All others → 40%.
$MD$);

INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'GST — Registration, ITC & Returns', $MD$
## GST Rate Structure
| Category | CGST | SGST | Total |
|---|---|---|---|
| Essential goods | 0% | 0% | 0% |
| Basic goods | 2.5% | 2.5% | 5% |
| Standard goods | 6% | 6% | 12% |
| Most goods/services | 9% | 9% | 18% |
| Luxury/demerit | 14% | 14% | 28% |

## Registration Threshold
- **Goods** = $₹40\ \text{lakh}$ (₹20L for special category states)
- **Services** = $₹20\ \text{lakh}$ (₹10L for special category states)

## Input Tax Credit
- **ITC Available** = $\text{Tax on Inputs} - \text{Blocked Credits}$
- **Reversal (Rule 42)** = $\dfrac{\text{Common Credit} \times \text{Exempt Turnover}}{\text{Total Turnover}}$

## Time of Supply — Goods
$$\text{TOS} = \min(\text{Invoice Date},\ \text{Receipt of Payment})$$

## Composition Levy
- **Manufacturer/Trader** = $1\%$ of turnover
- **Restaurant** = $5\%$ of turnover
- **Limit** = $₹1.5\ \text{crore}$

> Exam tip: Blocked credits u/s 17(5) — motor vehicles, food, club membership, works contract for immovable property. Memorise this list.
$MD$);
END IF;

SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%cost%' AND level = 'Intermediate' LIMIT 1;
IF sid IS NOT NULL THEN
INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Costing — Material, Labour & Overhead', $MD$
## Cost Sheet Structure
```
Prime Cost          = Direct Material + Direct Labour + Direct Expenses
Works/Factory Cost  = Prime Cost + Factory Overhead
Cost of Production  = Works Cost + Admin & Office Overhead
Cost of Goods Sold  = Cost of Production + Opening FG − Closing FG
Total Cost          = COGS + Selling & Distribution Overhead
Profit              = Sales − Total Cost
```

## Material Management
- **EOQ** = $\sqrt{\dfrac{2 \times D \times O}{C}}$
  where D = Annual Demand, O = Ordering Cost, C = Carrying Cost per unit
- **Reorder Level** = $\text{Max Consumption} \times \text{Max Lead Time}$
- **Minimum Level** = $\text{ROL} - (\text{Normal Consumption} \times \text{Normal Lead Time})$
- **Maximum Level** = $\text{ROL} + \text{EOQ} - (\text{Min Consumption} \times \text{Min Lead Time})$

## Labour Incentives
- **Halsey Premium** = $50\% \times \text{Time Saved} \times \text{Hourly Rate}$
- **Rowan Premium** = $\dfrac{\text{Time Saved}}{\text{Time Allowed}} \times \text{Time Taken} \times \text{Hourly Rate}$
- **Labour Turnover** = $\dfrac{\text{Separations}}{\text{Average Workers}} \times 100$

## Marginal Costing
- **Contribution** = $\text{Sales} - \text{Variable Cost}$
- **P/V Ratio** = $\dfrac{\text{Contribution}}{\text{Sales}} \times 100$
- **BEP (Units)** = $\dfrac{\text{Fixed Cost}}{\text{Contribution per unit}}$
- **BEP (₹)** = $\dfrac{\text{Fixed Cost}}{\text{P/V Ratio}}$
- **Margin of Safety** = $\text{Actual Sales} - \text{BEP Sales}$
- **MOS Ratio** = $\dfrac{\text{MOS}}{\text{Actual Sales}} \times 100$

> Exam tip: In marginal costing, fixed costs are period costs — never include them in closing stock valuation.
$MD$);
END IF;

SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%audit%' AND level = 'Intermediate' LIMIT 1;
IF sid IS NOT NULL THEN
INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Auditing — Risk, Materiality & Opinions', $MD$
## Audit Risk Model
$$\text{Audit Risk} = \text{Inherent Risk} \times \text{Control Risk} \times \text{Detection Risk}$$

- **IR & CR** → assessed, cannot be changed by auditor
- **DR** → controlled by auditor through substantive procedures

## Materiality
- **Planning Materiality** = $0.5\%\text{–}1\%\ \text{of Revenue}$ or $5\%\text{–}10\%\ \text{of PBT}$
- **Performance Materiality** = $50\%\text{–}75\%\ \text{of Planning Materiality}$

## Audit Opinions
| Opinion | Condition |
|---|---|
| Unmodified | True & fair view — no issues |
| Qualified | Material but NOT pervasive misstatement/limitation |
| Adverse | Material AND pervasive misstatement |
| Disclaimer | Material AND pervasive limitation of scope |

## Key SAs
| SA | Subject |
|---|---|
| SA 200 | Overall Objectives |
| SA 240 | Fraud Responsibilities |
| SA 315 | Risk Assessment |
| SA 320 | Materiality |
| SA 500 | Audit Evidence |
| SA 530 | Audit Sampling |
| SA 700/705/706 | Reporting |

> Exam tip: Adverse = misstatement (you know the truth, it's wrong). Disclaimer = limitation (you can't know the truth).
$MD$);
END IF;

-- ── FINAL ───────────────────────────────────────────────────

SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%financial reporting%' AND level = 'Final' LIMIT 1;
IF sid IS NOT NULL THEN
INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'Ind AS — Financial Instruments & Revenue', $MD$
## Ind AS 109 — Classification of Financial Assets
| Business Model | SPPI Test | Measurement |
|---|---|---|
| Hold to collect | Pass | Amortised Cost |
| Hold to collect & sell | Pass | FVOCI |
| Other / Trading | Any | FVTPL |

## Effective Interest Rate (EIR)
$$\text{Amortised Cost}_{t} = \text{Amortised Cost}_{t-1} + \text{EIR} \times \text{AC}_{t-1} - \text{Cash Flow}_t$$

## ECL Impairment Stages
| Stage | Trigger | ECL Measure |
|---|---|---|
| 1 | No significant increase in credit risk | 12-month ECL |
| 2 | Significant increase, not impaired | Lifetime ECL |
| 3 | Credit-impaired | Lifetime ECL |

## Ind AS 115 — 5-Step Revenue Model
1. Identify the **contract** with customer
2. Identify **performance obligations**
3. Determine **transaction price**
4. **Allocate** TP to POs (based on SSP)
5. Recognise revenue when/as **PO satisfied**

## Ind AS 116 — Leases (Lessee)
- **Lease Liability** = $PV\ \text{of future lease payments}$
- **ROU Asset** = $\text{Lease Liability} + \text{Initial Direct Costs} + \text{Prepayments} - \text{Incentives}$
- **Depreciation** = $\dfrac{\text{ROU Asset}}{\text{Lease Term}}$ (straight-line)

> Exam tip: Ind AS 109 ECL and Ind AS 115 five-step model are the two most tested topics in FR — know them cold.
$MD$);
END IF;

SELECT id INTO sid FROM public.subjects WHERE name ILIKE '%strategic financial%' AND level = 'Final' LIMIT 1;
IF sid IS NOT NULL THEN
INSERT INTO public.formula_sheets (subject_id, title, content) VALUES (sid, 'SFM — Capital Budgeting & Cost of Capital', $MD$
## Capital Budgeting
- **NPV** = $\displaystyle\sum_{t=1}^{n} \dfrac{CF_t}{(1+r)^t} - C_0$
- **IRR** = $r$ such that $NPV = 0$
- **Profitability Index** = $\dfrac{PV\ \text{of Inflows}}{C_0}$
- **MIRR** = $\left(\dfrac{FV\ \text{of Inflows}}{PV\ \text{of Outflows}}\right)^{1/n} - 1$
- **Payback Period** = $\dfrac{C_0}{\text{Annual CF}}$

## Cost of Capital
- **Kd (post-tax, irredeemable)** = $\dfrac{I(1-t)}{NP}$
- **Kd (redeemable)** = $\dfrac{I(1-t) + \frac{RV-NP}{n}}{\frac{RV+NP}{2}}$
- **Ke (Gordon)** = $\dfrac{D_1}{P_0} + g$
- **Ke (CAPM)** = $R_f + \beta(R_m - R_f)$
- **WACC** = $\displaystyle\sum w_i \cdot K_i$

## Leverages
- **Operating Leverage** = $\dfrac{\text{Contribution}}{\text{EBIT}}$
- **Financial Leverage** = $\dfrac{\text{EBIT}}{\text{EBT}}$
- **Combined Leverage** = $OL \times FL = \dfrac{\text{Contribution}}{\text{EBT}}$

## Portfolio Theory
- **Portfolio Return** = $w_1R_1 + w_2R_2$
- **Portfolio Variance** = $w_1^2\sigma_1^2 + w_2^2\sigma_2^2 + 2w_1w_2\rho_{12}\sigma_1\sigma_2$
- **Sharpe Ratio** = $\dfrac{R_p - R_f}{\sigma_p}$
- **Treynor Ratio** = $\dfrac{R_p - R_f}{\beta_p}$
- **Jensen's Alpha** = $R_p - [R_f + \beta_p(R_m - R_f)]$

## Forex
- **Forward Premium** = $\dfrac{F - S}{S} \times \dfrac{12}{n} \times 100$
- **Interest Rate Parity** = $\dfrac{F}{S} = \dfrac{1 + r_d}{1 + r_f}$
- **Purchasing Power Parity** = $\dfrac{F}{S} = \dfrac{1 + \text{Inflation}_d}{1 + \text{Inflation}_f}$

> Exam tip: In CAPM, β > 1 = aggressive stock (more volatile than market). β < 1 = defensive stock.
$MD$);
END IF;

END $$;
