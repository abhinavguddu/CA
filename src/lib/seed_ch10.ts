export const SEED_CH10 = `-- Chapter 10: Accounts of Companies
insert into public.mcq_questions (book_id, chapter_no, chapter_title, question_no, question, options, correct_index, hint)
select b.id, 10, 'Accounts of Companies', v.question_no, v.question, v.options, v.correct_index, v.hint
from public.books b
cross join lateral (values
(1, 'Activities specified under schedule VII are -', '["Eradicating hunger poverty and malnourishment","Promoting education Including vocational courses","Gender equality","All of the above"]'::jsonb, 3, NULL),
(2, 'Provisions of CSR are applicable to:', '["Companies with net worth of 500 Crore/more","Companies with turnover of 1000 Crore /more","Companies with net profit of 5 Crore /more in any financial year","All of the above"]'::jsonb, 3, NULL),
(3, 'OPC shall file a copy of the duly adopted financial statements to registrar In:', '["30 days of the date of meeting In which it was adopted","90 days of the date of meeting in which it was adopted","90 days from the closure of the financial statement","180 days from the closure of the financial statement"]'::jsonb, 3, NULL),
(4, 'Financial statements shall be signed by -', '["CFO","Director/MD/CEO","Company secretary","All of the above"]'::jsonb, 3, NULL),
(5, 'The CSR committee shall consist of………. directors in which one should be…………..', '["3, Independent Director","5, Independent Director","3, Nominee Director","5, Nominee Director"]'::jsonb, 0, NULL),
(6, 'As per section 128, Company shall prepare -', '["Books of account","Books and papers","Financial Statements","All of the above"]'::jsonb, 3, NULL),
(7, 'Penalty in case of failure to maintain books of accounts is -', '["imprisonment up to 1 year","50,000- 5,00,000 fine","Both a and b","Only fine, No Imprisonment"]'::jsonb, 2, NULL),
(8, 'CSR Committees of the Board shall consists of:', '["Directors forming 1 /3 rd of the total number of directors","At least 2 directors","3/more directors","3/more directors, out of which at least 1 director shall be an Independent."]'::jsonb, 3, NULL),
(9, 'Copy of Financial Statements to be filed -', '["Within 30 days","Within 30 days of last AGM","Within 21 days","Within 21 days of last AGM"]'::jsonb, 0, NULL),
(10, 'The Audited financial statements shall be available to members prior……….. before AGM', '["15 days","21 days","45 days","30 days"]'::jsonb, 1, NULL),
(11, 'Who can be appointed as an internal auditor?', '["Chartered Accountants","Cost Accountants","Any other professional","All of the above"]'::jsonb, 3, NULL),
(12, 'Net profit shall not include -', '["Any dividend received from foreign companies in India","Profit from indoor branch","Net profit from subsidiaries","None of the above"]'::jsonb, 0, NULL),
(13, 'Which of the following matters are not included in Board of Directors report-', '["Particulars of loans, guarantees or investments","State of Company Affairs","Auditor''s Appointment","CSR policy and initiatives"]'::jsonb, 2, NULL),
(14, 'Which of the following companies are not required to constitute CSR committee -', '["Company having net worth of 500 crore or more","Company having loans and advances of 100 Crore or more","Company having turnover of Rs 1000 crore or more","Company having net profit of Rs 5 crows or more"]'::jsonb, 1, NULL),
(14, 'Internal audit is mandatory for every private company having-', '["Turnover of 200 crore /outstanding Loan & advance exc. 100 crore","PSC of 50 crore /Turnover of 100 crore /outstanding Loan& advance exc. 100 crore","PSC of 25 crore /Turnover of 100 crore /outstanding Loan& advance exc. 50 crore","PSC of 50 crore /Turnover of 100 crore /outstanding Loan& advance exc. 10 crore"]'::jsonb, 1, NULL),
(15, 'Amount of money required to be spend on CSR initiatives is -', '["5% of Net profit","2.5% of Net profit","2% of Net profit","0.5% of Net profit"]'::jsonb, 0, NULL),
(16, 'The authority to prescribe Accounting Standards lies with -', '["Central Govt.","ICAI","Central Government as recommended by ICAI","NFRA"]'::jsonb, 2, NULL),
(17, 'For Re opening of accounts by court or tribunal''s order, arrange in order -', '["Application made by CG, SEBI or any authority","Court/tribunal passes order and notice served","Accounts rectified and representation taken & recast the accounts","All of the above"]'::jsonb, 2, NULL),
(18, 'A company is exempted from preparing CFS if it is -', '["All members have consented in writing","Not Listed in any stock exchange","Its ultimate holding company has files CFS","All of the above"]'::jsonb, 3, NULL),
(19, 'The Audited financial statements shall be available TO Nidhi companies holding-', '["50000 FV shares or 1% of total paid up share capital whichever is less","25000 FV shares or 1% of total paid up share capital whichever is less","5000 FV shares or 2% of total paid up share capital whichever is less","50000 FV shares or 2% of total paid up share capital whichever is less"]'::jsonb, 3, NULL),
(20, 'Penal provisions for non-disclosure of CSR expenditure for company is -', '["50,000- 25,00,000 fine","50,000-15,00,000 fine","50,000- 10,00,000 fine","50.000- 5,00,000 fine"]'::jsonb, 0, NULL),
(21, 'Where Books of accounts are kept other than registered office, the company shall -', '["intimate ROC within 7 days giving full address","intimate ROC within 7 days giving state name only","Intimate ROC within 15 days giving full address","Intimate ROC within 15 days giving state name only"]'::jsonb, 2, NULL),
(22, 'OPC shall file a copy of adopted Financial statement within -', '["90 day","180 days","45 days","60 days"]'::jsonb, 0, NULL),
(23, 'Duties of CSR committee does not include -', '["Formulate and recommend CSR policy","Monitor the CSR policy","Recommend the amount of expenditure for CSR activities","Maintain the accounts for expenditure on CSR"]'::jsonb, 1, NULL),
(24, 'As per Section 128(3) of the Companies Act, 2013………………. can inspect the books of accounts at………….', '["Auditor, anytime","Director, business hours","CFO, business hours","Director, monthly basis"]'::jsonb, 3, NULL)
) as v(question_no, question, options, correct_index, hint)
where b.title = 'CA Inter Law MCQs by Darshan Khare'
on conflict (book_id, chapter_no, question_no) do nothing;
`;
