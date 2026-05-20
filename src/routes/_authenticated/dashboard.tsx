import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, BookOpen, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user } = useAuth();
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
  const pct = stats ? Math.round((stats.completed / Math.max(stats.topics, 1)) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <header>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="font-display text-4xl">Let's get a topic done today.</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <BookOpen className="size-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Syllabus progress</p>
          <p className="text-3xl font-display">{pct}%</p>
          <Progress className="mt-3" value={pct} />
          <p className="mt-2 text-xs text-muted-foreground">{stats?.completed ?? 0} of {stats?.topics ?? 0} topics</p>
        </Card>
        <Card className="p-6">
          <MessageSquare className="size-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Doubts asked</p>
          <p className="text-3xl font-display">{stats?.doubts ?? 0}</p>
          <Link to="/doubts" className="mt-3 inline-block text-sm text-primary underline">Ask a new doubt →</Link>
        </Card>
        <Card className="p-6">
          <Sparkles className="size-5 text-[var(--gold)]" />
          <p className="mt-3 text-sm text-muted-foreground">AI teacher</p>
          <p className="text-base">Cite-grounded answers on Companies Act, GST, Ind AS, SA standards.</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-display text-2xl">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/doubts" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Ask AI Teacher</Link>
          <Link to="/syllabus" className="rounded-lg border border-border px-4 py-2 text-sm">Open Syllabus</Link>
        </div>
      </Card>
    </div>
  );
}
