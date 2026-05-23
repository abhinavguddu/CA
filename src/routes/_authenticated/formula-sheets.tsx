import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { BookMarked, Plus, FileText, Pencil, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/formula-sheets")({ component: FormulaSheetsPage });

function FormulaSheetsPage() {
  const { isTeacher } = useAuth();
  const qc = useQueryClient();
  const [levelFilter, setLevelFilter] = useState("all");

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("level").order("name")).data ?? [],
  });

  const { data: sheets } = useQuery({
    queryKey: ["formula_sheets"],
    queryFn: async () => (await supabase.from("formula_sheets").select("*, subjects(name, level)").order("created_at", { ascending: false })).data ?? [],
  });

  async function deleteSheet(id: string) {
    await supabase.from("formula_sheets").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["formula_sheets"] });
    toast.success("Sheet deleted");
  }

  const levels = ["Foundation", "Intermediate", "Final"];

  const grouped = levels.map((lvl) => ({
    level: lvl,
    items: (sheets ?? []).filter((s: any) => s.subjects?.level === lvl),
  })).filter((g) => levelFilter === "all" || g.level === levelFilter);

  const totalSheets = (sheets ?? []).length;

  return (
    <div className="min-h-full mesh-bg">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-12 space-y-8">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-6 bg-gradient-to-r from-primary to-gold rounded-full" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Quick Revision</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight">Formula Sheets</h1>
            <p className="text-muted-foreground mt-2">Subject-wise condensed formulas, rules & key concepts.</p>
          </div>
          {isTeacher && <AddSheetDialog subjects={subjects ?? []} onAdded={() => qc.invalidateQueries({ queryKey: ["formula_sheets"] })} />}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex items-center gap-3">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-48 h-10 bg-background/50 border-border/60 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{totalSheets} sheet{totalSheets !== 1 ? "s" : ""}</span>
        </motion.div>

        {totalSheets === 0 ? (
          <Card className="glass-card p-16 text-center border-dashed">
            <FileText className="mx-auto size-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No formula sheets yet</p>
            {isTeacher
              ? <p className="text-sm text-muted-foreground mt-1">Add the first sheet using the button above.</p>
              : <p className="text-sm text-muted-foreground mt-1">Formula sheets will appear here once added by your teacher.</p>}
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-6">
            {grouped.map((group, gi) => group.items.length > 0 && (
              <div key={group.level}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Layers className="size-3.5 text-primary" />
                  </div>
                  <h2 className="font-display text-xl">{group.level}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                  <Badge variant="secondary" className="bg-primary/10 text-primary">{group.items.length}</Badge>
                </div>

                <Accordion type="multiple" className="space-y-3">
                  {group.items.map((sheet: any, i: number) => (
                    <motion.div key={sheet.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 + i * 0.04 }}>
                      <AccordionItem value={sheet.id} className="glass-card rounded-2xl border border-border/60 px-2 md:px-5 overflow-hidden">
                        <AccordionTrigger className="hover:no-underline py-4 group">
                          <div className="flex items-center gap-3 text-left flex-1 pr-2">
                            <div className="size-9 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                              <BookMarked className="size-4 text-gold" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{sheet.title}</p>
                              {sheet.subjects?.name && <p className="text-xs text-muted-foreground mt-0.5">{sheet.subjects.name}</p>}
                            </div>
                            {isTeacher && (
                              <div className="ml-auto flex items-center gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <EditSheetDialog sheet={sheet} subjects={subjects ?? []} onSaved={() => qc.invalidateQueries({ queryKey: ["formula_sheets"] })} />
                                <button onClick={() => deleteSheet(sheet.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors">
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 pt-2">
                          <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl bg-muted/30 border border-border/40 p-5">
                            <ReactMarkdown>{sheet.content}</ReactMarkdown>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </Accordion>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SheetForm({ subjects, initial, onSubmit, busy }: {
  subjects: any[]; busy: boolean;
  initial?: { title: string; subjectId: string; content: string };
  onSubmit: (data: { title: string; subjectId: string; content: string }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? "none");
  const [content, setContent] = useState(initial?.content ?? "");

  return (
    <div className="space-y-4 mt-4">
      <Input placeholder="Sheet title e.g. Depreciation Formulas" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl bg-muted/50" />
      <Select value={subjectId} onValueChange={setSubjectId}>
        <SelectTrigger className="h-11 rounded-xl bg-muted/50"><SelectValue placeholder="Subject (optional)" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— No subject —</SelectItem>
          {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.level} · {s.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Textarea
        placeholder={"Write in Markdown:\n\n**Formula:** NPV = Σ CF/(1+r)^t\n\n**Rule:** ...\n\n> Key point"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[200px] rounded-xl bg-muted/50 resize-none font-mono text-sm"
      />
      <Button onClick={() => onSubmit({ title, subjectId, content })} disabled={busy || !title.trim() || !content.trim()} className="w-full h-11 rounded-xl">
        {busy ? "Saving…" : "Save Sheet"}
      </Button>
    </div>
  );
}

function AddSheetDialog({ subjects, onAdded }: { subjects: any[]; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(data: { title: string; subjectId: string; content: string }) {
    if (!data.title.trim() || !data.content.trim()) { toast.error("Title and content required"); return; }
    setBusy(true);
    try {
      await supabase.from("formula_sheets").insert({
        title: data.title,
        subject_id: data.subjectId !== "none" ? data.subjectId : null,
        content: data.content,
      });
      toast.success("Sheet added");
      setOpen(false);
      onAdded();
    } catch { toast.error("Failed to save"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-md"><Plus className="mr-2 size-4" /> Add Sheet</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">Add Formula Sheet</DialogTitle></DialogHeader>
        <SheetForm subjects={subjects} busy={busy} onSubmit={submit} />
      </DialogContent>
    </Dialog>
  );
}

function EditSheetDialog({ sheet, subjects, onSaved }: { sheet: any; subjects: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(data: { title: string; subjectId: string; content: string }) {
    setBusy(true);
    try {
      await supabase.from("formula_sheets").update({
        title: data.title,
        subject_id: data.subjectId !== "none" ? data.subjectId : null,
        content: data.content,
        updated_at: new Date().toISOString(),
      }).eq("id", sheet.id);
      toast.success("Sheet updated");
      setOpen(false);
      onSaved();
    } catch { toast.error("Failed to update"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors">
          <Pencil className="size-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">Edit Formula Sheet</DialogTitle></DialogHeader>
        <SheetForm
          subjects={subjects}
          busy={busy}
          initial={{ title: sheet.title, subjectId: sheet.subject_id ?? "none", content: sheet.content }}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}
