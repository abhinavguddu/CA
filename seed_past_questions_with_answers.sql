-- Seed Foundation Questions
INSERT INTO past_questions (level, exam_month, exam_year, paper, marks, question_text, official_answer, subject_id)
VALUES 
(
  'Foundation', 'December', 2023, 'Paper 1: Accounting', 10,
  'X, Y and Z are partners sharing profits and losses in the ratio of 5:3:2. They decide to dissolve the partnership firm on 31st March, 2023. Prepare the Realisation Account and Partners Capital Accounts assuming the assets realized ₹ 5,00,000 and liabilities were paid at ₹ 1,50,000. Realisation expenses amounted to ₹ 10,000.',
  '**Model Answer:**\n1. **Realisation Account** will be credited with the assets realized (₹ 5,00,000) and debited with liabilities paid (₹ 1,50,000) and expenses (₹ 10,000).\n2. The net profit/loss on realisation will be distributed among X, Y, and Z in their profit-sharing ratio of 5:3:2.\n3. **Partners Capital Accounts** will be adjusted with the realisation profit/loss, and final settlement amounts will be paid to or brought in by the partners to close their accounts.',
  (SELECT id FROM subjects WHERE level = 'Foundation' AND name ILIKE '%Account%' LIMIT 1)
),
(
  'Foundation', 'June', 2022, 'Paper 2: Business Laws', 6,
  'What are the essentials of a valid acceptance under the Indian Contract Act, 1872? Explain with suitable examples.',
  '**Model Answer:**\nAs per Section 2(b) of the Indian Contract Act, 1872, the essentials of a valid acceptance are:\n1. **Absolute and Unqualified:** Acceptance must exactly match the terms of the offer. (e.g., A offers to sell a car for ₹ 2 Lakhs. B accepts to buy it for ₹ 2 Lakhs, not ₹ 1.8 Lakhs).\n2. **Communicated:** It must be communicated to the offeror.\n3. **Prescribed Mode:** Must be in the mode prescribed (if any) or a reasonable mode.\n4. **Within Time:** Must be accepted within the specified time, or a reasonable time if none is specified.\n5. **Intention to Fulfill:** Cannot precede the offer or be implied by mere silence.',
  (SELECT id FROM subjects WHERE level = 'Foundation' AND name ILIKE '%Law%' LIMIT 1)
),
(
  'Foundation', 'November', 2020, 'Paper 1: Accounting', 8,
  'Distinguish between Capital Expenditure and Revenue Expenditure with at least 4 practical examples.',
  '**Model Answer:**\n1. **Nature:** Capital expenditure benefits multiple accounting periods (increases asset capacity). Revenue expenditure benefits only the current period (maintains assets).\n2. **Recording:** Capital goes to the Balance Sheet. Revenue goes to the Trading/P&L Account.\n3. **Examples of Capital Expenditure:** Purchase of Machinery, Installation charges of a new plant, Extension of a building, Cost of obtaining a license.\n4. **Examples of Revenue Expenditure:** Monthly rent, Salary of employees, Repairs and maintenance, Depreciation on machinery.',
  (SELECT id FROM subjects WHERE level = 'Foundation' AND name ILIKE '%Account%' LIMIT 1)
),
(
  'Foundation', 'May', 2018, 'Paper 2: Business Laws', 5,
  'A minor is liable to pay out of his property for necessaries supplied to him. Discuss the validity of this statement in the light of the Indian Contract Act, 1872.',
  '**Model Answer:**\n**Valid.** According to Section 68 of the Indian Contract Act, 1872, if a person incapable of entering into a contract (like a minor) is supplied by another person with necessaries suited to his condition in life, the supplier is entitled to be reimbursed from the property of such incapable person.\n*Note:* The minor is not personally liable; only their property is liable for reimbursement.',
  (SELECT id FROM subjects WHERE level = 'Foundation' AND name ILIKE '%Law%' LIMIT 1)
);

-- Seed Intermediate Questions
INSERT INTO past_questions (level, exam_month, exam_year, paper, marks, question_text, official_answer, subject_id)
VALUES 
(
  'Intermediate', 'November', 2023, 'Paper 1: Advanced Accounting', 8,
  'A Ltd. acquired 60% shares of B Ltd. on 1st April 2022. The share capital of B Ltd. is ₹ 10,00,000 and general reserve is ₹ 4,00,000. What is the amount of Non-Controlling Interest (NCI) as per Ind AS 110? Calculate the Goodwill/Capital Reserve assuming investment was ₹ 12,00,000.',
  '**Model Answer:**\n1. **Net Assets of B Ltd:** Share Capital (10,00,000) + General Reserve (4,00,000) = ₹ 14,00,000.\n2. **NCI (40%):** 40% of 14,00,000 = ₹ 5,60,000.\n3. **Calculation of Goodwill / Capital Reserve:**\n   Cost of Investment = ₹ 12,00,000\n   Add: NCI at proportionate share = ₹ 5,60,000\n   Less: Net Assets of Subsidiary = (₹ 14,00,000)\n   **Goodwill** = ₹ 17,60,000 - ₹ 14,00,000 = **₹ 3,60,000**.',
  (SELECT id FROM subjects WHERE level = 'Intermediate' AND name ILIKE '%Account%' LIMIT 1)
),
(
  'Intermediate', 'May', 2023, 'Paper 2: Corporate and Other Laws', 5,
  'Referring to the provisions of the Companies Act, 2013, state the matters relating to Ordinary Business which may be transacted at an Annual General Meeting. What is the criteria for a resolution to be passed as a Special Resolution?',
  '**Model Answer:**\n1. **Ordinary Business (Sec 102):**\n   - Consideration of financial statements and reports of Board and Auditors.\n   - Declaration of dividend.\n   - Appointment of directors in place of those retiring.\n   - Appointment/ratification of statutory auditors and fixing their remuneration.\n2. **Special Resolution Criteria (Sec 114):**\n   - Intention to propose the resolution as a special resolution is specifically mentioned in the AGM notice.\n   - Votes cast in favor of the resolution (by members present in person, proxy, or electronic means) are not less than three times the number of votes cast against it.',
  (SELECT id FROM subjects WHERE level = 'Intermediate' AND name ILIKE '%Law%' LIMIT 1)
),
(
  'Intermediate', 'November', 2021, 'Paper 3: Taxation (GST)', 6,
  'Explain the provisions relating to Time of Supply of goods under Section 12 of the CGST Act, 2017.',
  '**Model Answer:**\nAs per Section 12 of the CGST Act, 2017, the time of supply of goods shall be the earlier of the following dates:\n1. The date of issue of invoice by the supplier or the last date on which he is required (under Sec 31) to issue the invoice with respect to the supply.\n2. The date on which the supplier receives the payment with respect to the supply.\n*Note:* Notification No. 66/2017 has exempted registered persons from paying GST on advances received for goods. Thus, practically, for goods, it is the date of invoice issuance.',
  (SELECT id FROM subjects WHERE level = 'Intermediate' AND name ILIKE '%Tax%' LIMIT 1)
),
(
  'Intermediate', 'May', 2019, 'Paper 5: Auditing and Ethics', 4,
  'What are the statutory rights of a company auditor as per Section 143(1) of the Companies Act, 2013?',
  '**Model Answer:**\nSection 143(1) grants the auditor the following statutory rights:\n1. Right of access at all times to the books of account and vouchers of the company, whether kept at the registered office or elsewhere.\n2. Right to obtain from the officers of the company such information and explanation as the auditor may consider necessary for the performance of his duties as an auditor.',
  (SELECT id FROM subjects WHERE level = 'Intermediate' AND name ILIKE '%Audit%' LIMIT 1)
);

-- Seed Final Questions
INSERT INTO past_questions (level, exam_month, exam_year, paper, marks, question_text, official_answer, subject_id)
VALUES 
(
  'Final', 'November', 2023, 'Paper 1: Financial Reporting', 14,
  'Discuss the principles of recognizing revenue from contracts with customers as per Ind AS 115. Briefly explain the 5-step model with a practical software licensing example.',
  '**Model Answer:**\nInd AS 115 uses a core principle: recognize revenue to depict the transfer of promised goods or services to customers in an amount that reflects the consideration to which the entity expects to be entitled. \n**The 5-Step Model:**\n1. **Identify the contract:** A signed software licensing agreement with a client.\n2. **Identify performance obligations:** Delivering the software license, and providing 1-year technical support (two separate obligations).\n3. **Determine transaction price:** Total contract value is ₹ 10 Lakhs.\n4. **Allocate transaction price:** ₹ 8 Lakhs to the software license, ₹ 2 Lakhs to the support based on standalone selling prices.\n5. **Recognize revenue:** ₹ 8 Lakhs recognized at a point in time (when license is delivered), and ₹ 2 Lakhs recognized over time (evenly over the 1-year support period).',
  (SELECT id FROM subjects WHERE level = 'Final' AND name ILIKE '%Financial%' LIMIT 1)
),
(
  'Final', 'May', 2022, 'Paper 3: Advanced Auditing', 6,
  'You are the auditor of XYZ Bank Ltd. During the audit, you noticed several NPA accounts were upgraded without actual recovery of arrears. How will you report this matter? Refer to relevant RBI circulars and Standards on Auditing.',
  '**Model Answer:**\nAccording to RBI Income Recognition and Asset Classification (IRAC) norms, an NPA account can only be upgraded to standard category when entire arrears of interest and principal are paid by the borrower.\n1. **Audit Procedure:** Obtain a list of accounts upgraded from NPA. Verify if actual cash recovery covering all overdues took place.\n2. **Reporting:** If accounts were upgraded merely through restructuring or without actual recovery, it violates RBI guidelines.\n3. **Audit Report:** The auditor should qualify the audit report (SA 705) stating the non-compliance and quantify the impact on bank provisioning and profits. It must also be reported in the LFAR (Long Form Audit Report).',
  (SELECT id FROM subjects WHERE level = 'Final' AND name ILIKE '%Audit%' LIMIT 1)
);
