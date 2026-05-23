import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { askDoubt } from "@/lib/rag.functions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Plus, Send, Sparkles, MessageSquare, BookOpen, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/doubts")({ component: Doubts });

function Doubts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const ask = useServerFn(askDoubt);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: threads } = useQuery({
    queryKey: ["doubts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("doubts").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["doubt_messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase.from("doubt_messages").select("*").eq("doubt_id", activeId!).order("created_at");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (threads && threads.length && !activeId) setActiveId(threads[0].id);
  }, [threads, activeId]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      setTimeout(() => { el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, 100);
    }
  }, [messages, sending]);

  async function newThread() {
    if (!user) return;
    const { data, error } = await supabase.from("doubts").insert({ user_id: user.id, title: "New Doubt" }).select().single();
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["doubts"] });
    setActiveId(data.id);
  }

  async function send() {
    if (!input.trim() || !activeId) return;
    const q = input.trim();
    setInput("");
    setSending(true);
    qc.setQueryData(["doubt_messages", activeId], (old: any[] = []) => [
      ...old,
      { id: "temp", role: "user", content: q, citations: [], created_at: new Date().toISOString() },
    ]);
    try {
      await ask({ data: { doubtId: activeId, question: q } });
      const titleNeeded = threads?.find((t) => t.id === activeId)?.title === "New Doubt";
      if (titleNeeded) {
        await supabase.from("doubts").update({ title: q.slice(0, 60) }).eq("id", activeId);
      }
      qc.invalidateQueries({ queryKey: ["doubt_messages", activeId] });
      qc.invalidateQueries({ queryKey: ["doubts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to ask");
    } finally {
      setSending(false);
    }
  }

  const examplePrompts = [
    "Explain Section 73 of CGST Act with an example",
    "How is goodwill calculated under AS 14?",
    "Requirements for appointment of an auditor?",
    "Difference between Tax Avoidance and Tax Evasion",
  ];

  return (
    <div className="grid h-[calc(100vh-56px)] md:h-screen grid-cols-1 md:grid-cols-[260px_1fr] bg-background">

      {/* ── Sidebar: Thread List ── */}
      <aside className="border-r border-border/50 bg-muted/30 backdrop-blur-sm hidden md:flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border/40">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 mb-0.5">AI Teacher</p>
            <p className="font-display text-lg text-foreground leading-none">Ask Doubts</p>
          </div>
          <Button
            onClick={newThread}
            className="w-full rounded-xl h-9 text-sm font-semibold shadow-sm"
            size="default"
          >
            <Plus className="mr-2 size-3.5" />
            New Doubt
          </Button>
        </div>

        {/* Thread List */}
        <ScrollArea className="flex-1 p-2">
          <ul className="space-y-0.5">
            {(threads ?? []).map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setActiveId(t.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 flex items-center gap-2.5 ${
                    activeId === t.id
                      ? "bg-primary/10 text-primary border border-primary/15 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent"
                  }`}
                >
                  <MessageSquare className={`size-3.5 flex-shrink-0 ${activeId === t.id ? "text-primary" : "opacity-40"}`} />
                  <span className="truncate font-medium text-[13px]">{t.title}</span>
                </button>
              </li>
            ))}
            {(threads ?? []).length === 0 && (
              <p className="text-xs text-center text-muted-foreground/60 py-6">No doubts yet. Start a new one!</p>
            )}
          </ul>
        </ScrollArea>
      </aside>

      {/* ── Main Chat Area ── */}
      <section className="flex flex-col relative overflow-hidden">
        {/* Background mesh */}
        <div className="absolute inset-0 mesh-bg pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/4 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold/4 rounded-full blur-[80px] pointer-events-none" />

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
          <div className="mx-auto max-w-3xl space-y-5 pb-36">
            {!messages?.length && !sending && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center min-h-[55vh] text-center"
              >
                {/* AI Icon */}
                <div className="relative mb-7">
                  <div className="absolute inset-0 rounded-3xl bg-gold/20 blur-2xl scale-125" />
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-card to-muted border border-border/60 shadow-2xl">
                    <Bot className="size-9 text-primary" />
                    <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-400 border-2 border-background flex items-center justify-center">
                      <Sparkles className="size-2.5 text-white" />
                    </div>
                  </div>
                </div>

                <h2 className="font-display text-4xl mb-2 tracking-tight">Ask your CA doubt</h2>
                <p className="text-muted-foreground text-sm mb-10 max-w-sm leading-relaxed">
                  Trained on ICAI materials — I'll give you precise answers with section references and practical examples.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                  {examplePrompts.map((prompt, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 + 0.15 }}
                      onClick={() => setInput(prompt)}
                      className="text-left p-4 rounded-xl premium-card border border-border/40 hover:border-primary/30 hover:bg-primary/3 transition-all duration-200 group"
                    >
                      <p className="text-sm font-medium text-foreground/80 group-hover:text-primary transition-colors leading-snug">
                        {prompt}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {(messages ?? []).map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-3`}
                >
                  {/* AI Avatar */}
                  {m.role !== "user" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/15">
                        <Sparkles className="size-3.5 text-primary" />
                      </div>
                    </div>
                  )}

                  <div className={`max-w-[85%] md:max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm shadow-primary/15"
                      : "premium-card border border-border/50 rounded-tl-sm"
                  }`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1 prose-headings:font-display prose-headings:font-semibold">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    {Array.isArray((m as any).citations) && (m as any).citations.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/20 pt-3">
                        {(m as any).citations.map((c: any) => (
                          <div
                            key={c.n}
                            className="flex items-center gap-1 rounded-lg bg-muted/60 border border-border/30 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                          >
                            <BookOpen className="size-2.5" />
                            [{c.n}] {c.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {m.role === "user" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20">
                        <User className="size-3.5" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start gap-3"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/15">
                      <Sparkles className="size-3.5 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="premium-card border border-border/50 rounded-2xl rounded-tl-sm px-5 py-3.5">
                    <div className="flex gap-1.5 items-center">
                      {[0, 150, 300].map((delay) => (
                        <div
                          key={delay}
                          className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Input Area ── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-5 bg-gradient-to-t from-background via-background/98 to-transparent">
          <div className="mx-auto max-w-3xl">
            <div className="premium-card rounded-2xl border border-border/60 overflow-hidden shadow-xl">
              <div className="flex items-end gap-2 p-2 pl-4">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your CA doubt… (Shift+Enter for new line)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!sending && input.trim()) send();
                    }
                  }}
                  className="min-h-[48px] max-h-[180px] resize-none border-0 focus-visible:ring-0 bg-transparent py-2.5 px-0 text-sm shadow-none text-foreground placeholder:text-muted-foreground/60"
                />
                <Button
                  onClick={send}
                  disabled={sending || !input.trim() || !activeId}
                  className="mb-1 size-9 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 flex-shrink-0 transition-all"
                  size="icon"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
            <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
              AI teacher may make mistakes · Always verify critical facts with ICAI modules
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
