/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  CalendarDays,
  Clock,
  Target,
  Rocket,
  Settings,
  Play,
  Pause,
  Square,
  Timer,
  CheckCircle2,
  Activity,
  Coffee,
  X,
  RotateCcw,
  Zap,
  Volume2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { differenceInDays, format, addDays } from "date-fns";
import { setupTables } from "@/lib/migrations.server";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/planner")({ component: Planner });

// Web Audio beep utility
function playBeep(frequency = 880, duration = 0.6, type: OscillatorType = "sine", volume = 0.4) {
  try {
    if (typeof window === "undefined") return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close(), (duration + 0.1) * 1000);
  } catch {
    // Browsers can block audio until a direct user gesture is available.
  }
}

function playStartSound() {
  playBeep(440, 0.15, "sine", 0.3);
  setTimeout(() => playBeep(660, 0.15, "sine", 0.3), 160);
  setTimeout(() => playBeep(880, 0.3, "sine", 0.4), 320);
}

function playEndSound() {
  playBeep(880, 0.15, "sine", 0.5);
  setTimeout(() => playBeep(660, 0.15, "sine", 0.5), 180);
  setTimeout(() => playBeep(440, 0.5, "sine", 0.5), 360);
  setTimeout(() => playBeep(330, 0.7, "sine", 0.4), 600);
}

// Pomodoro component
const WORK_MINS = 25;
const BREAK_MINS = 5;
const DAILY_STUDY_HOURS = 14;

function PomodoroModal({
  isOpen,
  onClose,
  topicTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
}) {
  const [isWork, setIsWork] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(WORK_MINS * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<any>(null);

  const totalSeconds = isWork ? WORK_MINS * 60 : BREAK_MINS * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  // Stroke math for SVG circle
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setSecondsLeft(WORK_MINS * 60);
    setIsWork(true);
  }, []);

  const handleStartStop = () => {
    if (!isRunning) {
      playStartSound();
    }
    setIsRunning((r) => !r);
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            playEndSound();
            if (isWork) {
              setSessionsCompleted((s) => s + 1);
              toast.success("Pomodoro complete. Time for a break.", { duration: 4000 });
              setIsWork(false);
              setSecondsLeft(BREAK_MINS * 60);
            } else {
              toast.info("Break over. Back to work.", { duration: 4000 });
              setIsWork(true);
              setSecondsLeft(WORK_MINS * 60);
            }
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isWork]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-700/80 bg-slate-950 p-6 text-white shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          title="Close focus timer"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="mb-6 pr-9">
          <div
            className={`mb-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${
              isWork
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {isWork ? <Zap className="size-3" /> : <Coffee className="size-3" />}
            {isWork ? "Focus Session" : "Break Time"}
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Pomodoro Focus</h2>
          <p className="mt-1 truncate text-sm text-slate-400">{topicTitle}</p>
          {sessionsCompleted > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              {sessionsCompleted} pomodoro{sessionsCompleted > 1 ? "s" : ""} completed today
            </p>
          )}
        </div>

        {/* Circular Timer */}
        <div className="relative flex items-center justify-center mb-8">
          <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
            {/* Track */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="10"
            />
            {/* Progress arc */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={isWork ? "#f59e0b" : "#10b981"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          {/* Time display in center */}
          <div className="absolute flex flex-col items-center">
            <span className="font-mono font-black text-6xl tracking-tight leading-none">
              <span className={isWork ? "text-amber-400" : "text-emerald-400"}>{mins}</span>
              <span className="text-slate-500 mx-1">:</span>
              <span
                className={`${isRunning ? "animate-pulse" : ""} ${isWork ? "text-amber-400" : "text-emerald-400"}`}
              >
                {secs}
              </span>
            </span>
            <span className="text-xs text-slate-500 mt-2 font-medium">
              {isWork ? `${WORK_MINS} min focus` : `${BREAK_MINS} min break`}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            title="Reset"
          >
            <RotateCcw className="size-5" />
          </button>

          <button
            onClick={handleStartStop}
            className={`flex h-16 w-16 items-center justify-center rounded-full font-bold shadow-lg transition-all duration-200 active:scale-95 ${
              isWork
                ? "bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 shadow-amber-500/30 text-black"
                : "bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-500/30 text-black"
            }`}
          >
            {isRunning ? <Pause className="size-7" /> : <Play className="size-7 ml-1" />}
          </button>

          <button
            onClick={() => {
              clearInterval(intervalRef.current);
              setIsRunning(false);
              if (isWork) {
                setIsWork(false);
                setSecondsLeft(BREAK_MINS * 60);
              } else {
                setIsWork(true);
                setSecondsLeft(WORK_MINS * 60);
              }
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            title={isWork ? "Skip to break" : "Skip to work"}
          >
            {isWork ? <Coffee className="size-5" /> : <Zap className="size-5" />}
          </button>
        </div>

        {/* Session dots */}
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all ${
                i < sessionsCompleted % 4 ? "bg-amber-400 scale-110" : "bg-white/10"
              }`}
            />
          ))}
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
          <Volume2 className="size-3" />
          Start and completion sounds are enabled.
        </p>
      </div>
    </div>
  );
}

// Active timer bar
function ActiveTimerBar({
  activeTopic,
  timerSeconds,
  isTimerRunning,
  onPause,
  onResume,
  onStop,
}: {
  activeTopic: { title: string; subjectName: string } | null;
  timerSeconds: number;
  isTimerRunning: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  if (!activeTopic) return null;

  const hrs = Math.floor(timerSeconds / 3600);
  const mins = Math.floor((timerSeconds % 3600) / 60);
  const secs = timerSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="fixed left-0 right-0 top-14 z-[90] border-b border-amber-500/20 bg-slate-950/95 px-4 py-3 shadow-[0_4px_30px_rgba(245,158,11,0.16)] backdrop-blur-md md:left-64 md:top-0">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Live indicator + topic */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold tracking-widest text-amber-400 leading-none">
              Live Study Session
            </p>
            <p className="text-sm font-semibold text-white truncate leading-tight mt-0.5">
              {activeTopic.title}
              <span className="text-slate-400 font-normal ml-1">({activeTopic.subjectName})</span>
            </p>
          </div>
        </div>

        {/* Clock */}
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          <div className="font-mono font-extrabold tracking-wider text-white flex items-baseline gap-0.5 text-2xl sm:text-3xl">
            <span>{pad(hrs)}</span>
            <span className="text-slate-500 mx-0.5">:</span>
            <span>{pad(mins)}</span>
            <span className="text-slate-500 mx-0.5">:</span>
            <span
              className="font-black text-3xl sm:text-4xl"
              style={{
                background: "linear-gradient(90deg, #fbbf24, #f97316, #ef4444)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: isTimerRunning ? "pulse 1s ease-in-out infinite" : "none",
              }}
            >
              {pad(secs)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isTimerRunning ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-slate-700 bg-slate-800 text-white hover:bg-slate-700 text-xs"
                onClick={onPause}
              >
                <Pause className="size-3.5 mr-1" /> Pause
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs"
                onClick={onResume}
              >
                <Play className="size-3.5 mr-1" /> Resume
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs"
              onClick={onStop}
            >
              <Square className="size-3.5 mr-1 fill-white" /> Stop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main planner
function Planner() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  useEffect(() => {
    setupTables().catch(console.error);
  }, []);

  // Settings state
  const [setupDate, setSetupDate] = useState("");
  const [, setSetupHours] = useState(DAILY_STUDY_HOURS);
  const [setupLevel, setSetupLevel] = useState("Foundation");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Timer state
  const [activeTopic, setActiveTopic] = useState<{
    id: string;
    title: string;
    subjectId: string;
    subjectName: string;
  } | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerCompleteModalOpen, setIsTimerCompleteModalOpen] = useState(false);

  // Pomodoro state
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [pomodoroTopicTitle, setPomodoroTopicTitle] = useState("");

  // Timer tick
  useEffect(() => {
    if (!isTimerRunning || !activeTopic) return;
    const interval = setInterval(() => setTimerSeconds((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, activeTopic]);

  // Queries
  const { data: studyPlanData, isLoading: planLoading } = useQuery({
    queryKey: ["studyPlan", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("study_plans" as any)
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!userId,
  });
  const studyPlan = studyPlanData as any;

  const { data: topicsData } = useQuery({
    queryKey: ["topics_progress", userId],
    queryFn: async () => {
      const [{ data: topics }, { data: progress }] = await Promise.all([
        supabase
          .from("topics" as any)
          .select("id, title, estimated_hours, subject_id, subjects(id, name, level)") as any,
        supabase
          .from("user_progress" as any)
          .select("topic_id, status")
          .eq("user_id", userId!) as any,
      ]);
      return { topics: (topics || []) as any[], progress: (progress || []) as any[] };
    },
    enabled: !!userId,
  });

  const { data: studySessions } = useQuery({
    queryKey: ["studySessions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("study_sessions" as any)
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!userId,
  });

  // Mutations
  const upsertPlanMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: userId!,
        exam_date: setupDate,
        daily_hours: DAILY_STUDY_HOURS,
        level: setupLevel,
        updated_at: new Date().toISOString(),
      };
      if (studyPlan) {
        const { error } = await supabase
          .from("study_plans" as any)
          .update(payload)
          .eq("id", studyPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("study_plans" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studyPlan", userId] });
      toast.success("Study plan updated!");
      setIsSettingsOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveSessionMutation = useMutation({
    mutationFn: async ({ markCompleted }: { markCompleted: boolean }) => {
      if (!activeTopic || !userId) return;

      const { error: sessionError } = await supabase.from("study_sessions" as any).insert({
        user_id: userId,
        topic_id: activeTopic.id,
        subject_id: activeTopic.subjectId,
        duration_seconds: timerSeconds,
      });
      if (sessionError) throw sessionError;

      const minutes = Math.max(1, Math.round(timerSeconds / 60));
      const TODAY = new Date().toISOString().slice(0, 10);

      const { data: existingStreakData } = await supabase
        .from("study_streaks" as any)
        .select("id, minutes")
        .eq("user_id", userId)
        .eq("date", TODAY)
        .maybeSingle();
      const existingStreak = existingStreakData as any;

      if (existingStreak) {
        await supabase
          .from("study_streaks" as any)
          .update({ minutes: (existingStreak.minutes || 0) + minutes })
          .eq("id", existingStreak.id);
      } else {
        await supabase
          .from("study_streaks" as any)
          .insert({ user_id: userId, date: TODAY, minutes });
      }

      const status = markCompleted ? "completed" : "in_progress";
      await supabase.from("user_progress" as any).upsert(
        {
          user_id: userId,
          topic_id: activeTopic.id,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_id" },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studySessions", userId] });
      queryClient.invalidateQueries({ queryKey: ["topics_progress", userId] });
      queryClient.invalidateQueries({ queryKey: ["streaks", userId] });
      toast.success("Study session saved!");
      setActiveTopic(null);
      setTimerSeconds(0);
      setIsTimerRunning(false);
      setIsTimerCompleteModalOpen(false);
    },
    onError: (e: any) => {
      const message = String(e?.message || "");
      if (message.includes("study_sessions") && message.includes("schema cache")) {
        toast.error("Database migration pending: study_sessions table is missing.");
        return;
      }
      toast.error("Failed to save: " + message);
    },
  });

  // Helper: start a study session
  const startStudy = (t: any) => {
    if (activeTopic) {
      toast.warning("Stop your current session first before starting a new one.");
      return;
    }
    setActiveTopic({
      id: t.id,
      title: t.title,
      subjectId: t.subject_id,
      subjectName: t.subjects?.name || "Subject",
    });
    setTimerSeconds(0);
    setIsTimerRunning(true);
    playStartSound();
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    toast.success(`Started study timer: ${t.title}`);
  };

  const openPomodoro = (t: any) => {
    setPomodoroTopicTitle(t.title || "Focus Session");
    setIsPomodoroOpen(true);
  };

  const openQuickFocus = () => {
    setPomodoroTopicTitle(activeTopic?.title || "Quick Focus Session");
    setIsPomodoroOpen(true);
  };

  // Loading / no plan
  if (planLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your plan...</p>
        </div>
      </div>
    );
  }

  if (!studyPlan) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
        <h1 className="font-display text-4xl mb-2">Smart Study Planner</h1>
        <Card className="max-w-md mx-auto mt-10 border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="size-5 text-amber-500" /> Set Up Your Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">CA Level</label>
              <select
                value={setupLevel}
                onChange={(e) => setSetupLevel(e.target.value)}
                className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="Foundation">Foundation</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Date</label>
              <Input type="date" value={setupDate} onChange={(e) => setSetupDate(e.target.value)} />
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-sm font-semibold text-amber-500">Daily Target: 14 Hours</p>
              <p className="text-xs text-muted-foreground mt-1">
                Time will be equally divided across all subjects for your level.
              </p>
            </div>
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold mt-2"
              onClick={() => {
                setSetupHours(DAILY_STUDY_HOURS);
                upsertPlanMutation.mutate();
              }}
              disabled={!setupDate || upsertPlanMutation.isPending}
            >
              {upsertPlanMutation.isPending ? "Creating..." : "Create My Plan"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Computed values
  const today = new Date();
  const examDate = new Date(studyPlan.exam_date);
  const daysLeft = Math.max(0, differenceInDays(examDate, today));

  const topics = (topicsData?.topics || []) as any[];
  const progressMap = new Map((topicsData?.progress || []).map((p: any) => [p.topic_id, p.status]));

  const levelTopics = topics.filter((t: any) => t.subjects?.level === studyPlan.level);
  const completedTopics = levelTopics.filter((t) => progressMap.get(t.id) === "completed");
  const pendingTopics = levelTopics.filter((t) => progressMap.get(t.id) !== "completed");

  const totalPendingHours = pendingTopics.reduce((s, t) => s + (t.estimated_hours || 2), 0);
  const requiredHoursPerDayRaw = daysLeft > 0 ? totalPendingHours / daysLeft : 0;
  const completionPercent =
    levelTopics.length > 0 ? Math.round((completedTopics.length / levelTopics.length) * 100) : 0;
  const isImpossible = requiredHoursPerDayRaw > 16;

  // Subjects map
  const subjectsMap = new Map<string, any>();
  levelTopics.forEach((t: any) => {
    const sub = t.subjects;
    if (!sub) return;
    if (!subjectsMap.has(sub.id || sub.name)) {
      subjectsMap.set(sub.id || sub.name, {
        id: sub.id || sub.name,
        name: sub.name,
        totalTopics: 0,
        completedTopics: 0,
      });
    }
    const s = subjectsMap.get(sub.id || sub.name)!;
    s.totalTopics++;
    if (progressMap.get(t.id) === "completed") s.completedTopics++;
  });
  const levelSubjects = Array.from(subjectsMap.values());
  const dailyHours = DAILY_STUDY_HOURS;
  const targetHoursPerSubject = levelSubjects.length > 0 ? dailyHours / levelSubjects.length : 0;

  const fmtDuration = (hours: number) => {
    const m = Math.round(hours * 60);
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (h > 0 && rem > 0) return `${h}h ${rem}m`;
    if (h > 0) return `${h}h`;
    if (rem > 0) return `${rem}m`;
    return "0m";
  };

  const getSubjectStudied = (subjectId: string) => {
    const secs = (studySessions || [])
      .filter((s: any) => s.subject_id === subjectId)
      .reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);
    return fmtDuration(secs / 3600);
  };

  const dailyTarget = fmtDuration(targetHoursPerSubject);
  const requiredPace = fmtDuration(requiredHoursPerDayRaw);

  // 7-day schedule: cover every subject each day and use the full daily hour budget.
  const pendingBySubject = new Map<string, any[]>();
  pendingTopics.forEach((topic: any) => {
    const subjectKey = topic.subjects?.id || topic.subject_id || topic.subjects?.name || "Subject";
    if (!pendingBySubject.has(subjectKey)) pendingBySubject.set(subjectKey, []);
    pendingBySubject.get(subjectKey)!.push(topic);
  });

  const subjectState = new Map<string, { topicIndex: number; remainingHours: number }>();
  levelSubjects.forEach((subject: any) => {
    const subjectTopics = pendingBySubject.get(subject.id) || [];
    subjectState.set(subject.id, {
      topicIndex: 0,
      remainingHours: subjectTopics[0]?.estimated_hours || 0,
    });
  });

  const schedule: { date: Date; blocks: any[]; totalHours: number }[] = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const blocks: any[] = [];

    levelSubjects.forEach((subject: any) => {
      const subjectTopics = pendingBySubject.get(subject.id) || [];
      const state = subjectState.get(subject.id);
      if (!state || subjectTopics.length === 0) return;

      let subjectBudget = targetHoursPerSubject;
      let blockIndex = 0;

      while (subjectBudget > 0.01 && state.topicIndex < subjectTopics.length) {
        const topic = subjectTopics[state.topicIndex];
        const topicHours = topic.estimated_hours || 2;
        const remainingHours = state.remainingHours || topicHours;
        const plannedHours = Math.min(subjectBudget, remainingHours);
        const completedBefore = Math.max(0, topicHours - remainingHours);

        blocks.push({
          key: `${dayIndex}-${subject.id}-${topic.id}-${blockIndex}`,
          topic,
          subject,
          plannedHours,
          completedBefore,
          topicHours,
        });

        subjectBudget -= plannedHours;
        state.remainingHours = remainingHours - plannedHours;

        if (state.remainingHours <= 0.01) {
          state.topicIndex += 1;
          state.remainingHours = subjectTopics[state.topicIndex]?.estimated_hours || 0;
        }

        blockIndex += 1;
      }
    });

    schedule.push({
      date: addDays(today, dayIndex),
      blocks,
      totalHours: blocks.reduce((sum, block) => sum + block.plannedHours, 0),
    });
  }

  const todayPlannedHours = schedule[0]?.totalHours || 0;

  return (
    <>
      {/* Fixed timer bar */}
      <ActiveTimerBar
        activeTopic={activeTopic}
        timerSeconds={timerSeconds}
        isTimerRunning={isTimerRunning}
        onPause={() => setIsTimerRunning(false)}
        onResume={() => setIsTimerRunning(true)}
        onStop={() => {
          setIsTimerRunning(false);
          setIsTimerCompleteModalOpen(true);
        }}
      />

      {/* Pomodoro Modal */}
      <PomodoroModal
        isOpen={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
        topicTitle={pomodoroTopicTitle}
      />

      {/* Save session dialog */}
      <Dialog open={isTimerCompleteModalOpen} onOpenChange={setIsTimerCompleteModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-500" /> Log Study Session
            </DialogTitle>
            <DialogDescription>
              You studied <strong>{activeTopic?.title}</strong> for{" "}
              <strong>{fmtDuration(timerSeconds / 3600)}</strong>. Did you finish this topic?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
              onClick={() => saveSessionMutation.mutate({ markCompleted: true })}
              disabled={saveSessionMutation.isPending}
            >
              Yes, Mark as Completed & Save
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => saveSessionMutation.mutate({ markCompleted: false })}
              disabled={saveSessionMutation.isPending}
            >
              No, Keep In Progress & Save Time
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Study Plan</DialogTitle>
            <DialogDescription>
              Update your CA level and exam date. This will recalculate your daily schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">CA Level</label>
              <select
                value={setupLevel}
                onChange={(e) => setSetupLevel(e.target.value)}
                className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="Foundation">Foundation</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Date</label>
              <Input type="date" value={setupDate} onChange={(e) => setSetupDate(e.target.value)} />
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-sm font-semibold text-amber-500">
                Daily Target: {dailyHours} Hours (fixed)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Equally distributed across all subjects for your chosen level.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => upsertPlanMutation.mutate()}
              disabled={!setupDate || upsertPlanMutation.isPending}
            >
              {upsertPlanMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <div
        className={`mx-auto max-w-5xl space-y-8 p-6 md:p-10 ${activeTopic ? "pt-36 md:pt-28" : ""}`}
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-4xl text-[var(--gold)]">Smart Study Planner</h1>
            <p className="text-muted-foreground mt-1">
              Level: <strong>{studyPlan.level}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 dark:text-amber-300"
              onClick={openQuickFocus}
            >
              <Timer className="size-4" /> Focus
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setSetupDate(studyPlan.exam_date);
                setSetupHours(DAILY_STUDY_HOURS);
                setSetupLevel(studyPlan.level);
                setIsSettingsOpen(true);
              }}
            >
              <Settings className="size-4" /> Settings
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarDays className="size-4 text-emerald-500" /> Days Left
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display">{daysLeft}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Exam: {format(examDate, "MMM d, yyyy")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="size-4 text-blue-500" /> Syllabus Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display mb-2">{completionPercent}%</div>
              <Progress value={completionPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {completedTopics.length} / {levelTopics.length} topics
              </p>
            </CardContent>
          </Card>

          <Card className={isImpossible ? "border-red-500/40 bg-red-500/5" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className={isImpossible ? "size-4 text-red-500" : "size-4 text-amber-500"} />
                Daily Study Load
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-display">
                {fmtDuration(todayPlannedHours || dailyHours)}
                <span className="text-lg text-muted-foreground font-sans">/day</span>
              </div>
              <div
                className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  todayPlannedHours >= dailyHours - 0.1
                    ? "bg-emerald-500/10 text-emerald-500"
                    : isImpossible
                      ? "bg-red-500/20 text-red-500"
                      : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {todayPlannedHours >= dailyHours - 0.1
                  ? "All subjects covered"
                  : isImpossible
                    ? `Need ${requiredPace}/day to finish`
                    : "Fill remaining time with revision"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subject Allocation */}
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl flex items-center gap-3">
              <Activity className="size-6 text-amber-500" /> Daily Subject Allocation
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {dailyHours} hours divided equally: <strong>{dailyTarget}</strong> per subject
            </p>
          </div>

          {levelSubjects.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-2xl">
              No subjects found for {studyPlan.level} level.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {levelSubjects.map((subject: any) => {
                const pct =
                  subject.totalTopics > 0
                    ? Math.round((subject.completedTopics / subject.totalTopics) * 100)
                    : 0;
                return (
                  <Card
                    key={subject.id}
                    className="hover:border-amber-500/40 transition-all duration-200"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold truncate">{subject.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Daily Target</span>
                        <span className="font-bold text-amber-500">{dailyTarget}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Studied So Far</span>
                        <span className="font-bold text-emerald-500">
                          {getSubjectStudied(subject.id)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Completion</span>
                          <span>
                            {pct}% ({subject.completedTopics}/{subject.totalTopics})
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* 7-day Action Plan */}
        <div>
          <h2 className="font-display text-2xl mb-6 flex items-center gap-3">
            <Rocket className="size-6 text-[var(--gold)]" /> Your 7-Day Action Plan
          </h2>

          <div className="relative pl-8 space-y-8 before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-gradient-to-b before:from-[var(--gold)] before:via-border before:to-transparent">
            {schedule.map((day, i) => {
              const isToday = i === 0;
              return (
                <div key={i} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-5 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background ${
                      isToday
                        ? "border-[var(--gold)] shadow-[0_0_8px_var(--gold)]"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isToday && (
                      <div className="h-2 w-2 rounded-full bg-[var(--gold)] animate-pulse" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-3 pl-2">
                    <h3 className={`font-display text-xl ${isToday ? "text-[var(--gold)]" : ""}`}>
                      {isToday ? "Today" : i === 1 ? "Tomorrow" : format(day.date, "EEEE, MMM d")}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {fmtDuration(day.totalHours)} planned
                    </span>
                  </div>

                  <div className="pl-2">
                    {day.blocks.length === 0 ? (
                      <div className="p-5 rounded-xl border border-dashed text-sm text-muted-foreground text-center">
                        No topics for today. Rest or revise.
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {day.blocks.map((block: any) => {
                          const t = block.topic;
                          const isStudying = activeTopic?.id === t.id;
                          const blockEnd = Math.min(
                            block.topicHours,
                            block.completedBefore + block.plannedHours,
                          );
                          const showSplit =
                            block.completedBefore > 0 || block.plannedHours < block.topicHours;
                          return (
                            <div
                              key={block.key}
                              className={`group relative overflow-hidden rounded-xl border bg-card p-4 transition-all shadow-sm hover:shadow-md ${
                                isStudying
                                  ? "border-amber-500/60 bg-amber-500/5"
                                  : "hover:border-[var(--gold)]/40"
                              }`}
                            >
                              {/* Left accent bar */}
                              <div
                                className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[var(--gold)] to-transparent transition-opacity ${
                                  isStudying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                }`}
                              />

                              <div className="flex flex-col gap-3">
                                {/* Title + hours */}
                                <div className="flex items-start justify-between gap-3">
                                  <h4 className="font-semibold text-sm leading-tight">{t.title}</h4>
                                  <span className="shrink-0 text-xs font-bold bg-[var(--gold)]/10 text-[var(--gold)] px-2 py-0.5 rounded border border-[var(--gold)]/20">
                                    {fmtDuration(block.plannedHours)}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                    {t.subjects?.name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {showSplit
                                      ? `${fmtDuration(block.completedBefore)}-${fmtDuration(blockEnd)} of ${fmtDuration(block.topicHours)}`
                                      : `Complete topic slot: ${fmtDuration(block.topicHours)}`}
                                  </p>
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                                  {isStudying ? (
                                    <>
                                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                                        </span>
                                        Studying now
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => {
                                          setIsTimerRunning(false);
                                          setIsTimerCompleteModalOpen(true);
                                        }}
                                      >
                                        <Square className="size-3" /> Stop
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => startStudy(t)}
                                        className="h-8 bg-amber-500 px-3 text-xs font-bold text-black hover:bg-amber-400"
                                      >
                                        <Play className="size-3 fill-black" /> Study
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openPomodoro(t)}
                                        className="h-8 border-emerald-500/30 px-3 text-xs text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-300"
                                        title="Start Pomodoro timer"
                                      >
                                        <Timer className="size-3" /> Focus
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
