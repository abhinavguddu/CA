import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { askDoubt } from "@/lib/rag.functions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Plus, Send, Sparkles } from "lucide-react";

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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="border-r border-border bg-card/50 p-3">
        <Button onClick={newThread} className="w-full" size="sm"><Plus className="mr-1 size-4" />New doubt</Button>
        <ScrollArea className="mt-3 h-[calc(100vh-80px)]">
          <ul className="space-y-1">
            {(threads ?? []).map((t) => (
              <li key={t.id}>
                <button onClick={() => setActiveId(t.id)}
                  className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${activeId === t.id ? "bg-accent" : "hover:bg-muted"}`}>
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </aside>

      <section className="flex h-screen flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-4">
            {!messages?.length && (
              <Card className="p-8 text-center">
                <Sparkles className="mx-auto size-6 text-[var(--gold)]" />
                <h2 className="mt-3 font-display text-2xl">Ask your CA doubt</h2>
                <p className="mt-1 text-sm text-muted-foreground">e.g. "Explain Section 73 of CGST Act with an example" or "How is goodwill calculated under AS 14?"</p>
              </Card>
            )}
            {(messages ?? []).map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  {Array.isArray((m as any).citations) && (m as any).citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                      {(m as any).citations.map((c: any) => (
                        <span key={c.n} className="rounded bg-muted px-1.5 py-0.5">[{c.n}] {c.title}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && <div className="text-sm text-muted-foreground">Thinking…</div>}
          </div>
        </div>
        <div className="border-t border-border p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your CA doubt…"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              className="min-h-[52px] resize-none" />
            <Button onClick={send} disabled={sending || !input.trim() || !activeId}><Send className="size-4" /></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
