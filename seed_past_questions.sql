-- Seed Foundation Questions
INSERT INTO past_questions (level, exam_month, exam_year, paper, marks, question_text, subject_id)
VALUES 
(
  'Foundation', 'December', 2023, 'Paper 1: Accounting', 10,
  'X, Y and Z are partners sharing profits and losses in the ratio of 5:3:2. They decide to dissolve the partnership firm on 31st March, 2023. Prepare the Realisation Account and Partners Capital Accounts assuming the assets realized ₹ 5,00,000 and liabilities were paid at ₹ 1,50,000. Realisation expenses amounted to ₹ 10,000.',
  (SELECT id FROM subjects WHERE level = 'Foundation' AND name ILIKE '%Account%' LIMIT 1)
),
(
  'Foundation', 'June', 2022, 'Paper 2: Business Laws', 6,
  'What are the essentials of a valid acceptance under the Indian Contract Act, 1872? Explain with suitable examples.',
  (SELECT id FROM subjects WHERE level = 'Foundation' AND name ILIKE '%Law%' LIMIT 1)
),
(
  'Foundation', 'November', 2020, 'Paper 1: Accounting', 8,
  'Distinguish between Capital Expenditure and Revenue Expenditure with at least 4 practical examples.',
  (SELECT id FROM subjects WHERE level = 'Foundation' AND name ILIKE '%Account%' LIMIT 1)
),
(
  'Foundation', 'May', 2018, 'Paper 2: Business Laws', 5,
  'A minor is liable to pay out of his property for necessaries supplied to him. Discuss the validity of this statement in the light of the Indian Contract Act, 1872.',
  (SELECT id FROM subjects WHERE level = 'Foundation' AND name ILIKE '%Law%' LIMIT 1)
);

-- Seed Intermediate Questions
INSERT INTO past_questions (level, exam_month, exam_year, paper, marks, question_text, subject_id)
VALUES 
(
  'Intermediate', 'November', 2023, 'Paper 1: Advanced Accounting', 8,
  'A Ltd. acquired 60% shares of B Ltd. on 1st April 2022. The share capital of B Ltd. is ₹ 10,00,000 and general reserve is ₹ 4,00,000. What is the amount of Non-Controlling Interest (NCI) as per Ind AS 110? Calculate the Goodwill/Capital Reserve assuming investment was ₹ 12,00,000.',
  (SELECT id FROM subjects WHERE level = 'Intermediate' AND name ILIKE '%Account%' LIMIT 1)
),
(
  'Intermediate', 'May', 2023, 'Paper 2: Corporate and Other Laws', 5,
  'Referring to the provisions of the Companies Act, 2013, state the matters relating to Ordinary Business which may be transacted at an Annual General Meeting. What is the criteria for a resolution to be passed as a Special Resolution?',
  (SELECT id FROM subjects WHERE level = 'Intermediate' AND name ILIKE '%Law%' LIMIT 1)
),
(
  'Intermediate', 'November', 2021, 'Paper 3: Taxation (GST)', 6,
  'Explain the provisions relating to Time of Supply of goods under Section 12 of the CGST Act, 2017.',
  (SELECT id FROM subjects WHERE level = 'Intermediate' AND name ILIKE '%Tax%' LIMIT 1)
),
(
  'Intermediate', 'May', 2019, 'Paper 5: Auditing and Ethics', 4,
  'What are the statutory rights of a company auditor as per Section 143(1) of the Companies Act, 2013?',
  (SELECT id FROM subjects WHERE level = 'Intermediate' AND name ILIKE '%Audit%' LIMIT 1)
),
(
  'Intermediate', 'November', 2016, 'Paper 4: Cost and Management Accounting', 8,
  'Define Zero Base Budgeting (ZBB). How is it different from traditional budgeting? Outline the steps involved in ZBB.',
  (SELECT id FROM subjects WHERE level = 'Intermediate' AND name ILIKE '%Cost%' LIMIT 1)
);

-- Seed Final Questions
INSERT INTO past_questions (level, exam_month, exam_year, paper, marks, question_text, subject_id)
VALUES 
(
  'Final', 'November', 2023, 'Paper 1: Financial Reporting', 14,
  'Discuss the principles of recognizing revenue from contracts with customers as per Ind AS 115. Briefly explain the 5-step model with a practical software licensing example.',
  (SELECT id FROM subjects WHERE level = 'Final' AND name ILIKE '%Financial%' LIMIT 1)
),
(
  'Final', 'May', 2022, 'Paper 3: Advanced Auditing', 6,
  'You are the auditor of XYZ Bank Ltd. During the audit, you noticed several NPA accounts were upgraded without actual recovery of arrears. How will you report this matter? Refer to relevant RBI circulars and Standards on Auditing.',
  (SELECT id FROM subjects WHERE level = 'Final' AND name ILIKE '%Audit%' LIMIT 1)
),
(
  'Final', 'November', 2020, 'Paper 4: Direct Tax Laws', 8,
  'Explain the concept of Place of Effective Management (POEM) for determining the residential status of a foreign company under Section 6(3) of the Income-tax Act, 1961.',
  (SELECT id FROM subjects WHERE level = 'Final' AND name ILIKE '%Tax%' LIMIT 1)
),
(
  'Final', 'May', 2018, 'Paper 5: Indirect Tax Laws (GST)', 5,
  'Write a short note on Anti-Profiteering Measure as per Section 171 of the CGST Act, 2017.',
  (SELECT id FROM subjects WHERE level = 'Final' AND name ILIKE '%Tax%' LIMIT 1)
),
(
  'Final', 'November', 2015, 'Paper 1: Financial Reporting', 12,
  'How do you treat Deferred Tax Assets arising from unabsorbed depreciation and carry forward of losses as per Ind AS 12? State the conditions for recognition.',
  (SELECT id FROM subjects WHERE level = 'Final' AND name ILIKE '%Financial%' LIMIT 1)
);
