import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, Plus, Upload, X, Maximize2, ChevronLeft, ChevronRight, ChevronsUpDown, FileText, Trash2, ExternalLink, ListChecks, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/books")({ component: BooksPage });

type Book = {
  id: string;
  title: string;
  author: string | null;
  level: string;
  subject_id: string | null;
  description: string | null;
  file_path: string | null;
  external_url: string | null;
  cover_path: string | null;
  created_at: string;
};

const LEVELS = ["Foundation", "Intermediate", "Final"] as const;

function BooksPage() {
  const { user, isAdmin, isTeacher } = useAuth();
  const canManage = isAdmin || isTeacher;
  const [filter, setFilter] = useState<string>("all");
  const [reading, setReading] = useState<Book | null>(null);
  const [practice, setPractice] = useState<Book | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: books, refetch } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*").order("level").order("title");
      if (error) throw error;
      return (data ?? []) as Book[];
    },
  });

  const { data: mcqCounts, refetch: refetchCounts } = useQuery({
    queryKey: ["mcq-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mcq_questions").select("book_id");
      if (error) return {};
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (!row.book_id) continue;
        counts[row.book_id] = (counts[row.book_id] ?? 0) + 1;
      }
      return counts;
    },
  });

  const filtered = useMemo(
    () => (books ?? []).filter((b) => filter === "all" || b.level === filter),
    [books, filter]
  );

  function bookUrl(b: Book): string | null {
    if (b.external_url) return b.external_url;
    if (b.file_path) {
      const { data } = supabase.storage.from("ca-materials").getPublicUrl(b.file_path);
      return data.publicUrl;
    }
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Books Library</h1>
          <p className="text-sm text-muted-foreground">Read CA books online — pick a book and open the reader.</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Close" : "Add Book"}
          </Button>
        )}
      </header>

      {canManage && showForm && (
        <AddBookForm
          onDone={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}

      <div className="flex gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
        {LEVELS.map((lv) => (
          <Button key={lv} variant={filter === lv ? "default" : "outline"} size="sm" onClick={() => setFilter(lv)}>
            {lv}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-3 size-10" />
          No books here yet. {canManage ? "Use 'Add Book' to add one." : "Check back soon."}
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => {
            const url = bookUrl(b);
            return (
              <Card key={b.id} className="group flex flex-col overflow-hidden">
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <BookOpen className="size-12 text-primary/50" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <Badge className="w-fit">{b.level}</Badge>
                  <h3 className="font-display text-lg leading-tight">{b.title}</h3>
                  {b.author && <p className="text-xs text-muted-foreground">by {b.author}</p>}
                  {b.description && <p className="line-clamp-2 text-sm text-muted-foreground">{b.description}</p>}
                  <div className="mt-auto flex items-center gap-2 pt-3">
                    {url ? (
                      <Button size="sm" className="flex-1" onClick={() => setReading(b)}>
                        <BookOpen className="size-4" /> Read
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No file</span>
                    )}
                    {(mcqCounts?.[b.id] ?? 0) > 0 && (
                      <motion.div
                        className="relative flex-1"
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <span className="pointer-events-none absolute -inset-0.5 animate-pulse rounded-lg bg-gradient-to-r from-amber-400/50 via-gold/50 to-amber-400/50" />
                        <Button
                          size="sm"
                          className="relative w-full gap-2 border-amber-300/60 bg-gradient-to-r from-amber-500 to-gold text-sidebar shadow-lg shadow-amber-500/25 transition-shadow hover:shadow-amber-500/40"
                          onClick={() => setPractice(b)}
                        >
                          <span className="relative flex size-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex size-2.5 rounded-full bg-white" />
                          </span>
                          <ListChecks className="size-4" />
                          <span className="font-semibold">Practice MCQs</span>
                          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
                            {mcqCounts?.[b.id]}
                          </span>
                        </Button>
                      </motion.div>
                    )}
                    {canManage && url && (
                      <Button size="sm" variant="outline" onClick={() => window.open(url, "_blank")}>
                        <ExternalLink className="size-4" />
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={async () => {
                          if (!confirm(`Delete "${b.title}"?`)) return;
                          if (b.file_path) await supabase.storage.from("ca-materials").remove([b.file_path]);
                          await supabase.from("books").delete().eq("id", b.id);
                          refetch();
                          toast.success("Book deleted");
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {reading && (
        <PdfReader book={reading} url={bookUrl(reading)} onClose={() => setReading(null)} />
      )}

      <AnimatePresence>
        {practice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <McqReader book={practice} onClose={() => { setPractice(null); refetchCounts(); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddBookForm({ onDone }: { onDone: () => void }) {
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, name, level").order("level")).data ?? [],
  });
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [level, setLevel] = useState<string>("Intermediate");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const subjectsForLevel = useMemo(
    () => (subjects ?? []).filter((s: any) => s.level === level),
    [subjects, level]
  );

  async function submit() {
    if (!title.trim()) return toast.error("Add a title");
    if (!externalUrl.trim() && !file) return toast.error("Provide a PDF file or external URL");
    setBusy(true);
    try {
      let filePath: string | null = null;
      let extUrl: string | null = null;
      let fileSize: number | null = null;

      if (file) {
        const clean = file.name.replace(/[^\w.\- ]/g, "_");
        filePath = `books/${Date.now()}_${clean}`;
        const { error: upErr } = await supabase.storage
          .from("ca-materials")
          .upload(filePath, file, { upsert: false });
        if (upErr) throw upErr;
        fileSize = file.size;
      } else {
        extUrl = externalUrl.trim();
      }

      const { error } = await supabase.from("books").insert({
        title: title.trim(),
        author: author.trim() || null,
        level,
        subject_id: subjectId === "none" ? null : subjectId,
        description: description.trim() || null,
        file_path: filePath,
        external_url: extUrl,
        file_size: fileSize,
      });
      if (error) throw error;
      toast.success("Book added");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add book");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-display text-2xl">Add a book</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CA Inter Law MCQs by Darshan Khare" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Author</label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Darshan Khare" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Level</label>
          <Select value={level} onValueChange={(v) => { setLevel(v); setSubjectId("none"); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Subject (optional)</label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {subjectsForLevel.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">PDF file (optional — upload)</label>
        <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Or paste a direct PDF URL</label>
        <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…/book.pdf" />
      </div>
      <Button onClick={submit} disabled={busy}>{busy ? "Uploading…" : "Add book"}</Button>
    </Card>
  );
}

function PdfReader({ book, url, onClose }: { book: Book; url: string | null; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const pdfjs: any = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const pdf = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setPage(1);
        setLoading(false);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to open PDF");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pdfRef.current || loading) return;
    let cancelled = false;
    (async () => {
      try {
        const pageObj = await pdfRef.current.getPage(page);
        const base = pageObj.getViewport({ scale: 1 });
        const ratio = 2;
        const viewport = pageObj.getViewport({ scale });
        canvas.width = viewport.width * ratio;
        canvas.height = viewport.height * ratio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext("2d")!;
        const task = pageObj.render({ canvasContext: ctx, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
        renderTaskRef.current = task;
        await task.promise;
        if (cancelled) return;
        containerRef.current?.scrollTo({ top: 0 });
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException") toast.error(e?.message ?? "Render failed");
      }
    })();
    return () => { cancelled = true; renderTaskRef.current?.cancel?.(); };
  }, [page, scale, loading]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg">{book.title}</h2>
            <p className="text-xs text-white/50">{book.author ? `${book.author} · ` : ""}{book.level}{numPages > 0 ? ` · ${numPages} pages` : ""}</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10"><X className="size-5" /></button>
      </div>

      <div className="flex items-center justify-center gap-2 border-b border-white/10 px-4 py-2 text-sm">
        <Button size="icon" variant="ghost" className="text-white" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="size-5" />
        </Button>
        <span className="min-w-[90px] text-center tabular-nums">
          Page {page}{numPages > 0 ? ` / ${numPages}` : ""}
        </span>
        <Button size="icon" variant="ghost" className="text-white" disabled={page >= numPages} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="size-5" />
        </Button>
        <div className="mx-2 h-4 w-px bg-white/15" />
        <Button size="sm" variant="ghost" className="text-white" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))}>−</Button>
        <span className="text-xs text-white/60">{Math.round(scale * 100)}%</span>
        <Button size="sm" variant="ghost" className="text-white" onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))}>+</Button>
        <div className="mx-2 h-4 w-px bg-white/15" />
        <Button size="sm" variant="ghost" className="text-white" onClick={() => url && window.open(url, "_blank")}>
          <Maximize2 className="size-4" /> Open in new tab
        </Button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-white/60">
            <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
            Opening book…
          </div>
        ) : (
          <canvas ref={canvasRef} className="max-w-full bg-white shadow-xl" />
        )}
      </div>
    </div>
  );
}

type McqQuestion = {
  id: string;
  chapter_no: number;
  chapter_title: string | null;
  question_no: number;
  question: string;
  options: string[];
  correct_index: number | null;
  hint: string | null;
};

function McqReader({ book, onClose }: { book: Book; onClose: () => void }) {
  const [chapter, setChapter] = useState<string>("0");
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const optionsRef = useRef<string[]>([]);
  const correctRef = useRef<number | null>(null);
  const hintRef = useRef<string | null>(null);

  const { data: questions, isLoading } = useQuery({
    queryKey: ["mcq-questions", book.id, chapter],
    queryFn: async () => {
      if (chapter === "0") return [];
      let q = supabase.from("mcq_questions").select("*").eq("book_id", book.id).eq("chapter_no", chapter as any).order("question_no");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as McqQuestion[];
    },
    enabled: chapter !== "0",
  });

  const { data: chapters } = useQuery({
    queryKey: ["mcq-chapters", book.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mcq_questions")
        .select("chapter_no, chapter_title")
        .eq("book_id", book.id)
        .order("chapter_no");
      if (error) throw error;
      const seen = new Map<number, string | null>();
      for (const row of data ?? []) {
        if (!seen.has(row.chapter_no)) seen.set(row.chapter_no, row.chapter_title);
      }
      return Array.from(seen.entries()).map(([no, title]) => ({ no, title }));
    },
  });

  const pq = (questions ?? [])[qIndex];
  if (pq) {
    optionsRef.current = pq.options as string[];
    correctRef.current = pq.correct_index;
    hintRef.current = pq.hint;
  }
  const options = optionsRef.current;
  const correct = correctRef.current;
  const answered = selected !== null;
  const isRight = answered && selected === correct;

  function pick(i: number) {
    if (answered) return;
    setSelected(i);
    setAnswers((a) => ({ ...a, [pq.question_no]: i }));
  }

  function score() {
    const entries = Object.entries(answers) as [string, number | null][];
    let done = 0;
    let right = 0;
    for (const [qnoStr, sel] of entries) {
      if (sel === null) continue;
      done++;
      const q = (questions ?? []).find((x) => x.question_no === Number(qnoStr));
      if (q && q.correct_index === sel) right++;
    }
    return { done, right };
  }

  function next() {
    if (qIndex + 1 < (questions ?? []).length) {
      setQIndex(qIndex + 1);
      setSelected(null);
    } else {
      onClose();
    }
  }

  function prev() {
    if (qIndex > 0) {
      setQIndex(qIndex - 1);
      const saved = answers[(questions ?? [])[qIndex - 1]?.question_no];
      setSelected(saved ?? null);
    }
  }

  const progress = questions && questions.length > 0 ? qIndex + 1 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <ListChecks className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg">{book.title} — MCQs</h2>
            {chapter === "0" ? (
              <p className="text-xs text-muted-foreground">Pick a chapter to practice</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {chapters?.find((c) => c.no === Number(chapter))?.title ?? `Chapter ${chapter}`} · {questions?.length ?? 0} questions
              </p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-accent"><X className="size-5" /></button>
      </div>

      {chapter !== "0" && (
        <Select value={chapter} onValueChange={(v) => { setChapter(v); setQIndex(0); setSelected(null); setAnswers({}); }}>
          <SelectTrigger className="mx-4 mt-3 w-fit">
            <SelectValue placeholder="Chapter" />
          </SelectTrigger>
          <SelectContent>
            {chapters?.map((c) => (
              <SelectItem key={c.no} value={String(c.no)}>Chapter {c.no}{c.title ? ` — ${c.title}` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {chapter === "0" ? (
          <div className="mx-auto max-w-2xl space-y-3 pt-6">
            <h3 className="font-display text-2xl">Choose a chapter</h3>
            <div className="grid gap-2">
              {chapters?.map((c) => (
                <Button key={c.no} variant="outline" className="h-auto justify-start px-4 py-3" onClick={() => setChapter(String(c.no))}>
                  <ChevronsUpDown className="size-4 text-primary" />
                  <span className="text-left">
                    <span className="block font-medium">Chapter {c.no}</span>
                    {c.title && <span className="block text-xs text-muted-foreground">{c.title}</span>}
                  </span>
                </Button>
              ))}
            </div>
            {(!chapters || chapters.length === 0) && (
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading…" : "No MCQs available for this book yet."}
              </p>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center gap-2 pt-16 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            Loading MCQs…
          </div>
        ) : questions && questions.length > 0 && pq ? (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Question {progress} of {questions.length}</span>
              <span>{score().right} correct / {score().done} answered</span>
            </div>
            {questions.length > 1 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress / questions.length) * 100}%` }} />
              </div>
            )}

            <Card className="p-6">
              <h3 className="font-display text-xl leading-relaxed md:text-2xl">{pq.question}</h3>
            </Card>

            <div className="grid gap-2 md:grid-cols-2">
              {options.map((opt, i) => {
                const isCorrect = i === correct;
                const isPicked = i === selected;
                return (
                  <Button
                    key={i}
                    variant="outline"
                    className={`h-auto justify-start whitespace-normal px-4 py-4 text-left text-base ${answered ? (isCorrect ? "border-green-500 bg-green-500/10 text-green-700" : isPicked ? "border-red-500 bg-red-500/10 text-red-700" : "opacity-60") : "hover:border-primary/50"}`}
                    onClick={() => pick(i)}
                    disabled={answered}
                  >
                    <span className="mr-3 flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold">
                      {String.fromCharCode(97 + i)}
                    </span>
                    {opt}
                  </Button>
                );
              })}
            </div>

            {answered && correct !== null && hintRef.current && (
              <Card className="flex gap-3 border-primary/30 bg-primary/5 p-4">
                <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Explanation</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{hintRef.current}</p>
                </div>
              </Card>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={prev} disabled={qIndex === 0}>
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <Button onClick={next}>
                {qIndex + 1 < questions.length ? "Next" : "Finish"} <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="pt-16 text-center text-muted-foreground">No questions in this chapter.</p>
        )}
      </div>
    </motion.div>
  );
}
