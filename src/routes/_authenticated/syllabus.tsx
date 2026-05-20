import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/syllabus")({ component: Syllabus });

function Syllabus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["syllabus", user?.id],
    queryFn: async () => {
      const { data: subjects } = await supabase.from("subjects").select("*").order("level").order("name");
      const { data: topics } = await supabase.from("topics").select("*").order("order_index");
      const { data: progress } = await supabase.from("user_progress").select("*");
      const prog = new Map((progress ?? []).map((p) => [p.topic_id, p]));
      return { subjects: subjects ?? [], topics: topics ?? [], progress: prog };
    },
  });

  async function toggle(topicId: string, done: boolean) {
    if (!user) return;
    const { error } = await supabase.from("user_progress").upsert({
      user_id: user.id, topic_id: topicId,
      status: done ? "completed" : "in_progress",
      confidence: done ? 100 : 50,
    }, { onConflict: "user_id,topic_id" });
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["syllabus"] });
  }

  if (!data) return <div className="p-10 text-muted-foreground">Loading…</div>;

  const byLevel = (lvl: string) => data.subjects.filter((s) => s.level === lvl);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 md:p-10">
      <header>
        <h1 className="font-display text-4xl">Syllabus tracker</h1>
        <p className="text-sm text-muted-foreground">Tick what you've finished. Progress flows to your dashboard.</p>
      </header>

      {(["Foundation", "Intermediate", "Final"] as const).map((lvl) => (
        <section key={lvl}>
          <h2 className="mb-3 font-display text-2xl">{lvl}</h2>
          <Accordion type="multiple" className="space-y-2">
            {byLevel(lvl).map((s) => {
              const ts = data.topics.filter((t) => t.subject_id === s.id);
              const done = ts.filter((t) => data.progress.get(t.id)?.status === "completed").length;
              return (
                <AccordionItem key={s.id} value={s.id} className="rounded-xl border border-border bg-card px-4">
                  <AccordionTrigger>
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <span>{s.name}</span>
                      <Badge variant="secondary">{done}/{ts.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {ts.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">Topics coming soon.</p>
                    ) : (
                      <ul className="space-y-2 py-2">
                        {ts.map((t) => {
                          const p = data.progress.get(t.id);
                          const completed = p?.status === "completed";
                          return (
                            <li key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                              <Checkbox checked={completed} onCheckedChange={(v) => toggle(t.id, !!v)} />
                              <span className={completed ? "text-muted-foreground line-through" : ""}>{t.title}</span>
                              <span className="ml-auto text-xs text-muted-foreground">~{t.estimated_hours}h</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>
      ))}
    </div>
  );
}
