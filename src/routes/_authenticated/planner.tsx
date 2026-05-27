import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CalendarDays, Clock, Target, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { differenceInDays, format, addDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/planner")({ component: Planner });

function Planner() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const [setupDate, setSetupDate] = useState("");
  const [setupHours, setSetupHours] = useState(4);
  const [setupLevel, setSetupLevel] = useState("Foundation");

  // Fetch Study Plan
  const { data: studyPlan, isLoading: planLoading } = useQuery({
    queryKey: ["studyPlan", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("study_plans")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error && error.code !== "PGRST116") throw error; // ignore no rows
      return data;
    },
    enabled: !!userId,
  });

  // Fetch Topics and Progress
  const { data: topicsData } = useQuery({
    queryKey: ["topics_progress", userId],
    queryFn: async () => {
      const [{ data: topics }, { data: progress }] = await Promise.all([
        supabase.from("topics").select("id, title, estimated_hours, subject_id, subjects(name, level)"),
        supabase.from("user_progress").select("topic_id, status").eq("user_id", userId!),
      ]);
      return { topics: topics || [], progress: progress || [] };
    },
    enabled: !!userId,
  });

  const upsertPlanMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: userId!,
        exam_date: setupDate,
        daily_hours: setupHours,
        level: setupLevel,
        updated_at: new Date().toISOString(),
      };
      
      if (studyPlan) {
        const { error } = await supabase.from("study_plans").update(payload).eq("id", studyPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("study_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studyPlan", userId] });
      toast.success("Study plan updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (planLoading) return <div className="p-10 flex justify-center"><div className="animate-pulse">Loading...</div></div>;

  if (!studyPlan) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
        <h1 className="font-display text-4xl mb-2">Smart Study Planner</h1>
        <Card className="max-w-md mx-auto mt-10">
          <CardHeader>
            <CardTitle>Set Up Your Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">CA Level</label>
              <select 
                value={setupLevel} 
                onChange={e => setSetupLevel(e.target.value)}
                className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="Foundation">Foundation</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Date</label>
              <Input type="date" value={setupDate} onChange={e => setSetupDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Daily Study Hours (1-16)</label>
              <Input type="number" min="1" max="16" value={setupHours} onChange={e => setSetupHours(Number(e.target.value))} />
            </div>
            <Button className="w-full mt-4" onClick={() => upsertPlanMutation.mutate()} disabled={!setupDate || upsertPlanMutation.isPending}>
              Create Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate Metrics
  const today = new Date();
  const examDate = new Date(studyPlan.exam_date);
  const daysLeft = Math.max(0, differenceInDays(examDate, today));
  
  const topics = topicsData?.topics || [];
  const progressMap = new Map((topicsData?.progress || []).map(p => [p.topic_id, p.status]));
  
  const levelTopics = topics.filter(t => (t.subjects as any)?.level === studyPlan.level);
  const completedTopics = levelTopics.filter(t => progressMap.get(t.id) === "completed");
  const pendingTopics = levelTopics.filter(t => progressMap.get(t.id) !== "completed");
  
  const totalPendingHours = pendingTopics.reduce((sum, t) => sum + (t.estimated_hours || 2), 0);
  const requiredHoursPerDayRaw = daysLeft > 0 ? (totalPendingHours / daysLeft) : 0;
  const requiredHoursPerDay = requiredHoursPerDayRaw.toFixed(1);
  
  const completionPercent = levelTopics.length > 0 ? Math.round((completedTopics.length / levelTopics.length) * 100) : 0;
  
  const isOnTrack = requiredHoursPerDayRaw <= studyPlan.daily_hours;
  const isImpossible = requiredHoursPerDayRaw > 16;

  // Build 7-day schedule
  // Divide pending topics evenly (very simple scheduling)
  const schedule: { date: Date; topics: typeof pendingTopics }[] = [];
  const topicsPerDay = daysLeft > 0 ? Math.ceil(pendingTopics.length / daysLeft) : 0;
  
  let currentTopicIndex = 0;
  for (let i = 0; i < 7; i++) {
    const dayTopics = [];
    // Cap topics per day to a realistic number (e.g. max 5 topics per day) if impossible
    const actualTopicsPerDay = isImpossible ? Math.min(5, topicsPerDay) : topicsPerDay;
    
    for (let j = 0; j < actualTopicsPerDay; j++) {
      if (currentTopicIndex < pendingTopics.length) {
        dayTopics.push(pendingTopics[currentTopicIndex]);
        currentTopicIndex++;
      }
    }
    // Only add days that actually exist before the exam, or just show 7 days rolling.
    // If exam is in 2 days, we still show 7 days but maybe mark them post-exam? Let's just show standard 7 days.
    schedule.push({
      date: addDays(today, i),
      topics: dayTopics
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-2 text-[var(--gold)]">Smart Study Planner</h1>
          <p className="text-muted-foreground">Level: {studyPlan.level}</p>
        </div>
        <Button variant="outline" onClick={() => {
          setSetupDate(studyPlan.exam_date);
          setSetupHours(studyPlan.daily_hours);
          setSetupLevel(studyPlan.level);
        }}>Settings</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="size-4 text-emerald-500" />
              Days Left
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display">{daysLeft}</div>
            <p className="text-xs text-muted-foreground mt-1">Exam: {format(examDate, "MMM d, yyyy")}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="size-4 text-blue-500" />
              Syllabus Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display mb-2">{completionPercent}%</div>
            <Progress value={completionPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{completedTopics.length} / {levelTopics.length} topics</p>
          </CardContent>
        </Card>

        <Card className={isImpossible ? "border-red-500/50 bg-red-500/5" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className={isImpossible ? "size-4 text-red-500" : "size-4 text-amber-500"} />
              Required Pace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display text-foreground">
              {isImpossible ? ">16" : requiredHoursPerDay}h<span className="text-xl text-muted-foreground font-sans">/day</span>
            </div>
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              isOnTrack ? 'bg-emerald-500/10 text-emerald-500' : 
              isImpossible ? 'bg-red-500/20 text-red-600' : 'bg-amber-500/10 text-amber-500'
            }`}>
              {isOnTrack ? "On Track!" : 
               isImpossible ? "⚠ Unrealistic. Focus on revision!" : 
               `Increase to ${requiredHoursPerDay}h/day`}
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="font-display text-2xl mt-12 mb-6 text-foreground flex items-center gap-3">
        <Rocket className="size-6 text-[var(--gold)]" /> Your Personalized Action Plan
      </h2>
      <div className="relative pl-6 md:pl-8 space-y-8 before:absolute before:inset-0 before:ml-8 md:before:ml-10 before:w-0.5 before:-translate-x-px md:before:translate-x-0 before:bg-gradient-to-b before:from-[var(--gold)] before:via-border before:to-transparent">
        {schedule.map((day, i) => {
          const isToday = i === 0;
          return (
            <div key={i} className="relative">
              <div className="sticky top-20 z-10 flex items-center mb-4">
                <div className={`absolute -left-9 md:-left-11 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background ring-4 ring-background ${isToday ? 'border-[var(--gold)] shadow-[0_0_10px_var(--gold)]' : 'border-muted-foreground/30'}`}>
                  {isToday && <div className="h-2 w-2 rounded-full bg-[var(--gold)] animate-pulse" />}
                </div>
                <div className="flex items-center gap-3 ml-2">
                  <h3 className={`font-display text-xl ${isToday ? 'text-[var(--gold)]' : 'text-foreground'}`}>
                    {isToday ? "Today" : i === 1 ? "Tomorrow" : format(day.date, "EEEE, MMM d")}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                    {day.topics.length} topics
                  </span>
                </div>
              </div>
              
              <div className="pl-2">
                {day.topics.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-border bg-secondary/10 text-sm text-muted-foreground text-center">
                    No topics scheduled for this day. Take a rest or revise!
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {day.topics.map(t => (
                      <div key={t.id} className="group relative overflow-hidden rounded-xl border bg-card p-4 hover:border-[var(--gold)]/50 transition-all shadow-sm hover:shadow-md">
                        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[var(--gold)] to-[var(--gold)]/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex flex-col h-full justify-between gap-4">
                          <div>
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <h4 className="font-semibold text-sm leading-tight text-foreground/90 group-hover:text-foreground transition-colors">
                                {t.title}
                              </h4>
                              <div className="text-xs font-bold bg-[var(--gold)]/10 text-[var(--gold)] px-2 py-1 rounded-md shrink-0 border border-[var(--gold)]/20">
                                ~{t.estimated_hours}h
                              </div>
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">
                              {(t.subjects as any)?.name}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                              <Target className="size-3" /> Focus Required
                            </span>
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 hover:bg-[var(--gold)]/10 hover:text-[var(--gold)]">
                              Start Study
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
