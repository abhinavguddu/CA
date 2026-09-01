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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateDetailedAnswer, addPastQuestion } from "@/lib/past-questions.functions";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { FileQuestion, Sparkles, RefreshCw, Plus, Calendar, BookMarked, CheckCircle2, Search, FileText, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/past-questions")({ component: PastQuestionsPage });

type AnswerResult = { answer: string; citations: any[] };

const PAPERS = [
  { paper: "Paper 1", label: "Advanced Accounting", abbr: "P1" },
  { paper: "Paper 2", label: "Corporate and Other Laws", abbr: "P2" },
  { paper: "Paper 3", label: "Taxation", abbr: "P3" },
  { paper: "Paper 4", label: "Cost and Management Accounting", abbr: "P4" },
  { paper: "Paper 5", label: "Auditing and Ethics", abbr: "P5" },
  { paper: "Paper 6", label: "Financial Management & Strategic Management", abbr: "P6" },
];

// ICAI Intermediate Course — Official Question Papers (newest first)
const PAPER_SESSIONS: { title: string; group: string; urls: string[] }[] = [
  {
    title: "May 2026",
    group: "Intermediate",
    urls: [
      "https://resource.cdn.icai.org/92099bos-aps4903-int-may2026-p1.pdf",
      "https://resource.cdn.icai.org/92143bos-aps4903-int-may2026-p2.pdf",
      "https://resource.cdn.icai.org/92144bos-aps4903-int-may2026-p3.pdf",
      "https://resource.cdn.icai.org/92190bos-aps4903-int-may2026-p4.pdf",
      "https://resource.cdn.icai.org/92223bos-aps4903-int-may2026-p5.pdf",
      "https://resource.cdn.icai.org/92261bos-aps4903-int-may2026-p6.pdf",
    ],
  },
  {
    title: "January 2026",
    group: "Intermediate",
    urls: [
      "https://resource.cdn.icai.org/90276bos-aps3856-int-jan2026-p1.pdf",
      "https://resource.cdn.icai.org/90277bos-aps3856-int-jan2026-p2.pdf",
      "https://resource.cdn.icai.org/90292bos-aps3856-int-jan2026-p3.pdf",
      "https://resource.cdn.icai.org/90301bos-aps3856-int-jan2026-p4.pdf",
      "https://resource.cdn.icai.org/90667bos-aps3856-int-jan2026-p5.pdf",
      "https://resource.cdn.icai.org/90369bos-aps3856-int-jan2026-p6.pdf",
    ],
  },
  {
    title: "September 2025",
    group: "Intermediate",
    urls: [
      "https://resource.cdn.icai.org/88187bos-aps2271-int-p1-sep2025.pdf",
      "https://resource.cdn.icai.org/88188bos-aps2271-int-p2-sep2025.pdf",
      "https://resource.cdn.icai.org/88227bos-aps2271-int-p3-sep2025.pdf",
      "https://resource.cdn.icai.org/88318bos-aps2271-int-p4-sep2025.pdf",
      "https://resource.cdn.icai.org/88273bos-aps2271-int-p5-sep2025.pdf",
      "https://resource.cdn.icai.org/88294bos160925.pdf",
    ],
  },
  {
    title: "May 2025",
    group: "Intermediate",
    urls: [
      "https://resource.cdn.icai.org/85767bos-aps471-int-p1.pdf",
      "https://resource.cdn.icai.org/85778bos-aps471-int-p2.pdf",
      "https://resource.cdn.icai.org/85835bos-aps471-int-p3.pdf",
      "https://resource.cdn.icai.org/86049bos-aps471-int-p4.pdf",
      "https://resource.cdn.icai.org/86050bos-aps471-int-p5.pdf",
      "https://resource.cdn.icai.org/86051bos-aps471-int-p6.pdf",
    ],
  },
  {
    title: "January 2025",
    group: "Intermediate",
    urls: [
      "https://resource.cdn.icai.org/84035bos67735.pdf",
      "https://resource.cdn.icai.org/84075bos67789.pdf",
      "https://resource.cdn.icai.org/84221bos67894-p3.pdf",
      "https://resource.cdn.icai.org/84222bos67894-p4.pdf",
      "https://resource.cdn.icai.org/84223bos67894-p5.pdf",
      "https://resource.cdn.icai.org/84224bos67894-p6.pdf",
    ],
  },
  {
    title: "September 2024",
    group: "Intermediate",
    urls: [
      "https://resource.cdn.icai.org/82175bos66213.pdf",
      "https://resource.cdn.icai.org/82193bos66232.pdf",
      "https://resource.cdn.icai.org/82205bos66245.pdf",
      "https://resource.cdn.icai.org/82219bos66270.pdf",
      "https://resource.cdn.icai.org/82232bos66294.pdf",
      "https://resource.cdn.icai.org/82246bos66313.pdf",
    ],
  },
  {
    title: "May 2024",
    group: "Intermediate",
    urls: [
      "https://resource.cdn.icai.org/80139bos64251.pdf",
      "https://resource.cdn.icai.org/80143bos64255.pdf",
      "https://resource.cdn.icai.org/80214bos64362.pdf",
      "https://resource.cdn.icai.org/80257bos64413.pdf",
      "https://resource.cdn.icai.org/80289bos64445.pdf",
      "https://resource.cdn.icai.org/80550bos64734.pdf",
    ],
  },
];

function QuestionPapersSection() {
  return (
    <div className="space-y-5">
      {PAPER_SESSIONS.map((s, si) => {
        const groupI = s.urls.slice(0, 3);
        const groupII = s.urls.slice(3, 6);
        return (
          <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * si + 0.05 }}>
            <Card className="glass-card p-6 border-[var(--gold)]/30 bg-gradient-to-br from-[var(--gold)]/5 to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
                <ExternalLink className="size-32 text-gold" />
              </div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 rounded-lg bg-[var(--gold)]/20 text-[var(--gold)]">
                  <Calendar className="size-5" />
                </div>
                <h2 className="font-display text-lg sm:text-2xl">ICAI Question Papers — Intermediate ({s.title})</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 relative z-10">
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary flex items-center gap-2 border-b border-border/50 pb-2">Group I</h3>
                  <ul className="space-y-3 text-sm">
                    {groupI.map((url, i) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
                          <FileText className="size-4 opacity-70 group-hover:opacity-100" /> {PAPERS[i].paper}: {PAPERS[i].label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary flex items-center gap-2 border-b border-border/50 pb-2">Group II</h3>
                  <ul className="space-y-3 text-sm">
                    {groupII.map((url, i) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
                          <FileText className="size-4 opacity-70 group-hover:opacity-100" /> {PAPERS[i + 3].paper}: {PAPERS[i + 3].label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function PastQuestionsPage() {
  const { isTeacher } = useAuth();
  const qc = useQueryClient();
  const genFn = useServerFn(generateDetailedAnswer);
  const addFn = useServerFn(addPastQuestion);

  const [level, setLevel] = useState<string>("all");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "subject">("subject");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("level").order("name")).data ?? [],
  });

  const { data: questions } = useQuery({
    queryKey: ["past_questions", level, subjectId, year, search],
    queryFn: async () => {
      let q = supabase.from("past_questions").select("*, subjects(name, level)").order("exam_year", { ascending: false }).order("exam_month", { ascending: false }).limit(500);
      if (level !== "all") q = q.eq("level", level as any);
      if (subjectId !== "all") q = q.eq("subject_id", subjectId);
      if (year !== "all") q = q.eq("exam_year", parseInt(year));
      if (search.trim()) q = q.ilike("question_text", `%${search.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: answeredIds } = useQuery({
    queryKey: ["answered_question_ids"],
    queryFn: async () => {
      const { data } = await supabase.from("question_answers").select("question_id");
      return new Set((data ?? []).map((r: any) => r.question_id as string));
    },
    staleTime: 60_000,
  });

  const answerQuery = useQuery<AnswerResult>({
    queryKey: ["question_answer", activeId],
    enabled: !!activeId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    queryFn: async () => {
      const r = await genFn({ data: { questionId: activeId! } });
      return { answer: r.answer, citations: (r.citations ?? []) as any[] };
    },
  });

  async function regenerate() {
    if (!activeId) return;
    try {
      const r = await genFn({ data: { questionId: activeId, regenerate: true } });
      qc.setQueryData<AnswerResult>(["question_answer", activeId], { answer: r.answer, citations: (r.citations ?? []) as any[] });
      qc.invalidateQueries({ queryKey: ["answered_question_ids"] });
      toast.success("Regenerated");
      logActivity("Regenerated an answer for a past question", undefined, "/past-questions");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  const years = useMemo(() => {
    const s = new Set<number>();
    (questions ?? []).forEach((q: any) => s.add(q.exam_year));
    return Array.from(s).sort((a, b) => b - a);
  }, [questions]);

  const active = (questions ?? []).find((q: any) => q.id === activeId);

  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; subjectName: string; subjectLevel: string; items: any[] }>();
    for (const q of questions ?? []) {
      const key = q.subject_id ?? "_none";
      const subjectName = q.subjects?.name ?? "Uncategorised";
      const subjectLevel = q.subjects?.level ?? q.level ?? "";
      if (!map.has(key)) map.set(key, { key, subjectName, subjectLevel, items: [] });
      map.get(key)!.items.push(q);
    }
    return Array.from(map.values()).sort((a, b) => {
      const order = { Foundation: 0, Intermediate: 1, Final: 2 } as Record<string, number>;
      const la = order[a.subjectLevel] ?? 9;
      const lb = order[b.subjectLevel] ?? 9;
      if (la !== lb) return la - lb;
      return a.subjectName.localeCompare(b.subjectName);
    });
  }, [questions]);

  function QuestionCard({ q, idx }: { q: any, idx: number }) {
    const hasAnswer = answeredIds?.has(q.id);
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
        <Card className="group relative cursor-pointer h-full overflow-hidden p-6 glass-card border-t-2 border-t-transparent hover:border-t-[var(--gold)] transition-all duration-300" onClick={() => { setActiveId(q.id); logActivity("Opened a past question", (q.question_text ?? "").slice(0, 80), "/past-questions"); }}>
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none transform translate-x-4 -translate-y-4">
            <BookMarked className="size-24 text-gold" />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground relative z-10">
            <Badge variant="outline" className="bg-background/50">{q.level}</Badge>
            {q.subjects?.name && <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20">{q.subjects.name}</Badge>}
            <span className="flex items-center gap-1.5 ml-auto text-primary"><Calendar className="size-3.5" />{q.exam_month} {q.exam_year}</span>
            {q.marks && <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold/10 text-gold border border-gold/20">{q.marks} marks</span>}
          </div>
          <p className="line-clamp-4 text-sm leading-relaxed text-foreground/90 relative z-10">{q.question_text}</p>
          <div className="mt-5 flex items-center gap-2 text-xs relative z-10">
            {hasAnswer ? (
              <span className="flex items-center gap-1.5 text-emerald-500 font-medium"><CheckCircle2 className="size-4" />Saved answer available</span>
            ) : (
              <span className="flex items-center gap-1.5 text-gold font-medium"><Sparkles className="size-4" />Generate AI answer</span>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-10 mesh-bg min-h-full">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-2">Past Exam Questions</h1>
          <p className="text-muted-foreground max-w-2xl">Browse previous ICAI exam questions. Generate highly accurate, citation-backed model answers with examiner tips.</p>
        </div>
        {isTeacher && <AddQuestionDialog subjects={subjects ?? []} onAdded={() => qc.invalidateQueries({ queryKey: ["past_questions"] })} addFn={addFn} />}
      </motion.header>

      <QuestionPapersSection />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass-card p-2 md:p-4 border-border/60">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="bg-background/50 border-0 h-11 focus:ring-primary/50"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="Foundation">Foundation</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Final">Final</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="bg-background/50 border-0 h-11 focus:ring-primary/50"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {(subjects ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.level} · {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="bg-background/50 border-0 h-11 focus:ring-primary/50"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search question text…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background/50 border-0 h-11 focus-visible:ring-primary/50" />
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full max-w-xs">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
            <TabsTrigger value="subject" className="rounded-md text-xs sm:text-sm">By Subject</TabsTrigger>
            <TabsTrigger value="grid" className="rounded-md text-xs sm:text-sm">All Questions</TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-xs sm:text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full whitespace-nowrap">{questions?.length ?? 0} found</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        {view === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
            {(questions ?? []).map((q: any, idx: number) => <QuestionCard key={q.id} q={q} idx={idx} />)}
            {!questions?.length && (
              <Card className="col-span-full p-16 text-center text-muted-foreground glass-card border-dashed">
                <FileQuestion className="mx-auto size-12 mb-4 opacity-50" />
                <p className="text-lg font-medium text-foreground">No past questions found.</p>
                <p className="mt-1">{isTeacher ? "Add the first one above." : "Try adjusting your filters or search."}</p>
              </Card>
            )}
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={grouped.slice(0, 1).map((g) => g.key)} className="space-y-4">
            {grouped.map((g) => (
              <AccordionItem key={g.key} value={g.key} className="rounded-2xl border border-border/60 glass-card px-2 md:px-6 overflow-hidden">
                <AccordionTrigger className="hover:no-underline py-5 group">
                  <div className="flex flex-wrap items-center gap-4 text-left">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-gold/10 text-gold group-hover:scale-110 transition-transform">
                      <BookMarked className="size-5" />
                    </div>
                    <span className="font-display text-2xl tracking-tight group-hover:text-primary transition-colors">{g.subjectName}</span>
                    <div className="flex items-center gap-2">
                      {g.subjectLevel && <Badge variant="outline" className="bg-background/50 border-border">{g.subjectLevel}</Badge>}
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{g.items.length} Qs</Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                    {g.items.map((q: any, idx: number) => <QuestionCard key={q.id} q={q} idx={idx} />)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
            {!grouped.length && (
              <Card className="p-16 text-center text-muted-foreground glass-card border-dashed">
                <FileQuestion className="mx-auto size-12 mb-4 opacity-50" />
                <p className="text-lg font-medium text-foreground">No past questions found.</p>
              </Card>
            )}
          </Accordion>
        )}
      </motion.div>

      <Dialog open={!!activeId} onOpenChange={(o) => { if (!o) setActiveId(null); }}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden border-0 bg-background shadow-2xl rounded-2xl">
          {active && (
            <div className="flex flex-col h-[90vh] max-h-[800px]">
              <DialogHeader className="p-4 md:p-6 border-b border-border/50 bg-muted/20">
                <DialogTitle className="font-display text-lg md:text-2xl">
                  <span className="flex flex-wrap items-center gap-2">
                    <div className="p-2 rounded-lg bg-gold/10 text-gold">
                      <BookMarked className="size-4" />
                    </div>
                    {active.exam_month} {active.exam_year}
                    {active.paper && <span className="text-muted-foreground font-sans text-base font-normal">· {active.paper}</span>}
                    {active.marks && <Badge className="ml-auto bg-gold/20 text-gold border-gold/30">{active.marks} marks</Badge>}
                  </span>
                </DialogTitle>
              </DialogHeader>
              
              <ScrollArea className="flex-1 p-4 md:p-6">
                <div className="space-y-8 pb-10">
                  <div className="rounded-2xl border border-border bg-card shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <div className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Question</div>
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">{active.question_text}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4 gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Sparkles className="size-4" />
                        </div>
                        <h3 className="font-display text-lg md:text-2xl tracking-tight">AI Model Answer</h3>
                      </div>
                      <Button size="sm" variant="outline" onClick={regenerate} disabled={answerQuery.isFetching} className="h-8 rounded-lg text-xs shrink-0">
                        <RefreshCw className={`mr-1.5 size-3 ${answerQuery.isFetching ? "animate-spin" : ""}`} /> Regenerate
                      </Button>
                    </div>

                    <AnimatePresence mode="wait">
                      {answerQuery.isLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <div className="relative mb-4">
                            <div className="absolute inset-0 bg-gold/20 blur-xl rounded-full" />
                            <Sparkles className="relative size-10 text-gold animate-pulse" />
                          </div>
                          <p>Analyzing question and generating model answer...</p>
                        </motion.div>
                      )}
                      
                      {answerQuery.isError && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 text-center">
                          <p className="font-semibold">Failed to generate answer</p>
                          <p className="text-sm mt-1 opacity-80">{(answerQuery.error as any)?.message ?? "An unexpected error occurred"}</p>
                        </motion.div>
                      )}
                      
                      {answerQuery.data && !answerQuery.isLoading && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none rounded-2xl border border-border/60 p-6 md:p-8 bg-muted/10">
                            <ReactMarkdown>{answerQuery.data.answer}</ReactMarkdown>
                          </div>
                          
                          {Array.isArray(answerQuery.data.citations) && answerQuery.data.citations.length > 0 && (
                            <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">References & Citations</p>
                              <div className="flex flex-wrap gap-2">
                                {answerQuery.data.citations.map((c: any) => (
                                  <div key={c.n} className="flex items-center gap-1.5 rounded-md bg-muted border border-border/40 px-2.5 py-1.5 text-xs font-medium text-foreground">
                                    <span className="text-primary opacity-70">[{c.n}]</span>
                                    <span>{c.title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </ScrollArea>
            </div>
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
      <DialogTrigger asChild><Button className="rounded-xl shadow-md"><Plus className="mr-2 size-4" /> Add question</Button></DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">Add past exam question</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v as any })}>
              <SelectTrigger className="h-12 rounded-xl bg-muted/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Foundation">Foundation</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Final">Final</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
              <SelectTrigger className="h-12 rounded-xl bg-muted/50"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.level} · {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Select value={form.examMonth} onValueChange={(v) => setForm({ ...form, examMonth: v })}>
              <SelectTrigger className="h-12 rounded-xl bg-muted/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["January", "May", "June", "November", "December"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" className="h-12 rounded-xl bg-muted/50" value={form.examYear} onChange={(e) => setForm({ ...form, examYear: parseInt(e.target.value) || 0 })} />
            <Input placeholder="Paper" className="h-12 rounded-xl bg-muted/50" value={form.paper} onChange={(e) => setForm({ ...form, paper: e.target.value })} />
            <Input type="number" placeholder="Marks" className="h-12 rounded-xl bg-muted/50" value={form.marks} onChange={(e) => setForm({ ...form, marks: parseInt(e.target.value) || 0 })} />
          </div>
          <Textarea placeholder="Question text…" className="min-h-[140px] rounded-xl bg-muted/50 resize-none p-4" value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} />
          <Textarea placeholder="Official / suggested answer (optional)" className="min-h-[100px] rounded-xl bg-muted/50 resize-none p-4" value={form.officialAnswer} onChange={(e) => setForm({ ...form, officialAnswer: e.target.value })} />
          <Button onClick={submit} disabled={busy} className="w-full h-12 rounded-xl text-base">{busy ? "Saving…" : "Save question"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
