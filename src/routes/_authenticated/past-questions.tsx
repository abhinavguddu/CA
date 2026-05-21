import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateDetailedAnswer, addPastQuestion } from "@/lib/past-questions.functions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { FileQuestion, Sparkles, RefreshCw, Plus, Calendar, BookMarked } from "lucide-react";

export const Route = createFileRoute("/_authenticated/past-questions")({ component: PastQuestionsPage });

function PastQuestionsPage() {
  const { isTeacher } = useAuth();
  const qc = useQueryClient();
  const genFn = useServerFn(generateDetailedAnswer);
  const addFn = useServerFn(addPastQuestion);

  const [level, setLevel] = useState<string>("all");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [answer, setAnswer] = useState<{ answer: string; citations: any } | null>(null);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("level").order("name")).data ?? [],
  });

  const { data: questions } = useQuery({
    queryKey: ["past_questions", level, subjectId, year, search],
    queryFn: async () => {
      let q = supabase.from("past_questions").select("*, subjects(name, level)").order("exam_year", { ascending: false }).order("exam_month", { ascending: false }).limit(200);
      if (level !== "all") q = q.eq("level", level as any);
      if (subjectId !== "all") q = q.eq("subject_id", subjectId);
      if (year !== "all") q = q.eq("exam_year", parseInt(year));
      if (search.trim()) q = q.ilike("question_text", `%${search.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const years = useMemo(() => {
    const s = new Set<number>();
    (questions ?? []).forEach((q: any) => s.add(q.exam_year));
    return Array.from(s).sort((a, b) => b - a);
  }, [questions]);

  const active = (questions ?? []).find((q: any) => q.id === activeId);

  async function openQuestion(id: string) {
    setActiveId(id);
    setAnswer(null);
    setGenerating(true);
    try {
      const r = await genFn({ data: { questionId: id } });
      setAnswer({ answer: r.answer, citations: r.citations });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function regenerate() {
    if (!activeId) return;
    setGenerating(true);
    setAnswer(null);
    try {
      const r = await genFn({ data: { questionId: activeId, regenerate: true } });
      setAnswer({ answer: r.answer, citations: r.citations });
      toast.success("Regenerated");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Past Exam Questions</h1>
          <p className="text-sm text-muted-foreground">Browse previous ICAI exam questions with AI-generated model answers, citations and examiner tips.</p>
        </div>
        {isTeacher && <AddQuestionDialog subjects={subjects ?? []} onAdded={() => qc.invalidateQueries({ queryKey: ["past_questions"] })} addFn={addFn} />}
      </header>

      <Card className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="Foundation">Foundation</SelectItem>
            <SelectItem value="Intermediate">Intermediate</SelectItem>
            <SelectItem value="Final">Final</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {(subjects ?? []).map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.level} · {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Search question text…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(questions ?? []).map((q: any) => (
          <Card key={q.id} className="group cursor-pointer p-5 transition hover:border-[var(--gold)]/60" onClick={() => openQuestion(q.id)}>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{q.level}</Badge>
              {q.subjects?.name && <Badge variant="secondary">{q.subjects.name}</Badge>}
              <span className="flex items-center gap-1"><Calendar className="size-3" />{q.exam_month} {q.exam_year}</span>
              {q.marks && <span className="ml-auto font-medium text-[var(--gold)]">{q.marks} marks</span>}
            </div>
            <p className="line-clamp-4 text-sm">{q.question_text}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3 text-[var(--gold)]" />
              <span>Click for detailed model answer</span>
            </div>
          </Card>
        ))}
        {!questions?.length && (
          <Card className="col-span-full p-10 text-center text-muted-foreground">
            <FileQuestion className="mx-auto size-8" />
            <p className="mt-2">No past questions yet. {isTeacher ? "Add the first one above." : "Ask your teacher to add some."}</p>
          </Card>
        )}
      </div>

      <Dialog open={!!activeId} onOpenChange={(o) => { if (!o) { setActiveId(null); setAnswer(null); } }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {active && (<span className="flex flex-wrap items-center gap-2 text-base">
                <BookMarked className="size-4 text-[var(--gold)]" />
                {active.exam_month} {active.exam_year}
                {active.paper && <span className="text-muted-foreground">· {active.paper}</span>}
                {active.marks && <Badge className="ml-2">{active.marks} marks</Badge>}
              </span>)}
            </DialogTitle>
          </DialogHeader>
          {active && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Question</div>
                  <p className="whitespace-pre-wrap text-sm">{active.question_text}</p>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl">Detailed model answer</h3>
                  <Button size="sm" variant="outline" onClick={regenerate} disabled={generating}>
                    <RefreshCw className={`mr-1 size-3 ${generating ? "animate-spin" : ""}`} />Regenerate
                  </Button>
                </div>

                {generating && <div className="text-sm text-muted-foreground">Generating detailed answer with citations…</div>}
                {answer && (
                  <>
                    <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border p-5">
                      <ReactMarkdown>{answer.answer}</ReactMarkdown>
                    </div>
                    {answer.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                        <span className="font-medium">References:</span>
                        {answer.citations.map((c) => (
                          <span key={c.n} className="rounded bg-muted px-1.5 py-0.5">[{c.n}] {c.title}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddQuestionDialog({ subjects, addFn, onAdded }: { subjects: any[]; addFn: any; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    level: "Intermediate" as "Foundation" | "Intermediate" | "Final",
    subjectId: "none",
    examMonth: "May",
    examYear: new Date().getFullYear(),
    paper: "",
    questionNumber: "",
    marks: 10,
    questionText: "",
    officialAnswer: "",
  });

  async function submit() {
    if (form.questionText.length < 5) { toast.error("Question text required"); return; }
    setBusy(true);
    try {
      await addFn({ data: {
        level: form.level,
        subjectId: form.subjectId === "none" ? null : form.subjectId,
        examMonth: form.examMonth,
        examYear: form.examYear,
        paper: form.paper || undefined,
        questionNumber: form.questionNumber || undefined,
        marks: form.marks || undefined,
        questionText: form.questionText,
        officialAnswer: form.officialAnswer || undefined,
      }});
      toast.success("Question added");
      setOpen(false);
      setForm({ ...form, questionText: "", officialAnswer: "", questionNumber: "" });
      onAdded();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 size-4" />Add question</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Add past exam question</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Foundation">Foundation</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Final">Final</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.level} · {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Select value={form.examMonth} onValueChange={(v) => setForm({ ...form, examMonth: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["January", "May", "June", "November", "December"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" value={form.examYear} onChange={(e) => setForm({ ...form, examYear: parseInt(e.target.value) || 0 })} />
            <Input placeholder="Paper" value={form.paper} onChange={(e) => setForm({ ...form, paper: e.target.value })} />
            <Input type="number" placeholder="Marks" value={form.marks} onChange={(e) => setForm({ ...form, marks: parseInt(e.target.value) || 0 })} />
          </div>
          <Textarea placeholder="Question text…" className="min-h-[120px]" value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} />
          <Textarea placeholder="Official / suggested answer (optional)" className="min-h-[100px]" value={form.officialAnswer} onChange={(e) => setForm({ ...form, officialAnswer: e.target.value })} />
          <Button onClick={submit} disabled={busy} className="w-full">{busy ? "Saving…" : "Save question"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
