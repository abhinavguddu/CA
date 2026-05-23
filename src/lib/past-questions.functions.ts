import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com";

async function embed(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const r = await fetch(
    `${GEMINI_API_BASE}/v1beta/models/text-embedding-004:embedContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "models/text-embedding-004", content: { parts: [{ text }] } }),
    },
  );
  if (!r.ok) throw new Error(`Embedding failed: ${r.status}`);
  const j = await r.json();
  return j.embedding.values;
}

export const generateDetailedAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ questionId: z.string().uuid(), regenerate: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Return cached answer if present and not regenerating
    if (!data.regenerate) {
      const { data: cached } = await supabase
        .from("question_answers")
        .select("*")
        .eq("question_id", data.questionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached) return { answer: cached.answer, citations: cached.citations ?? [], cached: true };
    }

    const { data: q, error: qErr } = await supabase
      .from("past_questions")
      .select("*")
      .eq("id", data.questionId)
      .single();
    if (qErr || !q) throw new Error("Question not found");

    // RAG retrieval
    let chunks: { source_title: string; content: string; similarity: number }[] = [];
    try {
      const e = await embed(q.question_text);
      const { data: m } = await supabase.rpc("match_knowledge", {
        query_embedding: e as unknown as string,
        match_count: 6,
        filter_subject: q.subject_id ?? undefined,
      });
      chunks = (m ?? []) as typeof chunks;
    } catch (e) {
      console.error("Retrieval failed", e);
    }

    const ctx = chunks.length
      ? chunks.map((c, i) => `[${i + 1}] (${c.source_title})\n${c.content}`).join("\n\n---\n\n")
      : "No reference material retrieved. Use general CA knowledge.";

    const sys = `You are a senior CA faculty writing an EXAM-MODEL ANSWER for an ICAI ${q.level} past paper question (${q.exam_month} ${q.exam_year}${q.paper ? `, ${q.paper}` : ""}${q.marks ? `, ${q.marks} marks` : ""}).

Write the answer in the way ICAI examiners expect — to score full marks:
1. **Issue / Provision** — cite the exact Section, AS / Ind AS / SA, Rule, or Notification.
2. **Analysis / Working** — show every computation step in a clear table format. Include formulas.
3. **Conclusion** — explicit answer to what is asked.
4. **Presentation marks** — use headings, underline key numbers, working notes at the end.
5. Add an "Examiner's note" at the bottom on common mistakes & how to maximize marks.

Use the REFERENCE MATERIAL as primary source; cite as [1], [2] when used. If reference is silent, fall back to general CA knowledge and say so.

REFERENCE MATERIAL:
${ctx}`;

    const user = `Question (${q.marks ?? "?"} marks):\n${q.question_text}\n\n${q.official_answer ? `Official/suggested answer outline for reference:\n${q.official_answer}\n\n` : ""}Write the full model answer now.`;

    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY missing");
    const r = await fetch(
      `${GEMINI_API_BASE}/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
        }),
      },
    );
    if (!r.ok) {
      if (r.status === 429) throw new Error("Rate limit reached. Try again shortly.");
      throw new Error(`Gemini error: ${r.status}`);
    }
    const j = await r.json();
    const answer: string = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "No answer.";
    const citations = chunks.map((c, i) => ({ n: i + 1, title: c.source_title, similarity: Number(c.similarity?.toFixed?.(3) ?? 0) }));

    await supabase.from("question_answers").insert({
      question_id: data.questionId,
      answer,
      citations,
      model: "gemini-2.5-flash",
      generated_by: userId,
    });

    return { answer, citations, cached: false };
  });

export const addPastQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      subjectId: z.string().uuid().nullable().optional(),
      level: z.enum(["Foundation", "Intermediate", "Final"]),
      examMonth: z.string().min(1).max(20),
      examYear: z.number().int().min(1990).max(2100),
      paper: z.string().max(100).optional(),
      questionNumber: z.string().max(20).optional(),
      marks: z.number().int().min(1).max(100).optional(),
      questionText: z.string().min(5).max(10000),
      officialAnswer: z.string().max(20000).optional(),
      sourceUrl: z.string().url().optional(),
      topicTags: z.array(z.string().max(60)).max(20).optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("past_questions")
      .insert({
        subject_id: data.subjectId ?? null,
        level: data.level,
        exam_month: data.examMonth,
        exam_year: data.examYear,
        paper: data.paper ?? null,
        question_number: data.questionNumber ?? null,
        marks: data.marks ?? null,
        question_text: data.questionText,
        official_answer: data.officialAnswer ?? null,
        source_url: data.sourceUrl ?? null,
        topic_tags: data.topicTags ?? [],
        difficulty: data.difficulty ?? "medium",
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });
