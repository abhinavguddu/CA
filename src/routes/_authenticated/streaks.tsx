import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Flame, Trophy, Calendar, TrendingUp, Zap, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/streaks")({ component: StreaksPage });

const TODAY = new Date().toISOString().slice(0, 10);

function StreaksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Auto-log today's visit
  useEffect(() => {
    if (!user) return;
    supabase.from("study_streaks").upsert({ user_id: user.id, date: TODAY, minutes: 1 }, { onConflict: "user_id,date" }).then(() => {
      qc.invalidateQueries({ queryKey: ["streaks", user.id] });
    });
  }, [user, qc]);

  const { data: streaks } = useQuery({
    queryKey: ["streaks", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("study_streaks")
        .select("date, minutes")
        .order("date", { ascending: false })
        .limit(365);
      return data ?? [];
    },
  });

  const dateSet = useMemo(() => new Set((streaks ?? []).map((s: any) => s.date)), [streaks]);

  const { currentStreak, longestStreak, totalDays } = useMemo(() => {
    if (!streaks?.length) return { currentStreak: 0, longestStreak: 0, totalDays: 0 };

    const sorted = [...(streaks ?? [])].map((s: any) => s.date).sort().reverse();
    let cur = 0;
    let longest = 0;
    let temp = 0;
    let prev: Date | null = null;

    for (const d of sorted) {
      const date = new Date(d);
      if (!prev) {
        const diff = Math.floor((new Date(TODAY).getTime() - date.getTime()) / 86400000);
        if (diff <= 1) { cur = 1; temp = 1; }
        else { cur = 0; temp = 1; }
      } else {
        const diff = Math.floor((prev.getTime() - date.getTime()) / 86400000);
        if (diff === 1) {
          temp++;
          if (cur > 0) cur++;
        } else {
          if (temp > longest) longest = temp;
          temp = 1;
        }
      }
      if (temp > longest) longest = temp;
      prev = date;
    }

    return { currentStreak: cur, longestStreak: longest, totalDays: sorted.length };
  }, [streaks]);

  // Build last 52 weeks grid (364 days + today)
  const weeks = useMemo(() => {
    const days: { date: string; active: boolean }[] = [];
    for (let i = 363; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({ date: dateStr, active: dateSet.has(dateStr) });
    }
    // Pad start to align to Sunday
    const firstDay = new Date(days[0].date).getDay();
    const padded = Array(firstDay).fill(null).concat(days);
    const result: ({ date: string; active: boolean } | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) result.push(padded.slice(i, i + 7));
    return result;
  }, [dateSet]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstReal = week.find(Boolean);
      if (!firstReal) return;
      const m = new Date(firstReal.date).getMonth();
      if (m !== lastMonth) { labels.push({ label: new Date(firstReal.date).toLocaleString("default", { month: "short" }), col: wi }); lastMonth = m; }
    });
    return labels;
  }, [weeks]);

  const stats = [
    { icon: Flame, label: "Current Streak", value: `${currentStreak}d`, color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: Trophy, label: "Longest Streak", value: `${longestStreak}d`, color: "text-gold", bg: "bg-gold/10" },
    { icon: Calendar, label: "Total Days", value: `${totalDays}`, color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: TrendingUp, label: "This Month", value: `${(streaks ?? []).filter((s: any) => s.date.startsWith(TODAY.slice(0, 7))).length}d`, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="min-h-full mesh-bg">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-12 space-y-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-6 bg-gradient-to-r from-orange-500 to-gold rounded-full" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500/70">Consistency</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">Study Streak</h1>
          <p className="text-muted-foreground mt-2">Every day you open CA Mentor counts. Keep the streak alive.</p>
        </motion.div>

        {/* Streak Banner */}
        {currentStreak >= 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-gold p-6 shadow-xl shadow-orange-500/20">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none">
                <Flame className="size-28" />
              </div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Flame className="size-7 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">You're on fire!</p>
                  <p className="text-white font-display text-3xl leading-tight">{currentStreak} day streak 🔥</p>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-2">
                  <Star className="size-4 text-white" />
                  <span className="text-white text-sm font-semibold">Keep it up!</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Card className="premium-card p-5 text-center space-y-3">
                <div className={`mx-auto size-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`size-5 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-3xl font-display tabular-nums ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Heatmap */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="size-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Activity Heatmap</p>
                <p className="text-xs text-muted-foreground">Last 52 weeks</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Month labels */}
                <div className="flex mb-1" style={{ gap: "3px" }}>
                  {weeks.map((_, wi) => {
                    const lbl = monthLabels.find((m) => m.col === wi);
                    return (
                      <div key={wi} className="flex-shrink-0 text-[10px] text-muted-foreground font-medium" style={{ width: 12 }}>
                        {lbl?.label ?? ""}
                      </div>
                    );
                  })}
                </div>

                {/* Grid */}
                <div className="flex" style={{ gap: "3px" }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col" style={{ gap: "3px" }}>
                      {week.map((day, di) => (
                        <div
                          key={di}
                          title={day ? `${day.date}${day.active ? " ✓" : ""}` : ""}
                          className={`rounded-sm flex-shrink-0 transition-colors ${
                            !day ? "opacity-0" :
                            day.date === TODAY ? "ring-2 ring-primary ring-offset-1 ring-offset-background " + (day.active ? "bg-primary" : "bg-primary/20") :
                            day.active ? "bg-primary hover:bg-primary/80" : "bg-muted/60 hover:bg-muted"
                          }`}
                          style={{ width: 12, height: 12 }}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 mt-3 justify-end">
                  <span className="text-[10px] text-muted-foreground">Less</span>
                  {["bg-muted/60", "bg-primary/30", "bg-primary/60", "bg-primary"].map((c, i) => (
                    <div key={i} className={`rounded-sm ${c}`} style={{ width: 12, height: 12 }} />
                  ))}
                  <span className="text-[10px] text-muted-foreground">More</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Motivation */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/8 via-gold/5 to-transparent p-6">
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
              <Trophy className="size-20 text-gold" />
            </div>
            <div className="flex items-center gap-3 mb-1">
              <Trophy className="size-4 text-gold" />
              <span className="text-sm font-semibold text-gold">Pro Tip</span>
            </div>
            <p className="text-foreground font-medium">CA toppers study consistently — even 30 minutes daily beats 5-hour weekend cramming.</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
