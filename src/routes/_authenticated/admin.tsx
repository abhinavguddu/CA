import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Activity, UserCheck, CalendarDays, ShieldAlert, RefreshCw, ArrowLeft,
  Radio, ChevronRight, Play, Square,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

type LiveUser = { user_id: string; email: string; display_name: string | null; roles: string[]; last_seen: string; path: string | null };
type AdminUser = { user_id: string; email: string; display_name: string | null; roles: string[]; created_at: string; last_seen: string | null; total_activity: number | bigint; streak_days: number | bigint };
type ActivityRow = { id: string; user_id: string; email: string; display_name: string | null; activity: string; detail: string | null; path: string | null; created_at: string };

async function callRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T[]> {
  // @ts-expect-error typed client doesn't know these RPCs
  const { data, error } = await supabase.rpc(name, args);
  if (error) return [];
  return (data ?? []) as T[];
}

const fmtTime = (ts?: string | null) => (ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");
const fmtDate = (ts?: string | null) => (ts ? new Date(ts).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—");
const count = (v: number | bigint) => Number(v ?? 0);

function AdminPage() {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [allActivity, setAllActivity] = useState<ActivityRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [migrationMissing, setMigrationMissing] = useState(false);

  const refresh = useCallback(async () => {
    const [u, l, a] = await Promise.all([
      callRpc<AdminUser>("admin_users"),
      callRpc<LiveUser>("admin_live_users", { threshold_seconds: 120 }),
      callRpc<ActivityRow>("admin_activity", { limit_count: 120 }),
    ]);
    setUsers(u);
    setLiveIds(new Set(l.map((x) => x.user_id)));
    setAllActivity(a);
  }, []);

  // Detect if the per-student activity RPC is missing (admin_activity migration).
  useEffect(() => {
    if (!isAdmin) return;
    // @ts-expect-error typed client doesn't know these RPCs
    supabase.rpc("admin_user_activity", { p_user: "00000000-0000-0000-0000-000000000000", p_limit: 1 }).then(({ error }) => {
      setMigrationMissing(!!error && String(error.message).toLowerCase().includes("function") && String(error.message).toLowerCase().includes("does not exist"));
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [isAdmin, refresh]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen mesh-bg">
        <div className="text-center space-y-3 max-w-sm px-6">
          <ShieldAlert className="size-12 mx-auto text-muted-foreground/40" />
          <p className="text-lg font-semibold text-foreground">Admin access only</p>
          <p className="text-sm text-muted-foreground">Only users with the admin role can view this panel.</p>
        </div>
      </div>
    );
  }

  const activityLastHour = allActivity.filter((a) => new Date(a.created_at).getTime() > Date.now() - 3600000);
  const stats = [
    { icon: UserCheck, label: "Live Now", value: liveIds.size, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Users, label: "Total Users", value: users.length, color: "text-primary", bg: "bg-primary/10" },
    { icon: Activity, label: "Activity (1h)", value: activityLastHour.length, color: "text-gold", bg: "bg-gold/10" },
    { icon: CalendarDays, label: "Total Streak Days", value: users.reduce((s, u) => s + count(u.streak_days), 0), color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  const selected = users.find((u) => u.user_id === selectedId) ?? null;

  return (
    <div className="min-h-full mesh-bg">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 space-y-8">
        <div className="flex items-center justify-between">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-6 bg-gradient-to-r from-primary to-gold rounded-full" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Admin</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight">Student Control Panel</h1>
            <p className="text-muted-foreground mt-2">Each student has a card. Click one to open their full activity log, live view, and messaging.</p>
          </motion.div>
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-background/50 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>

        {migrationMissing && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
            <p className="font-semibold text-red-600 flex items-center gap-2"><ShieldAlert className="size-4" /> Per-student activity RPC missing</p>
            <p className="text-red-600/90 mt-1">
              Per-student activity logs need the admin migration. In Supabase SQL Editor run the file{" "}
              <code className="bg-red-500/10 px-1.5 py-0.5 rounded text-xs">supabase/migrations/20260901000000_admin_activity.sql</code>, then Refresh.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>

        {/* Student cards */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="size-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Students ({users.length})</p>
              <p className="text-xs text-muted-foreground">Click a card to open activity, live view &amp; messaging</p>
            </div>
          </div>

          {users.length === 0 ? (
            <Card className="glass-card p-8 text-center text-muted-foreground/60 text-sm">No users yet.</Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((u) => {
                const online = liveIds.has(u.user_id);
                const sel = u.user_id === selectedId;
                return (
                  <motion.button
                    key={u.user_id}
                    onClick={() => setSelectedId(u.user_id)}
                    whileHover={{ y: -3 }}
                    className={`text-left rounded-2xl border p-4 transition-all ${
                      sel ? "border-primary/60 bg-primary/5 shadow-md" : "border-border/40 bg-background/50 hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-gold/20 border border-border/50 font-bold text-foreground/80 text-sm">
                          {(u.display_name || u.email || "?").substring(0, 2).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background ${online ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{u.display_name || "No name"}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <p className={`text-[10px] font-bold ${online ? "text-emerald-500" : "text-muted-foreground/50"}`}>
                          {online ? "● online" : "offline"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 tabular-nums">{count(u.total_activity)} logs</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-1">{roleBadge(u.roles)}</div>
                      <CheckBtn label="Open" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Per-student detail */}
        <AnimatePresence>
          {selected && (
            <StudentDetail
              key={selected.user_id}
              student={selected}
              online={liveIds.has(selected.user_id)}
              onBack={() => setSelectedId(null)}
              onLiveActivity={(rows) => setAllActivity((prev) => {
                const map = new Map(prev.map((r) => [r.id, r]));
                for (const r of rows) map.set(r.id, r);
                return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              })}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CheckBtn({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary/80">
      {label} <ChevronRight className="size-3" />
    </span>
  );
}

function StudentDetail({ student, online, onBack, onLiveActivity }: {
  student: AdminUser;
  online: boolean;
  onBack: () => void;
  onLiveActivity: (rows: ActivityRow[]) => void;
}) {
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const activityRef = useRef<ActivityRow[]>([]);

  // Load existing activity
  useEffect(() => {
    let active = true;
    setLoading(true);
    callRpc<ActivityRow>("admin_user_activity", { p_user: student.user_id, p_limit: 500 }).then((acts) => {
      if (!active) return;
      setActivity(acts);
      setLoading(false);
    });
    return () => { active = false; };
  }, [student.user_id]);

  // Live activity for this user: realtime + 5s polling fallback so it always feels live
  useEffect(() => {
    if (!liveMode) return;
    const apply = (row: any) => {
      const mapped: ActivityRow = { id: row.id, user_id: row.user_id, email: student.email, display_name: student.display_name ?? null, activity: row.activity, detail: row.detail ?? null, path: row.path ?? null, created_at: row.created_at };
      setActivity((prev) => prev.some((p) => p.id === mapped.id) ? prev : [mapped, ...prev].slice(0, 500));
      onLiveActivity([mapped]);
    };
    const ch = supabase
      .channel(`admin-live-${student.user_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_activity", filter: `user_id=eq.${student.user_id}` }, (payload) => {
        apply(payload.new as any);
      })
      .subscribe();
    const poll = window.setInterval(async () => {
      const rows = await callRpc<ActivityRow>("admin_user_activity", { p_user: student.user_id, p_limit: 50 });
      const seen = new Set(activityRef.current.map((a) => a.id));
      const fresh = rows.filter((r) => !seen.has(r.id));
      if (fresh.length) {
        apply(fresh[0]);
        if (fresh.length > 1) setActivity((prev) => Array.from(new Map([...fresh, ...prev].map((r) => [r.id, r])).values()).slice(0, 500));
      }
    }, 5000);
    return () => { supabase.removeChannel(ch); window.clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode, student.user_id]);

  useEffect(() => { activityRef.current = activity; }, [activity]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
      <Card className="glass-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border/40 p-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-gold/20 border border-border/50 font-bold text-foreground/80 text-base">
                {(student.display_name || student.email || "?").substring(0, 2).toUpperCase()}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background ${online ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
            </div>
            <div>
              <p className="font-display text-xl text-foreground">{student.display_name || "No name"}</p>
              <p className="text-xs text-muted-foreground">{student.email} · joined {fmtDate(student.created_at)}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {roleBadge(student.roles)}
                <span className={`text-[11px] font-semibold ${online ? "text-emerald-500" : "text-muted-foreground/60"}`}>{online ? "● online now" : "offline"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setLiveMode((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${liveMode ? "border-red-500/40 bg-red-500/10 text-red-500" : "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"}`}
          >
            {liveMode ? <Square className="size-3.5" /> : <Play className="size-3.5" />} {liveMode ? "Live • On" : "Start Live View"}
          </button>
        </div>

        <div className="grid grid-cols-1">
          {/* Activity column */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-gold" />
                <p className="font-semibold text-foreground">Activity Log</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {liveMode ? <Radio className="size-3.5 text-emerald-500 animate-pulse" /> : <Radio className="size-3.5" />}
                {liveMode ? <span className="text-emerald-500 font-semibold">Live streaming actions…</span> : <span>{activity.length} actions</span>}
              </div>
            </div>

            {liveMode && (
              <p className="mb-3 text-[11px] rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 text-emerald-700">
                Showcasing a live, real-time activity view of this student (their navigation, questions answered, flashcards, mock tests, etc.). Full screen capture isn't supported, but you see exactly what they're doing as it happens.
              </p>
            )}

            {loading ? (
              <div className="animate-pulse text-sm text-muted-foreground py-6">Loading activity…</div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 py-6 text-center">No activity recorded for this student yet.</p>
            ) : (
              <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
                {activity.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors">
                    <div className="mt-1.5 size-2 rounded-full flex-shrink-0 bg-gradient-to-br from-primary to-gold" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{a.activity}</p>
                      {a.detail && <p className="text-[11px] text-muted-foreground/80 truncate">{a.detail}</p>}
                      {a.path && <p className="text-[10px] text-muted-foreground/50">{a.path}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">{fmtTime(a.created_at)}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function roleBadge(rs: string[]) {
  return rs.length ? (
    <div className="flex flex-wrap gap-1">
      {rs.map((r) => (
        <Badge key={r} variant={r === "admin" ? "destructive" : r === "teacher" ? "secondary" : "outline"} className="text-[10px] capitalize">
          {r}
        </Badge>
      ))}
    </div>
  ) : (
    <Badge variant="outline" className="text-[10px]">student</Badge>
  );
}
