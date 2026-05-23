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
  if (!r.ok) throw new Error(`Embedding failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.embedding.values;
}

function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

// Ingest chunks of text extracted by the client. Teacher-only enforced via RLS.
export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      sourceTitle: z.string().min(1).max(300),
      subjectId: z.string().uuid().nullable().optional(),
      text: z.string().min(20).max(2_000_000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const chunks = chunkText(data.text);
    let inserted = 0;
    // Batch embeddings 16 at a time
    for (let i = 0; i < chunks.length; i += 16) {
      const batch = chunks.slice(i, i + 16);
      const embeds = await Promise.all(batch.map(embed));
      const rows = batch.map((content, j) => ({
        source_title: data.sourceTitle,
        subject_id: data.subjectId ?? null,
        chunk_index: i + j,
        content,
        embedding: embeds[j] as unknown as string,
      }));
      const { error } = await supabase.from("knowledge_documents").insert(rows);
      if (error) throw new Error(error.message);
      inserted += rows.length;
    }
    return { chunks: inserted };
  });

// Ask a question with RAG retrieval; persists user + assistant messages.
export const askDoubt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      doubtId: z.string().uuid(),
      question: z.string().min(2).max(4000),
      subjectId: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Persist the user message
    await supabase.from("doubt_messages").insert({
      doubt_id: data.doubtId,
      user_id: userId,
      role: "user",
      content: data.question,
    });

    // Retrieve context via vector search
    let contextChunks: { source_title: string; content: string; similarity: number }[] = [];
    try {
      const qEmbed = await embed(data.question);
      const { data: matches } = await supabase.rpc("match_knowledge", {
        query_embedding: qEmbed as unknown as string,
        match_count: 5,
        filter_subject: data.subjectId ?? undefined,
      });
      contextChunks = (matches ?? []) as typeof contextChunks;
    } catch (e) {
      console.error("Retrieval failed", e);
    }

    const ctxBlock = contextChunks.length
      ? contextChunks
          .map((c, i) => `[${i + 1}] (${c.source_title})\n${c.content}`)
          .join("\n\n---\n\n")
      : "No specific reference material was retrieved. Use your general CA knowledge.";

    // Load recent conversation history
    const { data: prior } = await supabase
      .from("doubt_messages")
      .select("role, content")
      .eq("doubt_id", data.doubtId)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = [
      {
        role: "system",
        content: `You are an expert AI Teacher for the Indian CA (Chartered Accountancy) examinations conducted by ICAI. You teach Foundation, Intermediate, and Final-level students.

Your style:
- Clear, structured, exam-oriented answers.
- Use headings and numbered steps.
- Quote relevant sections of the Companies Act, Income Tax Act, GST Act, AS / Ind AS, SA standards when applicable.
- Show worked examples with numbers wherever possible.
- End with a 1-line "Exam tip" when relevant.

Use the REFERENCE MATERIAL below as your primary source. If it does not cover the question, fall back to your general CA knowledge and clearly say so. When you use the reference, cite as [1], [2], etc.

REFERENCE MATERIAL:
${ctxBlock}`,
      },
      ...(prior ?? []).slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.question },
    ];

    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY missing");
    const geminiMessages = messages.filter((m) => m.role !== "system");
    const systemMsg = messages.find((m) => m.role === "system");
    const r = await fetch(
      `${GEMINI_API_BASE}/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
          contents: geminiMessages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        }),
      },
    );
    if (!r.ok) {
      const body = await r.text();
      if (r.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      throw new Error(`Gemini error: ${r.status} ${body}`);
    }
    const j = await r.json();
    const answer: string = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, no answer.";

    const citations = contextChunks.map((c, i) => ({
      n: i + 1,
      title: c.source_title,
      similarity: Number(c.similarity?.toFixed?.(3) ?? 0),
    }));

    await supabase.from("doubt_messages").insert({
      doubt_id: data.doubtId,
      user_id: userId,
      role: "assistant",
      content: answer,
      citations,
    });

    await supabase
      .from("doubts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.doubtId);

    return { answer, citations };
  });
