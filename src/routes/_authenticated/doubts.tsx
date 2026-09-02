import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { askDoubt } from "@/lib/rag.functions";
import { toast } from "sonner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { logActivity } from "@/lib/activity";
import { Plus, Send, Sparkles, MessageSquare, BookOpen, Bot, User, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/doubts")({ component: Doubts });

function Doubts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const ask = useServerFn(askDoubt);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showReferences, setShowReferences] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  }, [messages]);

  async function newThread() {
    if (!user) return;
    const { data, error } = await supabase.from("doubts").insert({ user_id: user.id, title: "New Doubt" }).select().single();
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["doubts"] });
    setActiveId(data.id);
    setShowReferences(true);
    logActivity("Started a new doubt thread", undefined, "/doubts");
  }

  async function send() {
    if (!input.trim() || !activeId) return;
    const q = input.trim();
    setInput("");
    setShowReferences(true);
    setIsThinking(true);
    qc.setQueryData(["doubt_messages", activeId], (old: any[] = []) => [
      ...old,
      { id: "temp", role: "user", content: q, citations: [], created_at: new Date().toISOString() },
    ]);
    try {
      await ask({ data: { doubtId: activeId, question: q } });
      logActivity("Asked a doubt", q.slice(0, 100), "/doubts");
      const titleNeeded = threads?.find((t) => t.id === activeId)?.title === "New Doubt";
      if (titleNeeded) {
        await supabase.from("doubts").update({ title: q.slice(0, 60) }).eq("id", activeId);
      }
      qc.invalidateQueries({ queryKey: ["doubt_messages", activeId] });
      qc.invalidateQueries({ queryKey: ["doubts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to ask");
    } finally {
      setIsThinking(false);
    }
  }

  const examplePrompts = [
    "Explain Section 73 of CGST Act with an example",
    "How is goodwill calculated under AS 14?",
    "Requirements for appointment of an auditor?",
    "Difference between Tax Avoidance and Tax Evasion",
  ];

  return (
    <div className="grid h-[calc(100vh-56px)] md:h-screen bg-background overflow-hidden" style={{ gridTemplateColumns: sidebarOpen ? "260px 1fr" : "72px 1fr" }}>

      <TooltipProvider>
      <aside className={`border-r border-emerald-200/70 bg-emerald-50/70 backdrop-blur-sm flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? "w-[260px]" : "w-[72px]"}`}>
        <div className="flex items-center justify-between p-3 border-b border-emerald-200/60 flex-shrink-0 gap-2">
          {sidebarOpen ? (
            <div className="mb-0">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700/60 mb-0.5">AI Teacher</p>
              <p className="font-display text-lg text-emerald-900 leading-none">Ask Doubts</p>
            </div>
          ) : (
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/15 mx-auto">
              <Sparkles className="size-4 text-emerald-600" />
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="group flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-100/60 p-1.5 transition-colors text-emerald-700 hover:bg-emerald-200/70 flex-shrink-0 cursor-pointer active:scale-95"
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarOpen ? (
                  <motion.span
                    key="dbts-collapse"
                    initial={{ x: 0 }}
                    animate={{ x: [0, -4, 4, -4, 4, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
                    className="flex"
                  >
                    <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="dbts-expand"
                    initial={{ x: 0 }}
                    animate={{ x: [0, -4, 4, -4, 4, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
                    className="flex"
                  >
                    <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                  </motion.span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}</TooltipContent>
          </Tooltip>
        </div>

        <div className="px-2 pb-2 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => newThread()}
                className={`w-full flex items-center justify-center gap-2 rounded-xl h-9 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-700 text-sm font-semibold shadow-sm transition-all ${
                  sidebarOpen ? "" : "h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700/90 shadow-md shadow-emerald-600/20"
                }`}
              >
                <Plus className="size-4" />
                {sidebarOpen && <span>New Doubt</span>}
              </button>
            </TooltipTrigger>
            {!sidebarOpen && <TooltipContent side="right">New Doubt</TooltipContent>}
          </Tooltip>
        </div>

        <ScrollArea className="flex-1 p-2">
          <ul className="space-y-0.5">
            {(threads ?? []).map((t) => (
              <li key={t.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { setActiveId(t.id); setShowReferences(true); }}
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 flex items-center gap-2.5 ${
                        sidebarOpen ? "" : "justify-center px-0"
                      } ${
                        activeId === t.id ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-sm" : "text-emerald-900/70 hover:text-emerald-900 hover:bg-emerald-100/70 border border-transparent"
                      }`}
                    >
                      <MessageSquare className={`size-3.5 flex-shrink-0 ${activeId === t.id ? "text-emerald-600" : "opacity-40"}`} />
                      {sidebarOpen && <span className="truncate font-medium text-[13px]">{t.title}</span>}
                    </button>
                  </TooltipTrigger>
                  {!sidebarOpen && <TooltipContent side="right" className="max-w-[200px] truncate">{t.title}</TooltipContent>}
                </Tooltip>
              </li>
            ))}
            {(threads ?? []).length === 0 && sidebarOpen && <p className="text-xs text-center text-emerald-800/40 py-6">No doubts yet. Start a new one!</p>}
          </ul>
        </ScrollArea>

        <div className="p-2 border-t border-border/40 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`group w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs text-emerald-800/70 hover:text-emerald-900 hover:bg-emerald-100/70 transition-all cursor-pointer ${
                  !sidebarOpen ? "py-2.5 hover:bg-emerald-500/10" : ""
                }`}
              >
                {sidebarOpen ? (
                  <motion.span
                    key="dbts-bottom-collapse"
                    initial={{ x: 0 }}
                    animate={{ x: [0, -3, 3, -3, 3, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>Collapse</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="dbts-bottom-expand"
                    initial={{ x: 0 }}
                    animate={{ x: [0, -3, 3, -3, 3, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
                    className="flex"
                  >
                    <ChevronRight className="size-3.5 text-emerald-600" />
                  </motion.span>
                )}
              </button>
            </TooltipTrigger>
            {!sidebarOpen && <TooltipContent side="right">Expand sidebar</TooltipContent>}
          </Tooltip>
        </div>
      </aside>

      <section className="flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 mesh-bg pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/4 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold/4 rounded-full blur-[80px] pointer-events-none" />

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
          <div className="mx-auto w-full max-w-6xl space-y-5 pb-4">

            {!messages?.length && !isThinking && (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="flex flex-col items-center justify-center min-h-[55vh] text-center">
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
                    <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 + 0.15 }} onClick={() => setInput(prompt)} className="text-left p-4 rounded-xl premium-card border border-border/40 hover:border-primary/30 hover:bg-primary/3 transition-all duration-200 group">
                      <p className="text-sm font-medium text-foreground/80 group-hover:text-primary transition-colors leading-snug">{prompt}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {(messages ?? []).map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "user" ? (
                    <div className="max-w-[85%] md:max-w-[70%]">
                      <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm shadow-sm bg-gradient-to-br from-primary to-primary/90 text-white">
                        <p className="leading-relaxed">{m.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="rounded-3xl border border-border/40 bg-gradient-to-br from-card to-muted/20 shadow-xl shadow-primary/5 overflow-hidden">
                        <div className="relative overflow-hidden flex items-center gap-2.5 px-5 py-3 border-b border-white/10 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500">
                          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 85% -40%, rgba(255,255,255,0.28), transparent 55%)" }} />
                          <div className="absolute -left-8 -top-10 size-28 rounded-full bg-white/15 blur-2xl pointer-events-none" />
                          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 border border-white/25 backdrop-blur-sm shadow-lg shadow-emerald-900/20">
                            <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
                              <Sparkles className="size-4 text-white" />
                            </motion.div>
                          </div>
                          <div className="relative">
                            <span className="text-xs font-bold uppercase tracking-wider text-white drop-shadow-sm">AI Teacher</span>
                            <span className="text-[10px] text-white/80 ml-2">Gemini 2.5 Flash</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="relative flex size-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-white/80 animate-ping" />
                                <span className="relative inline-flex size-1.5 rounded-full bg-white" />
                              </span>
                              <span className="text-[9px] text-white/60 font-medium tracking-wide">ONLINE · RAG + ICAI MODULES</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-4">
                          <MarkdownRenderer content={m.content} />
                        </div>
                        {Array.isArray(m.citations) && m.citations.length > 0 && (
                          <div className="border-t border-border/30 bg-gradient-to-b from-muted/10 to-transparent">
                            <button
                              onClick={() => setShowReferences((prev) => !prev)}
                              className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <BookOpen className="size-3.5 text-gold" />
                                References ({m.citations.length})
                              </div>
                              {showReferences ? (
                                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                              ) : (
                                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              )}
                            </button>
                            <AnimatePresence>
                              {showReferences && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                                  <div className="px-5 pb-4 space-y-2">
                                    {m.citations.map((c: any) => (
                                      <motion.div key={c.n} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: c.n * 0.05 }} className="group/citation flex items-start gap-3 rounded-xl border border-border/30 bg-gradient-to-r from-gold/5 to-transparent px-4 py-3 hover:border-gold/30 hover:from-gold/10 hover:to-transparent transition-all duration-300 cursor-default">
                                        <div className="flex-shrink-0 mt-0.5">
                                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gold/10 border border-gold/20">
                                            <span className="text-[10px] font-bold text-gold">{c.n}</span>
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <BookOpen className="size-3 text-gold/70 flex-shrink-0" />
                                            <span className="text-[12px] font-semibold text-white/90 truncate">{c.title}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className="h-1 flex-1 rounded-full bg-border/40 overflow-hidden">
                                              <div className="h-full rounded-full bg-gradient-to-r from-gold to-primary" style={{ width: `${Math.min(100, ((c.similarity ?? 0) * 100))}%` }} />
                                            </div>
                                            <span className="text-[9px] text-white/40 tabular-nums">{Math.round((c.similarity ?? 0) * 100)}%</span>
                                          </div>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isThinking && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md" />
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/15">
                      <Sparkles className="size-3.5 text-primary animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border/40 px-5 py-4 shadow-lg shadow-primary/5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[0, 100, 200, 300, 400].map((delay) => (
                        <motion.div key={delay} className="w-1.5 h-1.5 rounded-full bg-primary/60" animate={{ scale: [0.5, 1, 0.5], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: delay / 1000 }} />
                      ))}
                    </div>
                    <span className="text-[11px] text-white/60 font-medium ml-1">Generating answer...</span>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {[0, 150, 300].map((delay) => (
                      <div key={delay} className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: `${delay}ms`, animationDuration: '0.6s' }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-5 bg-gradient-to-t from-background via-background/98 to-transparent">
          <div className="mx-auto w-full max-w-6xl">
            <div className="premium-card rounded-2xl border border-border/60 overflow-hidden shadow-xl">
              <div className="flex items-end gap-2 p-2 pl-4">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your CA doubt… (Shift+Enter for new line)"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) send(); } }}
                  className="min-h-[48px] max-h-[180px] resize-none border-0 focus-visible:ring-0 bg-transparent py-2.5 px-0 text-sm shadow-none text-foreground placeholder:text-muted-foreground/60"
                />
                <Button onClick={send} disabled={isThinking || !input.trim() || !activeId} className="mb-1 size-9 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 flex-shrink-0 transition-all" size="icon">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
            <p className="text-center text-[10px] text-muted-foreground/50 mt-2">AI teacher may make mistakes · Always verify critical facts with ICAI modules</p>
          </div>
        </div>
      </section>
      </TooltipProvider>
    </div>
  );
}