import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Target, AlertTriangle, Trophy, Brain } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({ component: Analytics });

function Analytics() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data, isLoading } = useQuery({
    queryKey: ["analytics_data", userId],
    queryFn: async () => {
      const [{ data: topics }, { data: progress }] = await Promise.all([
        supabase.from("topics").select("id, subject_id, subjects(name, level)"),
        supabase.from("user_progress").select("topic_id, status, confidence").eq("user_id", userId!),
      ]);
      return { topics: topics || [], progress: progress || [] };
    },
    enabled: !!userId,
  });

  if (isLoading) return <div className="p-10 flex justify-center"><div className="animate-pulse">Loading Analytics...</div></div>;

  const topics = data?.topics || [];
  const progress = data?.progress || [];
  
  const progressMap = new Map(progress.map(p => [p.topic_id, p]));

  // Calculate subject-wise stats
  const subjectStatsMap = new Map<string, { name: string; total: number; completed: number; confSum: number }>();

  topics.forEach(t => {
    const subjName = (t.subjects as any)?.name || "Unknown";
    if (!subjectStatsMap.has(subjName)) {
      subjectStatsMap.set(subjName, { name: subjName, total: 0, completed: 0, confSum: 0 });
    }
    const stat = subjectStatsMap.get(subjName)!;
    stat.total++;
    
    const p = progressMap.get(t.id);
    if (p) {
      if (p.status === "completed") stat.completed++;
      stat.confSum += (p.confidence || 0);
    }
  });

  const chartData = Array.from(subjectStatsMap.values()).map(s => {
    const percent = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
    return {
      name: s.name,
      percent,
      color: percent >= 70 ? "#10b981" : percent >= 40 ? "#f59e0b" : "#ef4444"
    };
  });

  const weakSubjects = chartData.filter(d => d.percent < 40);
  const strongSubjects = chartData.filter(d => d.percent >= 70);

  const totalTopics = topics.length;
  const totalCompleted = Array.from(subjectStatsMap.values()).reduce((sum, s) => sum + s.completed, 0);
  const overallPercent = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;
  
  const totalProgressItems = progress.length;
  const avgConfidence = totalProgressItems > 0 ? Math.round(progress.reduce((sum, p) => sum + (p.confidence || 0), 0) / totalProgressItems) : 0;
  // Convert 0-100 confidence to 1-5 scale for display
  const confScale = Math.max(1, Math.round((avgConfidence / 100) * 5));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl mb-2 text-[var(--gold)]">Your Progress</h1>
        <p className="text-muted-foreground">Detailed analytics on your syllabus coverage and confidence.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-secondary/20">
          <CardContent className="p-6">
            <div className="text-2xl font-display mb-1">{totalTopics}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Topics</div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/20">
          <CardContent className="p-6">
            <div className="text-2xl font-display mb-1 text-emerald-500">{totalCompleted}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Completed</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="text-2xl font-display mb-1 text-primary">{overallPercent}%</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Overall Progress</div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--gold)]/5 border-[var(--gold)]/20">
          <CardContent className="p-6">
            <div className="text-2xl font-display mb-1 text-[var(--gold)]">{confScale} <span className="text-sm font-sans text-muted-foreground">/ 5</span></div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Avg. Confidence</div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="size-5 text-[var(--gold)]" />
            Subject Completion (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: "hsl(var(--secondary))" }}
                    contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(val: number) => [`${val}%`, "Completion"]}
                  />
                  <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No subject data available.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-500">
              <AlertTriangle className="size-5" />
              Weak Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weakSubjects.length > 0 ? (
              <div className="space-y-4">
                {weakSubjects.map(s => (
                  <div key={s.name} className="flex justify-between items-center bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                    <span className="font-medium text-sm">Focus on {s.name}</span>
                    <Badge variant="outline" className="text-red-500 border-red-500/30">{s.percent}% done</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No weak areas identified yet. Great job!</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-500">
              <Trophy className="size-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strongSubjects.length > 0 ? (
              <div className="space-y-4">
                {strongSubjects.map(s => (
                  <div key={s.name} className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                    <span className="font-medium text-sm">Strong in {s.name}</span>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">{s.percent}% done</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Keep studying to build your strengths.</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
