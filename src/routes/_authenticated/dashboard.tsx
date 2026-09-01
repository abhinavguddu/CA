import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MessageSquare, BookOpen, Sparkles, ArrowRight, PlayCircle, Trophy, TrendingUp, Zap, Star, ClipboardList, Bookmark, FileText, Flame, Calendar, Pencil, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
});

const EXAM_META = [
  { label: "CA Foundation",    defaultDate: "2026-06-01", color: "from-emerald-500 to-teal-500",  shadow: "shadow-emerald-500/20" },
  { label: "CA Intermediate",  defaultDate: "2026-05-03", color: "from-blue-500 to-indigo-500",   shadow: "shadow-blue-500/20"    },
  { label: "CA Final",         defaultDate: "2026-05-03", color: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/20"  },
];

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      const [{ count: topics }, { count: completed }, { count: doubts }] = await Promise.all([
        supabase.from("topics").select("*", { count: "exact", head: true }),
        supabase.from("user_progress").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("doubts").select("*", { count: "exact", head: true }),
      ]);
      return { topics: topics ?? 0, completed: completed ?? 0, doubts: doubts ?? 0 };
    },
  });

  // ── Exam dates from Supabase ──
  const { data: examSettings } = useQuery({
    queryKey: ["exam_settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("exam_settings").select("label, exam_date");
      return data ?? [];
    },
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function startEdit() {
    const d: Record<string, string> = {};
    EXAM_META.forEach((e) => {
      const saved = examSettings?.find((s: any) => s.label === e.label);
      d[e.label] = saved?.exam_date ?? e.defaultDate;
    });
    setDraft(d);
    setEditing(true);
  }

  async function saveExamDates() {
    if (!user) return;
    setSaving(true);
    try {
      await Promise.all(
        EXAM_META.map((e) =>
          supabase.from("exam_settings").upsert(
            { user_id: user.id, label: e.label, exam_date: draft[e.label], updated_at: new Date().toISOString() },
            { onConflict: "user_id,label" },
          ),
        ),
      );
      qc.invalidateQueries({ queryKey: ["exam_settings"] });
      setEditing(false);
      toast.success("Exam dates saved");
      logActivity("Updated exam dates", undefined, "/dashboard");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const upcomingExams = EXAM_META.map((e) => {
    const saved = examSettings?.find((s: any) => s.label === e.label);
    const dateStr = saved?.exam_date ?? e.defaultDate;
    // Parse date as local midnight to avoid timezone offset issues
    const [y, m, d] = dateStr.split("-").map(Number);
    const examDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { ...e, dateStr, days };
  }).filter((e) => e.days > 0);

  const pct = stats && stats.topics > 0 ? Math.round((stats.completed / stats.topics) * 100) : 0;
  const circleRadius = 42;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleStrokeDashoffset = circleCircumference - (pct / 100) * circleCircumference;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Student";
  const quote = ["Every expert was once a beginner. Keep going!", "Success in CA is built one chapter at a time.", "ICAI tests not just knowledge, but perseverance."][new Date().getDay() % 3];

  return (
    <div className="min-h-full mesh-bg">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-12 space-y-10">

        {/* ── Header ── */}
        <motion.div {...fadeUp(0)} className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-6 bg-gradient-to-r from-primary to-gold rounded-full" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">{greeting}</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]">
            Ready to crush it,{" "}<span className="text-gradient">{firstName}?</span>
          </h1>
          <p className="text-muted-foreground text-base mt-2 max-w-lg">
            Your personalized CA exam prep dashboard. Track progress, ask doubts, practise questions.
          </p>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div className="grid gap-5 md:grid-cols-3">
          <motion.div {...fadeUp(0.08)}>
            <div className="premium-card rounded-2xl p-6 h-full relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/8 rounded-full blur-2xl group-hover:bg-primary/14 transition-colors duration-500" />
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10 text-primary"><TrendingUp className="size-4" /></div>
                <div><p className="font-semibold text-foreground text-sm">Syllabus Progress</p><p className="text-xs text-muted-foreground">Overall completion</p></div>
              </div>
              <div className="flex items-center gap-5">
                <div className="relative size-[100px] flex-shrink-0">
                  <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                    <circle className="text-muted/60 stroke-current" strokeWidth="7" cx="50" cy="50" r={circleRadius} fill="transparent" />
                    <motion.circle className="text-primary stroke-current" strokeWidth="7" strokeLinecap="round" cx="50" cy="50" r={circleRadius} fill="transparent"
                      initial={{ strokeDashoffset: circleCircumference }} animate={{ strokeDashoffset: circleStrokeDashoffset }}
                      transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }} style={{ strokeDasharray: circleCircumference }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold tabular-nums">{pct}%</span></div>
                </div>
                <div>
                  <p className="text-4xl font-display tabular-nums leading-none">{stats?.completed ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">of {stats?.topics ?? 0} topics done</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                    <Star className="size-3" />{pct > 0 ? `${pct}% Complete` : "Just started"}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.14)}>
            <Link to="/doubts" className="block h-full group">
              <div className="premium-card rounded-2xl p-6 h-full relative overflow-hidden cursor-pointer">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500 to-blue-500/0" />
                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-500/6 rounded-full blur-2xl group-hover:bg-blue-500/12 transition-colors duration-500" />
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="flex items-center justify-center size-9 rounded-xl bg-blue-500/10 text-blue-500"><MessageSquare className="size-4" /></div>
                  <div><p className="font-semibold text-foreground text-sm">Questions Asked</p><p className="text-xs text-muted-foreground">AI-resolved doubts</p></div>
                </div>
                <div className="mb-6"><p className="text-5xl font-display tabular-nums">{stats?.doubts ?? 0}</p><p className="text-sm text-muted-foreground mt-1">doubts answered</p></div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-500 group-hover:gap-2.5 transition-all duration-200"><span>Ask a new doubt</span><ArrowRight className="size-4" /></div>
              </div>
            </Link>
          </motion.div>

          <motion.div {...fadeUp(0.20)}>
            <div className="rounded-2xl p-6 h-full relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 shadow-xl shadow-primary/20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl translate-x-12 -translate-y-12" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold/10 rounded-full blur-xl -translate-x-8 translate-y-8" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex items-center justify-center size-9 rounded-xl bg-white/15 backdrop-blur-sm"><Sparkles className="size-4 text-gold" /></div>
                  <div><p className="font-semibold text-primary-foreground text-sm">AI Teacher</p><p className="text-xs text-primary-foreground/60">ICAI-trained</p></div>
                </div>
                <p className="text-primary-foreground/80 text-sm leading-relaxed flex-1">Cites Companies Act, GST, Ind AS, and SA standards precisely — just like your ICAI module would.</p>
                <div className="mt-5 pt-4 border-t border-white/15">
                  <div className="flex items-start gap-2"><Zap className="size-3.5 text-gold mt-0.5 flex-shrink-0" /><p className="text-xs text-primary-foreground/70 italic leading-relaxed">"{quote}"</p></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Exam Countdown ── */}
        <motion.div {...fadeUp(0.24)}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display text-2xl text-foreground">Exam Countdown</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
            {!editing ? (
              <button onClick={startEdit} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/8">
                <Pencil className="size-3.5" /> Edit dates
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={saveExamDates} disabled={saving} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
                  <Check className="size-3.5" /> {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive/8 transition-colors">
                  <X className="size-3.5" /> Cancel
                </button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {editing ? (
              <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {EXAM_META.map((exam) => (
                  <div key={exam.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${exam.color} p-5 shadow-lg ${exam.shadow}`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl translate-x-8 -translate-y-8 pointer-events-none" />
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-white/80" />
                        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">{exam.label}</span>
                      </div>
                      <input
                        type="date"
                        value={draft[exam.label] ?? exam.defaultDate}
                        onChange={(e) => setDraft((d) => ({ ...d, [exam.label]: e.target.value }))}
                        className="w-full rounded-xl bg-white/20 border border-white/30 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {EXAM_META.map((exam) => {
                  const saved = examSettings?.find((s: any) => s.label === exam.label);
                  const dateStr = saved?.exam_date ?? exam.defaultDate;
                  const [y, m, d] = dateStr.split("-").map(Number);
                  const examDate = new Date(y, m - 1, d);
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const days = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={exam.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${exam.color} p-5 shadow-lg ${exam.shadow}`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl translate-x-8 -translate-y-8 pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="size-4 text-white/80" />
                          <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">{exam.label}</span>
                        </div>
                        {days > 0 ? (
                          <>
                            <div className="flex items-end gap-2">
                              <span className="font-display text-5xl text-white tabular-nums leading-none">{days}</span>
                              <span className="text-white/70 text-sm font-medium mb-1">days left</span>
                            </div>
                            <p className="text-white/60 text-xs mt-2">
                              {new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </>
                        ) : (
                          <p className="text-white/70 text-sm font-medium mt-2">Exam passed — update date</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Quick Actions ── */}
        <motion.div {...fadeUp(0.26)}>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-display text-2xl text-foreground">Quick Actions</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { to: "/doubts",         icon: MessageSquare, label: "Ask AI Teacher",      sub: "Get instant answers",        iconBg: "bg-primary/10",    iconColor: "text-primary",    hoverBorder: "hover:border-primary/30 hover:bg-primary/3" },
              { to: "/syllabus",       icon: PlayCircle,    label: "Resume Study",         sub: "Continue your syllabus",     iconBg: "bg-emerald-500/10",iconColor: "text-emerald-500",hoverBorder: "hover:border-emerald-500/30 hover:bg-emerald-500/3" },
              { to: "/past-questions", icon: BookOpen,      label: "Practice Questions",   sub: "Past exam papers",           iconBg: "bg-amber-500/10",  iconColor: "text-amber-500",  hoverBorder: "hover:border-amber-500/30 hover:bg-amber-500/3" },
              { to: "/mock-test",      icon: ClipboardList, label: "Mock Test",            sub: "Timed self-assessment",      iconBg: "bg-purple-500/10", iconColor: "text-purple-500", hoverBorder: "hover:border-purple-500/30 hover:bg-purple-500/3" },
              { to: "/bookmarks",      icon: Bookmark,      label: "Bookmarks",            sub: "Saved questions & topics",   iconBg: "bg-pink-500/10",   iconColor: "text-pink-500",   hoverBorder: "hover:border-pink-500/30 hover:bg-pink-500/3" },
              { to: "/formula-sheets", icon: FileText,      label: "Formula Sheets",       sub: "Quick revision",             iconBg: "bg-cyan-500/10",   iconColor: "text-cyan-500",   hoverBorder: "hover:border-cyan-500/30 hover:bg-cyan-500/3" },
              { to: "/streaks",        icon: Flame,         label: "Study Streak",         sub: "Daily consistency",          iconBg: "bg-orange-500/10", iconColor: "text-orange-500", hoverBorder: "hover:border-orange-500/30 hover:bg-orange-500/3" },
            ].map((item) => (
              <Link key={item.to} to={item.to}>
                <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`premium-card rounded-2xl p-5 flex items-center gap-4 cursor-pointer border-2 border-transparent ${item.hoverBorder} transition-all duration-300 group`}>
                  <div className={`size-11 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className={`size-5 ${item.iconColor}`} />
                  </div>
                  <div><p className="font-semibold text-foreground text-sm">{item.label}</p><p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p></div>
                  <ArrowRight className="size-4 text-muted-foreground/40 ml-auto group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200" />
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Trophy Banner ── */}
        <motion.div {...fadeUp(0.32)}>
          <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/8 via-gold/5 to-transparent p-6">
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none"><Trophy className="size-24 text-gold" /></div>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1"><Trophy className="size-4 text-gold" /><span className="text-sm font-semibold text-gold">CA Exam Tip</span></div>
                <p className="text-foreground font-medium">Review past year questions to understand ICAI's expectation on presentation and depth.</p>
              </div>
              <Link to="/past-questions">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-gold-foreground font-semibold text-sm shadow-md shadow-gold/20 hover:shadow-lg hover:shadow-gold/30 transition-shadow">
                  Practice Now<ArrowRight className="size-4" />
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
