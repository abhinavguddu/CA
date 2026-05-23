import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

// Config
const PDF_DIR = path.resolve('./icai_pdfs');
const OUTPUT_FILE = path.resolve('./upload_icai_questions.sql');

if (!fs.existsSync(PDF_DIR)) {
  console.log(`\n[!] Directory not found: ${PDF_DIR}`);
  console.log(`Please create the 'icai_pdfs' folder in the root of your project.`);
  console.log(`Add your ICAI PDFs there. Naming convention:`);
  console.log(`  Question paper: Q_{Level}_{SubjectName}_{Month}{Year}.pdf (e.g. Q_Foundation_Accounting_May2023.pdf)`);
  console.log(`  Suggested Ans : A_{Level}_{SubjectName}_{Month}{Year}.pdf (e.g. A_Foundation_Accounting_May2023.pdf)\n`);
  process.exit(1);
}

async function extractTextFromPDF(filePath: string) {
  const dataBuffer = fs.readFileSync(filePath);
  try {
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return '';
  }
}

// Very basic heuristic to split text into questions
// In a real production system, you would pass this extracted text to an LLM (like Gemini or OpenAI) to get a perfect JSON array
function parseQuestions(text: string) {
  // Split by "Question" or "Q."
  const chunks = text.split(/(?:Question\s+\d+|Q\.\s*\d+)/i);
  const questions = [];
  
  for (let i = 1; i < chunks.length; i++) {
    // Clean up the text
    let qText = chunks[i].trim().replace(/\n/g, ' ');
    if (qText.length > 20) {
      // Estimate marks if we see something like [5 Marks] or (5 Marks)
      const marksMatch = qText.match(/[\(\[]\s*(\d+)\s*(?:Marks|M)[\)\]]/i);
      const marks = marksMatch ? parseInt(marksMatch[1]) : 5; // Default to 5
      
      questions.push({
        text: qText.substring(0, 800), // truncate if too long
        marks
      });
    }
  }
  return questions;
}

async function run() {
  const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files in ${PDF_DIR}`);
  
  const qFiles = files.filter(f => f.startsWith('Q_'));
  
  let sqlOutput = `-- Auto-generated ICAI Past Questions Seed Script\n-- Generated on ${new Date().toISOString()}\n\n`;

  for (const qFile of qFiles) {
    // Extract metadata from filename
    // Format: Q_Foundation_Accounting_May2023.pdf
    const match = qFile.match(/^Q_([a-zA-Z]+)_([a-zA-Z0-9]+)_([a-zA-Z]+)(\d{4})\.pdf$/);
    if (!match) {
      console.log(`[Skipping] ${qFile} does not match naming convention.`);
      continue;
    }
    
    const [_, level, subjectName, month, year] = match;
    console.log(`Processing: Level=${level}, Subject=${subjectName}, Exam=${month} ${year}`);

    // Try to find matching answer file
    const aFile = `A_${level}_${subjectName}_${month}${year}.pdf`;
    let answerText = '';
    let answers = [];
    
    if (files.includes(aFile)) {
      console.log(`  -> Found matching answer file: ${aFile}`);
      const rawAnsText = await extractTextFromPDF(path.join(PDF_DIR, aFile));
      answers = parseQuestions(rawAnsText); // Extract answer blocks
    } else {
      console.log(`  -> No matching answer file found. official_answer will be NULL.`);
    }

    const rawQText = await extractTextFromPDF(path.join(PDF_DIR, qFile));
    const questions = parseQuestions(rawQText);
    
    console.log(`  -> Extracted ${questions.length} questions.`);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const a = answers[i] ? answers[i].text : '';
      
      // Escape single quotes for SQL
      const safeQText = q.text.replace(/'/g, "''");
      const safeAText = a.replace(/'/g, "''");
      
      sqlOutput += `
INSERT INTO past_questions (level, exam_month, exam_year, paper, marks, question_text, official_answer, subject_id)
VALUES (
  '${level}', '${month}', ${year}, 'Paper: ${subjectName}', ${q.marks},
  '${safeQText}',
  ${safeAText ? `'**Model Answer:**\n${safeAText}'` : 'NULL'},
  (SELECT id FROM subjects WHERE level = '${level}' AND name ILIKE '%${subjectName}%' LIMIT 1)
);
`;
    }
  }

  fs.writeFileSync(OUTPUT_FILE, sqlOutput);
  console.log(`\n[SUCCESS] Generated SQL script: ${OUTPUT_FILE}`);
  console.log(`You can now copy the contents of this file and run it in your Supabase SQL Editor!`);
}

run().catch(console.error);
