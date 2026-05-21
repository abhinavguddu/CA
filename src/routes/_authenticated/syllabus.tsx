import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

type Level = "Foundation" | "Intermediate" | "Final";

export const Route = createFileRoute("/_authenticated/syllabus")({ component: Syllabus });

function Syllabus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [level, setLevel] = useState<Level>("Foundation");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["syllabus", user?.id],
    queryFn: async () => {
      const [subjects, topics, progress] = await Promise.all([
        supabase.from("subjects").select("*").order("level").order("name"),
        supabase.from("topics").select("*").order("order_index"),
        supabase.from("user_progress").select("*"),
      ]);
      const prog = new Map((progress.data ?? []).map((p) => [p.topic_id, p]));
      return { subjects: subjects.data ?? [], topics: topics.data ?? [], progress: prog };
    },
  });

  async function upsertProgress(topicId: string, patch: { status?: string; confidence?: number; notes?: string }) {
    if (!user) return;
    const existing = data?.progress.get(topicId);
    const { error } = await supabase.from("user_progress").upsert({
      user_id: user.id,
      topic_id: topicId,
      status: patch.status ?? existing?.status ?? "in_progress",
      confidence: patch.confidence ?? existing?.confidence ?? 50,
      notes: patch.notes ?? existing?.notes ?? null,
    }, { onConflict: "user_id,topic_id" });
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["syllabus"] });
  }

  const stats = useMemo(() => {
    if (!data) return null;
    const out: Record<Level, { total: number; done: number; hours: number; doneHours: number }> = {
      Foundation: { total: 0, done: 0, hours: 0, doneHours: 0 },
      Intermediate: { total: 0, done: 0, hours: 0, doneHours: 0 },
      Final: { total: 0, done: 0, hours: 0, doneHours: 0 },
    };
    const subjLvl = new Map(data.subjects.map((s) => [s.id, s.level as Level]));
    for (const t of data.topics) {
      const lvl = subjLvl.get(t.subject_id);
      if (!lvl || !out[lvl]) continue;
      out[lvl].total += 1;
      out[lvl].hours += t.estimated_hours ?? 0;
      if (data.progress.get(t.id)?.status === "completed") {
        out[lvl].done += 1;
        out[lvl].doneHours += t.estimated_hours ?? 0;
      }
    }
    return out;
  }, [data]);

  if (isLoading || !data || !stats) {
    return <div className="p-10 text-muted-foreground">Loading syllabus…</div>;
  }

  const cur = stats[level];
  const pct = cur.total ? Math.round((cur.done / cur.total) * 100) : 0;

  const subjects = data.subjects.filter((s) => s.level === level);
  const filteredTopic = (text: string) => !q || text.toLowerCase().includes(q.toLowerCase());

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <header className="space-y-2">
        <h1 className="font-display text-4xl md:text-5xl">Syllabus tracker</h1>
        <p className="text-sm text-muted-foreground">Tick chapters as you finish them, set your confidence, and jot notes. Progress feeds your dashboard.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(Object.keys(stats) as Level[]).map((lvl) => {
          const s = stats[lvl];
          const p = s.total ? Math.round((s.done / s.total) * 100) : 0;
          const active = lvl === level;
          return (
            <button key={lvl} onClick={() => setLevel(lvl)} className="text-left">
              <Card className={`transition ${active ? "border-[var(--gold)] shadow-md" : "hover:border-primary/40"}`}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl">{lvl}</span>
                    <Badge variant={active ? "default" : "secondary"}>{p}%</Badge>
                  </div>
                  <Progress value={p} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3" />{s.done}/{s.total} topics</span>
                    <span className="inline-flex items-center gap-1"><Clock className="size-3" />{s.doneHours}/{s.hours}h</span>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-display text-2xl">CA {level}</div>
              <div className="text-xs text-muted-foreground">{cur.done} of {cur.total} topics done · {pct}% complete</div>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search topics…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Progress value={pct} className="h-3" />
        </CardContent>
      </Card>

      <Tabs value={level} onValueChange={(v) => setLevel(v as Level)}>
        <TabsList className="hidden">
          <TabsTrigger value="Foundation">Foundation</TabsTrigger>
          <TabsTrigger value="Intermediate">Intermediate</TabsTrigger>
          <TabsTrigger value="Final">Final</TabsTrigger>
        </TabsList>
        <TabsContent value={level} className="mt-0">
          <Accordion type="multiple" className="space-y-3">
            {subjects.map((s) => {
              const ts = data.topics.filter((t) => t.subject_id === s.id);
              const visible = ts.filter((t) => filteredTopic(t.title));
              const done = ts.filter((t) => data.progress.get(t.id)?.status === "completed").length;
              const sPct = ts.length ? Math.round((done / ts.length) * 100) : 0;
              if (q && visible.length === 0) return null;
              return (
                <AccordionItem key={s.id} value={s.id} className="rounded-xl border border-border bg-card px-4">
                  <AccordionTrigger>
                    <div className="flex flex-1 items-center gap-4 pr-4">
                      <BookOpen className="size-4 text-[var(--gold)]" />
                      <span className="flex-1 text-left">{s.name}</span>
                      <div className="hidden w-40 md:block"><Progress value={sPct} className="h-1.5" /></div>
                      <Badge variant="secondary">{done}/{ts.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {ts.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">Topics coming soon.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {visible.map((t) => {
                          const p = data.progress.get(t.id);
                          const completed = p?.status === "completed";
                          return (
                            <TopicRow
                              key={t.id}
                              title={t.title}
                              hours={t.estimated_hours ?? 0}
                              completed={completed}
                              confidence={p?.confidence ?? 0}
                              notes={p?.notes ?? ""}
                              onToggle={(v) => upsertProgress(t.id, { status: v ? "completed" : "in_progress", confidence: v ? Math.max(p?.confidence ?? 0, 80) : p?.confidence ?? 50 })}
                              onConfidence={(v) => upsertProgress(t.id, { confidence: v })}
                              onNotes={(v) => upsertProgress(t.id, { notes: v })}
                            />
                          );
                        })}
                      </ul>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>
      </Tabs>

      <Card className="bg-gradient-to-br from-card to-muted/30">
        <CardContent className="flex flex-col items-start gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 text-[var(--gold)]" />
            <div>
              <div className="font-display text-lg">Stuck on a topic?</div>
              <div className="text-sm text-muted-foreground">Ask the AI teacher for a focused explanation with ICAI citations.</div>
            </div>
          </div>
          <Button asChild><a href="/doubts">Ask a doubt</a></Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TopicRow({ title, hours, completed, confidence, notes, onToggle, onConfidence, onNotes }: {
  title: string; hours: number; completed: boolean; confidence: number; notes: string;
  onToggle: (v: boolean) => void; onConfidence: (v: number) => void; onNotes: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes);
  const [localConf, setLocalConf] = useState(confidence);

  return (
    <li className="py-2">
      <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
        <Checkbox checked={completed} onCheckedChange={(v) => onToggle(!!v)} />
        <button onClick={() => setOpen((o) => !o)} className={`flex-1 text-left ${completed ? "text-muted-foreground line-through" : ""}`}>
          {title}
        </button>
        {confidence > 0 && (
          <Badge variant="outline" className="hidden text-xs sm:inline-flex">{confidence}%</Badge>
        )}
        <span className="text-xs text-muted-foreground">~{hours}h</span>
      </div>
      {open && (
        <div className="ml-8 mr-2 mt-2 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Confidence</span><span>{localConf}%</span>
            </div>
            <Slider value={[localConf]} max={100} step={5}
              onValueChange={(v) => setLocalConf(v[0])}
              onValueCommit={(v) => onConfidence(v[0])} />
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Notes</div>
            <Input value={localNotes} onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={() => localNotes !== notes && onNotes(localNotes)}
              placeholder="Key formula, mistake to avoid, reference page…" />
          </div>
        </div>
      )}
    </li>
  );
}
