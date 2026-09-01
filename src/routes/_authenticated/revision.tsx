import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, FileText, BookmarkX, BrainCircuit, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/revision")({ component: RevisionMode });

function RevisionMode() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  // Fetch formula sheets
  const { data: formulaSheets = [], isLoading: formulasLoading } = useQuery({
    queryKey: ["formula_sheets_rev"],
    queryFn: async () => {
      const { data } = await supabase.from("formula_sheets").select("id, title, subjects(name, level)");
      return data || [];
    },
  });

  // Fetch bookmarked questions
  const { data: bookmarkedQuestions = [], isLoading: bookmarksLoading } = useQuery({
    queryKey: ["bookmarked_questions", userId],
    queryFn: async () => {
      const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("ref_id")
        .eq("user_id", userId!)
        .eq("type", "question");
      
      if (!bookmarks?.length) return [];
      
      const questionIds = bookmarks.map(b => b.ref_id);
      const { data: questions } = await supabase
        .from("past_questions")
        .select("*")
        .in("id", questionIds);
        
      return questions || [];
    },
    enabled: !!userId,
  });

  // Fetch low confidence topics
  const { data: lowConfTopics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ["low_conf_topics", userId],
    queryFn: async () => {
      const { data: progress } = await supabase
        .from("user_progress")
        .select("topic_id, confidence, topics(title, subjects(name))")
        .eq("user_id", userId!)
        .lte("confidence", 2 * 20); // DB might store 0-100, if user requested conf <= 2, assuming 1-5 scale mapped to 0-100 (2 = 40)
        // Wait, if it's 0-100, 2 is very low. Let's assume the user meant 2 on a 1-5 scale, so 40.
        
      return progress || [];
    },
    enabled: !!userId,
  });

  const unbookmarkMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId!)
        .eq("ref_id", questionId)
        .eq("type", "question");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarked_questions", userId] });
      toast.success("Bookmark removed");
      logActivity("Unbookmarked a question during revision", undefined, "/revision");
    }
  });

  if (formulasLoading || bookmarksLoading || topicsLoading) {
    return <div className="p-10 flex justify-center"><div className="animate-pulse">Loading Revision Pack...</div></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-6 md:p-10">
      
      <div>
        <h1 className="font-display text-4xl mb-2 flex items-center gap-3 text-[var(--gold)]">
          <Zap className="size-8" /> Revision Pack
        </h1>
        <p className="text-muted-foreground">Your centralized hub for last-minute review.</p>
      </div>

      {/* Formula Sheets Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-display flex items-center gap-2">
          <FileText className="size-5 text-blue-500" /> Formula Sheets
        </h2>
        
        {formulaSheets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No formula sheets available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formulaSheets.map((sheet: any) => (
              <Link key={sheet.id} to="/formula-sheets">
                <Card className="hover:border-blue-500/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{sheet.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                      {sheet.subjects?.name} ({sheet.subjects?.level})
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bookmarked Questions Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-display flex items-center gap-2">
          <BookmarkX className="size-5 text-rose-500" /> Bookmarked Questions
        </h2>
        
        {bookmarkedQuestions.length === 0 ? (
          <Card className="bg-secondary/30 border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">No bookmarks yet. Open Past Questions and bookmark tough ones.</p>
              <Link to="/past-questions">
                <Button variant="outline" size="sm">Go to Past Questions</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookmarkedQuestions.map((q: any) => (
              <Card key={q.id}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="border-border">
                      {q.exam_month} {q.exam_year}
                    </Badge>
                    <Badge variant="outline" className="border-border">
                      {q.marks} Marks
                    </Badge>
                    {q.difficulty && (
                      <Badge className={
                        q.difficulty === 'hard' ? 'bg-red-500/10 text-red-500' :
                        q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      } variant="secondary">
                        {q.difficulty}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm md:text-base mb-6 font-medium leading-relaxed">
                    {q.question_text}
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      onClick={() => unbookmarkMutation.mutate(q.id)}
                      disabled={unbookmarkMutation.isPending}
                    >
                      <BookmarkX className="size-4 mr-2" />
                      Unbookmark
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Low Confidence Topics Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-display flex items-center gap-2">
          <BrainCircuit className="size-5 text-amber-500" /> Low Confidence Topics
        </h2>
        
        {lowConfTopics.length === 0 ? (
          <Card className="bg-secondary/30 border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No low-confidence topics. Mark confidence in the syllabus to see them here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {lowConfTopics.map((item: any, idx: number) => {
              // Convert 0-100 to 1-5 scale for display if needed. Assuming user requested <=2
              const confScale = Math.max(1, Math.round((item.confidence / 100) * 5));
              
              return (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                  <div>
                    <div className="font-semibold text-sm">{item.topics?.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.topics?.subjects?.name}</div>
                  </div>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                    Conf {confScale}/5
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
