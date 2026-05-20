import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ingestDocument } from "@/lib/rag.functions";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher")({ component: TeacherPage });

function TeacherPage() {
  const { isTeacher } = useAuth();
  const ingest = useServerFn(ingestDocument);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [busy, setBusy] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("level").order("name")).data ?? [],
  });

  const { data: docs, refetch } = useQuery({
    queryKey: ["knowledge"],
    queryFn: async () => (await supabase.from("knowledge_documents").select("source_title, chunk_index, subject_id").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });

  if (!isTeacher) {
    return <div className="p-10 text-muted-foreground">Teacher access only. Ask an admin to grant the teacher role.</div>;
  }

  async function handlePdf(file: File) {
    try {
      setBusy(true);
      toast.info("Parsing PDF…");
      const pdfjs: any = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      let full = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        full += tc.items.map((it: any) => it.str).join(" ") + "\n\n";
      }
      setText(full);
      if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
      toast.success(`Parsed ${pdf.numPages} pages`);
    } catch (e: any) {
      toast.error(e.message ?? "PDF parse failed");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!title || text.length < 20) { toast.error("Add title and material"); return; }
    setBusy(true);
    try {
      const r = await ingest({ data: { sourceTitle: title, text, subjectId: subjectId === "none" ? null : subjectId } });
      toast.success(`Indexed ${r.chunks} chunks`);
      setTitle(""); setText("");
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Ingest failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <header>
        <h1 className="font-display text-4xl">Knowledge base</h1>
        <p className="text-sm text-muted-foreground">Upload ICAI study material. Text gets chunked, embedded, and indexed for RAG.</p>
      </header>

      <Card className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Source title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cost Accounting — Chapter 4 Overheads" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject (optional)</label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(subjects ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.level} · {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Upload PDF (auto-extract text)</label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdf(f); }} />
            <Upload className="size-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Or paste material</label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[200px]" placeholder="Paste study material text here…" />
          <p className="text-xs text-muted-foreground">{text.length.toLocaleString()} chars</p>
        </div>

        <Button onClick={submit} disabled={busy}>{busy ? "Working…" : "Index into knowledge base"}</Button>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-2xl">Indexed sources</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {Object.entries((docs ?? []).reduce<Record<string, number>>((acc, d) => { acc[d.source_title] = (acc[d.source_title] ?? 0) + 1; return acc; }, {})).map(([src, count]) => (
            <li key={src} className="flex items-center gap-2"><FileText className="size-4 text-muted-foreground" />{src} <span className="text-xs text-muted-foreground">· {count} chunks</span></li>
          ))}
          {!docs?.length && <li className="text-muted-foreground">No documents yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
