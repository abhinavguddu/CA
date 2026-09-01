import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, BookmarkX, Search, FileQuestion, BookOpen, Calendar, Sparkles, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/bookmarks")({ component: BookmarksPage });

function BookmarksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"question" | "topic">("question");
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const { data: bookmarks, isLoading } = useQuery({
    queryKey: ["bookmarks", user?.id, tab],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("type", tab)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const refIds = (bookmarks ?? []).map((b: any) => b.ref_id);

  const { data: questions } = useQuery({
    queryKey: ["bookmarked_questions", refIds],
    enabled: tab === "question" && refIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("past_questions")
        .select("id, question_text, exam_month, exam_year, marks, level, subjects(name)")
        .in("id", refIds);
      return data ?? [];
    },
  });

  const { data: topics } = useQuery({
    queryKey: ["bookmarked_topics", refIds],
    enabled: tab === "topic" && refIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, title, subject_id, subjects(name, level)")
        .in("id", refIds);
      return data ?? [];
    },
  });

  async function removeBookmark(id: string) {
    await supabase.from("bookmarks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
    toast.success("Bookmark removed");
    logActivity("Removed a bookmark", undefined, "/bookmarks");
  }

  async function saveNote(id: string) {
    await supabase.from("bookmarks").update({ note: noteText }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
    setEditingNote(null);
    toast.success("Note saved");
    logActivity("Saved a note on bookmark", noteText.slice(0, 80), "/bookmarks");
  }

  const items = (bookmarks ?? []).map((b: any) => {
    const detail = tab === "question"
      ? (questions ?? []).find((q: any) => q.id === b.ref_id)
      : (topics ?? []).find((t: any) => t.id === b.ref_id);
    return { ...b, detail };
  }).filter((b: any) => {
    if (!search.trim()) return true;
    const text = tab === "question"
      ? b.detail?.question_text ?? ""
      : b.detail?.title ?? "";
    return text.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-full mesh-bg">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-12 space-y-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-6 bg-gradient-to-r from-primary to-gold rounded-full" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Saved</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">Bookmarks</h1>
          <p className="text-muted-foreground mt-2">Your saved questions and topics for quick revision.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="question" className="rounded-md gap-2">
                <FileQuestion className="size-3.5" /> Questions
              </TabsTrigger>
              <TabsTrigger value="topic" className="rounded-md gap-2">
                <BookOpen className="size-3.5" /> Topics
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search bookmarks…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-background/50 border-border/60 rounded-xl" />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin mr-3" />
              Loading bookmarks…
            </div>
          ) : items.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="glass-card p-16 text-center border-dashed">
                <Bookmark className="mx-auto size-12 mb-4 opacity-30" />
                <p className="text-lg font-medium text-foreground">No bookmarks yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tab === "question" ? "Bookmark questions from the Past Questions page." : "Bookmark topics from the Syllabus page."}
                </p>
                <Button asChild variant="outline" className="mt-6 rounded-xl">
                  <Link to={tab === "question" ? "/past-questions" : "/syllabus"}>
                    {tab === "question" ? "Go to Past Questions" : "Go to Syllabus"}
                  </Link>
                </Button>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {items.map((b: any, i: number) => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="glass-card p-5 group">
                    <div className="flex items-start gap-4">
                      <div className="size-9 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {tab === "question" ? <FileQuestion className="size-4 text-gold" /> : <BookOpen className="size-4 text-gold" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {tab === "question" && b.detail && (
                          <>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge variant="outline" className="text-xs bg-background/50">{b.detail.level}</Badge>
                              {b.detail.subjects?.name && <Badge variant="secondary" className="text-xs bg-primary/8 text-primary border-primary/20">{b.detail.subjects.name}</Badge>}
                              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                                <Calendar className="size-3" />{b.detail.exam_month} {b.detail.exam_year}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 line-clamp-3 leading-relaxed">{b.detail.question_text}</p>
                          </>
                        )}
                        {tab === "topic" && b.detail && (
                          <>
                            <div className="flex flex-wrap gap-2 mb-1">
                              {b.detail.subjects?.level && <Badge variant="outline" className="text-xs bg-background/50">{b.detail.subjects.level}</Badge>}
                              {b.detail.subjects?.name && <Badge variant="secondary" className="text-xs bg-primary/8 text-primary border-primary/20">{b.detail.subjects.name}</Badge>}
                            </div>
                            <p className="text-sm font-medium text-foreground">{b.detail.title}</p>
                          </>
                        )}
                        {!b.detail && <p className="text-sm text-muted-foreground italic">Item no longer available</p>}

                        {/* Note */}
                        {editingNote === b.id ? (
                          <div className="mt-3 flex gap-2">
                            <Input
                              autoFocus
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveNote(b.id); if (e.key === "Escape") setEditingNote(null); }}
                              placeholder="Add a note…"
                              className="h-8 text-xs bg-background/70 rounded-lg border-border/60"
                            />
                            <Button size="sm" onClick={() => saveNote(b.id)} className="h-8 rounded-lg text-xs px-3">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingNote(null)} className="h-8 rounded-lg text-xs px-3">Cancel</Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingNote(b.id); setNoteText(b.note ?? ""); }}
                            className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <StickyNote className="size-3" />
                            {b.note ? <span className="italic">{b.note}</span> : <span>Add note…</span>}
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => removeBookmark(b.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                      >
                        <BookmarkX className="size-4" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {items.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">{items.length} bookmark{items.length !== 1 ? "s" : ""}</p>
        )}
      </div>
    </div>
  );
}
