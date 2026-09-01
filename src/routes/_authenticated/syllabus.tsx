import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Search, Sparkles, BookOpen, CheckCircle2, Clock, ChevronRight,
  GraduationCap, Target, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { logActivity } from "@/lib/activity";

type Level = "Foundation" | "Intermediate" | "Final";

export const Route = createFileRoute("/_authenticated/syllabus")({ component: Syllabus });

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
});

const LEVEL_CONFIG: Record<Level, { icon: typeof BookOpen; color: string; bg: string; border: string; glow: string }> = {
  Foundation: {
    icon: GraduationCap,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/10",
  },
  Intermediate: {
    icon: Layers,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    glow: "shadow-blue-500/10",
  },
  Final: {
    icon: Target,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    glow: "shadow-violet-500/10",
  },
};

function Syllabus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [level, setLevel] = useState<Level>("Intermediate");
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
    else {
      qc.invalidateQueries({ queryKey: ["syllabus"] });
      const statusLabel = patch.status ?? "updated";
      logActivity(`Marked topic as ${statusLabel}`, undefined, "/syllabus");
    }
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
    return (
      <div className="flex items-center justify-center min-h-screen mesh-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Loading syllabus…</p>
        </div>
      </div>
    );
  }

  const cur = stats[level];
  const pct = cur.total ? Math.round((cur.done / cur.total) * 100) : 0;
  const subjects = data.subjects.filter((s) => s.level === level);
  const filteredTopic = (text: string) => !q || text.toLowerCase().includes(q.toLowerCase());

  return (
    <div className="min-h-full mesh-bg">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-12 space-y-8">

        {/* ── Page Header ── */}
        <motion.div {...fadeUp(0)} className="space-y-1.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-6 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500/70">Study Plan</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">
            Syllabus <span className="text-gradient">Tracker</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            Mark chapters as complete, set your confidence level, and add quick revision notes.
            Your progress feeds into your personalized dashboard.
          </p>
        </motion.div>

        {/* ── Level Selector Cards ── */}
        <motion.div {...fadeUp(0.08)} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(Object.keys(stats) as Level[]).map((lvl) => {
            const s = stats[lvl];
            const p = s.total ? Math.round((s.done / s.total) * 100) : 0;
            const active = lvl === level;
            const cfg = LEVEL_CONFIG[lvl];
            const Icon = cfg.icon;

            return (
              <motion.button
                key={lvl}
                onClick={() => setLevel(lvl)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`text-left rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${
                  active
                    ? `border-transparent bg-gradient-to-br from-card to-card shadow-xl ${cfg.glow}`
                    : "border-border/60 bg-card/60 hover:border-border hover:bg-card shadow-sm"
                }`}
              >
                {/* Active accent bar */}
                {active && (
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${cfg.bg.replace("/10", "")} opacity-80`}
                    style={{ background: `linear-gradient(to right, transparent, currentColor, transparent)` }}
                  />
                )}
                {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent" style={{ color: lvl === "Foundation" ? "#10b981" : lvl === "Intermediate" ? "#3b82f6" : "#8b5cf6" }} />}

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`size-9 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                        <Icon className={`size-4 ${cfg.color}`} />
                      </div>
                      <span className="font-semibold text-foreground">{lvl}</span>
                    </div>
                    <span className={`text-2xl font-display tabular-nums ${active ? cfg.color : "text-muted-foreground"}`}>
                      {p}%
                    </span>
                  </div>
                  <Progress
                    value={p}
                    className={`h-1.5 ${active ? "" : "opacity-60"}`}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      {s.done}/{s.total} topics
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5 text-blue-400" />
                      {s.doneHours}/{s.hours}h
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Current Level Header ── */}
        <motion.div {...fadeUp(0.14)}>
          <div className="premium-card rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-2xl leading-none">CA {level}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {cur.done} of {cur.total} topics completed · {pct}% overall
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search topics…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-10 h-10 bg-background/60 border-border/60 focus:bg-background rounded-xl text-sm focus-visible:ring-primary/30"
                />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-semibold text-primary">{pct}%</span>
              </div>
              <Progress value={pct} className="h-2 rounded-full" />
            </div>
          </div>
        </motion.div>

        {/* ── Accordion ── */}
        <motion.div {...fadeUp(0.20)}>
          <Tabs value={level} onValueChange={(v) => setLevel(v as Level)}>
            <TabsContent value={level} className="mt-0">
              <Accordion type="multiple" className="space-y-3">
                {subjects.map((s) => {
                  const ts = data.topics.filter((t) => t.subject_id === s.id);
                  const visible = ts.filter((t) => filteredTopic(t.title));
                  const done = ts.filter((t) => data.progress.get(t.id)?.status === "completed").length;
                  const sPct = ts.length ? Math.round((done / ts.length) * 100) : 0;

                  if (q && visible.length === 0) return null;

                  return (
                    <AccordionItem
                      key={s.id}
                      value={s.id}
                      className="premium-card rounded-2xl border-0 overflow-hidden data-[state=open]:shadow-lg"
                    >
                      <AccordionTrigger className="hover:no-underline px-5 py-4 group data-[state=open]:border-b data-[state=open]:border-border/40">
                        <div className="flex flex-1 items-center gap-3 pr-3">
                          <div className="flex items-center justify-center size-9 rounded-xl bg-gold/10 border border-gold/20 transition-all group-hover:bg-gold/20 group-data-[state=open]:bg-gold/15">
                            <BookOpen className="size-4 text-gold" />
                          </div>
                          <span className="flex-1 text-left font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors">
                            {s.name}
                          </span>
                          <div className="hidden md:flex items-center gap-3 mr-2">
                            <div className="w-28">
                              <Progress value={sPct} className="h-1.5" />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground w-8 text-right tabular-nums">{sPct}%</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-[11px] font-semibold rounded-lg px-2.5 py-0.5 ${
                              done === ts.length && ts.length > 0
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {done}/{ts.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-5 pb-4 pt-2">
                        {ts.length === 0 ? (
                          <p className="py-6 text-sm text-center text-muted-foreground">Topics coming soon.</p>
                        ) : (
                          <div className="rounded-xl border border-border/50 bg-background/60 overflow-hidden mt-1">
                            <ul className="divide-y divide-border/40">
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
                                    onToggle={(v) =>
                                      upsertProgress(t.id, {
                                        status: v ? "completed" : "in_progress",
                                        confidence: v ? Math.max(p?.confidence ?? 0, 80) : p?.confidence ?? 50,
                                      })
                                    }
                                    onConfidence={(v) => upsertProgress(t.id, { confidence: v })}
                                    onNotes={(v) => upsertProgress(t.id, { notes: v })}
                                  />
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* ── CTA Banner ── */}
        <motion.div {...fadeUp(0.26)}>
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 p-7 shadow-2xl shadow-primary/25">
            {/* Decorations */}
            <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full blur-3xl translate-x-20 -translate-y-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gold/10 rounded-full blur-2xl -translate-x-10 translate-y-10 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex items-center justify-center size-12 rounded-2xl bg-white/10 backdrop-blur-sm flex-shrink-0">
                  <Sparkles className="size-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-display text-2xl text-primary-foreground leading-tight">Stuck on a topic?</h3>
                  <p className="text-primary-foreground/70 text-sm mt-1 leading-relaxed max-w-md">
                    Ask the AI teacher for a focused explanation with precise ICAI citations and practical examples.
                  </p>
                </div>
              </div>
              <Button asChild className="flex-shrink-0 bg-white text-primary hover:bg-white/90 rounded-xl shadow-lg shadow-black/15 font-semibold transition-all duration-200 hover:shadow-xl">
                <a href="/doubts" className="flex items-center gap-2">
                  Ask AI Teacher
                  <ChevronRight className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

function TopicRow({
  title, hours, completed, confidence, notes, onToggle, onConfidence, onNotes,
}: {
  title: string; hours: number; completed: boolean; confidence: number; notes: string;
  onToggle: (v: boolean) => void; onConfidence: (v: number) => void; onNotes: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes);
  const [localConf, setLocalConf] = useState(confidence);

  const confColor = localConf >= 80 ? "text-emerald-500" : localConf >= 50 ? "text-blue-500" : "text-amber-500";
  const confBadge = localConf >= 80
    ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700/30 dark:text-emerald-400 dark:bg-emerald-950/30"
    : localConf >= 50
    ? "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700/30 dark:text-blue-400 dark:bg-blue-950/30"
    : "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700/30 dark:text-amber-400 dark:bg-amber-950/30";

  return (
    <li className="group">
      <div
        className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${
          completed ? "bg-emerald-50/60 dark:bg-emerald-950/20" : "hover:bg-muted/40"
        }`}
        onClick={() => setOpen((o) => !o)}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={completed}
            onCheckedChange={(v) => onToggle(!!v)}
            className={`size-4 rounded-md transition-all ${
              completed ? "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 shadow-sm shadow-emerald-500/30" : ""
            }`}
          />
        </div>
        <span className={`flex-1 text-sm font-medium transition-all leading-snug ${
          completed ? "text-muted-foreground/60 line-through" : "text-foreground"
        }`}>
          {title}
        </span>

        {confidence > 0 && (
          <Badge
            variant="outline"
            className={`hidden text-[11px] sm:inline-flex rounded-full px-2 py-0 border ${confBadge} font-semibold`}
          >
            {confidence}%
          </Badge>
        )}

        <div className="flex items-center gap-2 ml-1">
          <span className="text-[11px] font-medium text-muted-foreground/60 tabular-nums">~{hours}h</span>
          <ChevronRight className={`size-3.5 text-muted-foreground/30 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 border-t border-border/40 bg-muted/20 grid gap-5 md:grid-cols-2">
              {/* Confidence */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confidence Level</span>
                  <span className={`text-sm font-bold tabular-nums ${confColor}`}>{localConf}%</span>
                </div>
                <Slider
                  value={[localConf]}
                  max={100}
                  step={10}
                  onValueChange={(v) => setLocalConf(v[0])}
                  onValueCommit={(v) => onConfidence(v[0])}
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">
                  <span>Weak</span>
                  <span>Average</span>
                  <span>Strong</span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Notes</span>
                <Input
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  onBlur={() => localNotes !== notes && onNotes(localNotes)}
                  placeholder="Key formula, mistake to avoid, reference page…"
                  className="h-9 text-sm bg-background/70 focus-visible:ring-primary/30 rounded-lg border-border/60"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
