import * as dotenv from 'dotenv';

// Load .env
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const headers = {
  'apikey': key,
  'Authorization': `Bearer ${key}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const questions = [
  // Foundation
  {
    level: 'Foundation',
    exam_month: 'December',
    exam_year: 2023,
    paper: 'Paper 1: Accounting',
    marks: 10,
    question_text: `X, Y and Z are partners sharing profits and losses in the ratio of 5:3:2. They decide to dissolve the partnership firm on 31st March, 2023. Prepare the Realisation Account and Partners' Capital Accounts assuming the assets realized ₹ 5,00,000 and liabilities were paid at ₹ 1,50,000. Realisation expenses amounted to ₹ 10,000.`,
  },
  {
    level: 'Foundation',
    exam_month: 'June',
    exam_year: 2022,
    paper: 'Paper 2: Business Laws',
    marks: 6,
    question_text: `What are the essentials of a valid acceptance under the Indian Contract Act, 1872? Explain with suitable examples.`,
  },
  {
    level: 'Foundation',
    exam_month: 'November',
    exam_year: 2020,
    paper: 'Paper 1: Accounting',
    marks: 8,
    question_text: `Distinguish between 'Capital Expenditure' and 'Revenue Expenditure' with at least 4 practical examples.`,
  },
  {
    level: 'Foundation',
    exam_month: 'May',
    exam_year: 2018,
    paper: 'Paper 2: Business Laws',
    marks: 5,
    question_text: `“A minor is liable to pay out of his property for necessaries supplied to him.” Discuss the validity of this statement in the light of the Indian Contract Act, 1872.`,
  },

  // Intermediate
  {
    level: 'Intermediate',
    exam_month: 'November',
    exam_year: 2023,
    paper: 'Paper 1: Advanced Accounting',
    marks: 8,
    question_text: `A Ltd. acquired 60% shares of B Ltd. on 1st April 2022. The share capital of B Ltd. is ₹ 10,00,000 and general reserve is ₹ 4,00,000. What is the amount of Non-Controlling Interest (NCI) as per Ind AS 110? Calculate the Goodwill/Capital Reserve assuming investment was ₹ 12,00,000.`,
  },
  {
    level: 'Intermediate',
    exam_month: 'May',
    exam_year: 2023,
    paper: 'Paper 2: Corporate and Other Laws',
    marks: 5,
    question_text: `Referring to the provisions of the Companies Act, 2013, state the matters relating to 'Ordinary Business' which may be transacted at an Annual General Meeting. What is the criteria for a resolution to be passed as a Special Resolution?`,
  },
  {
    level: 'Intermediate',
    exam_month: 'November',
    exam_year: 2021,
    paper: 'Paper 3: Taxation (GST)',
    marks: 6,
    question_text: `Explain the provisions relating to 'Time of Supply' of goods under Section 12 of the CGST Act, 2017.`,
  },
  {
    level: 'Intermediate',
    exam_month: 'May',
    exam_year: 2019,
    paper: 'Paper 5: Auditing and Ethics',
    marks: 4,
    question_text: `What are the statutory rights of a company auditor as per Section 143(1) of the Companies Act, 2013?`,
  },
  {
    level: 'Intermediate',
    exam_month: 'November',
    exam_year: 2016,
    paper: 'Paper 4: Cost and Management Accounting',
    marks: 8,
    question_text: `Define 'Zero Base Budgeting' (ZBB). How is it different from traditional budgeting? Outline the steps involved in ZBB.`,
  },

  // Final
  {
    level: 'Final',
    exam_month: 'November',
    exam_year: 2023,
    paper: 'Paper 1: Financial Reporting',
    marks: 14,
    question_text: `Discuss the principles of recognizing revenue from contracts with customers as per Ind AS 115. Briefly explain the 5-step model with a practical software licensing example.`,
  },
  {
    level: 'Final',
    exam_month: 'May',
    exam_year: 2022,
    paper: 'Paper 3: Advanced Auditing',
    marks: 6,
    question_text: `You are the auditor of XYZ Bank Ltd. During the audit, you noticed several NPA accounts were upgraded without actual recovery of arrears. How will you report this matter? Refer to relevant RBI circulars and Standards on Auditing.`,
  },
  {
    level: 'Final',
    exam_month: 'November',
    exam_year: 2020,
    paper: 'Paper 4: Direct Tax Laws',
    marks: 8,
    question_text: `Explain the concept of 'Place of Effective Management' (POEM) for determining the residential status of a foreign company under Section 6(3) of the Income-tax Act, 1961.`,
  },
  {
    level: 'Final',
    exam_month: 'May',
    exam_year: 2018,
    paper: 'Paper 5: Indirect Tax Laws (GST)',
    marks: 5,
    question_text: `Write a short note on 'Anti-Profiteering Measure' as per Section 171 of the CGST Act, 2017.`,
  },
  {
    level: 'Final',
    exam_month: 'November',
    exam_year: 2015,
    paper: 'Paper 1: Financial Reporting',
    marks: 12,
    question_text: `How do you treat 'Deferred Tax Assets' arising from unabsorbed depreciation and carry forward of losses as per Ind AS 12? State the conditions for recognition.`,
  }
];

async function seed() {
  console.log("Fetching subjects from DB...");
  const res = await fetch(`${url}/rest/v1/subjects?select=*`, { headers });
  
  if (!res.ok) {
    console.error("Error fetching subjects:", await res.text());
    return;
  }
  const subjects = await res.json();

  const questionsToInsert = questions.map(q => {
    let subject_id = null;
    
    if (subjects) {
      const levelSubjects = subjects.filter((s: any) => s.level === q.level);
      for (const s of levelSubjects) {
        if (q.paper.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])) {
          subject_id = s.id;
          break;
        }
      }
      
      if (!subject_id && levelSubjects.length > 0) {
         if (q.paper.includes('Accounting') || q.paper.includes('Financial')) {
            subject_id = levelSubjects.find((s: any) => s.name.includes('Account') || s.name.includes('Financial'))?.id;
         } else if (q.paper.includes('Law')) {
            subject_id = levelSubjects.find((s: any) => s.name.includes('Law'))?.id;
         } else if (q.paper.includes('Tax')) {
            subject_id = levelSubjects.find((s: any) => s.name.includes('Tax'))?.id;
         } else if (q.paper.includes('Audit')) {
            subject_id = levelSubjects.find((s: any) => s.name.includes('Audit'))?.id;
         }
      }
      
      if (!subject_id && levelSubjects.length > 0) {
        subject_id = levelSubjects[0].id;
      }
    }

    return {
      ...q,
      subject_id
    };
  });

  console.log(`Inserting ${questionsToInsert.length} past questions...`);
  
  const insertRes = await fetch(`${url}/rest/v1/past_questions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(questionsToInsert)
  });
  
  if (!insertRes.ok) {
    console.error("Error inserting questions:", await insertRes.text());
  } else {
    console.log(`Successfully inserted questions.`);
  }
}

seed().catch(console.error);
