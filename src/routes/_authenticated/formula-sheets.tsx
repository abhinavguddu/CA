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
import { motion } from "framer-motion";
import { BookMarked, Plus, FileText, Pencil, Trash2, Layers, Lightbulb, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

export const Route = createFileRoute("/_authenticated/formula-sheets")({ component: FormulaSheetsPage });

// ── Formula renderer: parses $...$ inline and $$...$$ block, tables, tips ──
function FormulaContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let tableBuffer: string[] = [];

  function flushTable() {
    if (!tableBuffer.length) return;
    const rows = tableBuffer.map((r) => r.split("|").map((c) => c.trim()).filter(Boolean));
    const header = rows[0];
    const body = rows.slice(2); // skip separator row
    elements.push(
      <div key={`table-${i}`} className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-primary/10">
              {header.map((h, hi) => (
                <th key={hi} className="px-4 py-2.5 text-left font-semibold text-primary border border-border/40 text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-background/60" : "bg-muted/30"}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 border border-border/30 text-foreground/80 text-sm">{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    // Table row
    if (line.trim().startsWith("|")) {
      tableBuffer.push(line);
      i++;
      continue;
    } else {
      flushTable();
    }

    // Block math $$...$$
    if (line.trim().startsWith("$$")) {
      const mathContent = line.trim().slice(2).replace(/\$\$$/, "").trim();
      if (mathContent) {
        elements.push(
          <div key={i} className="my-4 p-4 rounded-xl bg-primary/5 border border-primary/15 text-center overflow-x-auto">
            <BlockMath math={mathContent} />
          </div>
        );
      }
      i++;
      continue;
    }

    // Section heading ##
    if (line.startsWith("## ")) {
      elements.push(
        <div key={i} className="flex items-center gap-2 mt-6 mb-3 first:mt-0">
          <div className="h-5 w-1 bg-gradient-to-b from-primary to-gold rounded-full flex-shrink-0" />
          <h3 className="font-display text-lg font-semibold text-foreground">{line.slice(3)}</h3>
        </div>
      );
      i++;
      continue;
    }

    // Sub-heading ###
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="font-semibold text-sm text-primary mt-4 mb-2 uppercase tracking-wide">{line.slice(4)}</h4>);
      i++;
      continue;
    }

    // Exam tip > **...
    if (line.startsWith("> ")) {
      const tip = line.slice(2).replace(/\*\*/g, "");
      elements.push(
        <div key={i} className="flex items-start gap-3 mt-4 p-4 rounded-xl bg-gold/8 border border-gold/25">
          <Lightbulb className="size-4 text-gold flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80 leading-relaxed">{tip}</p>
        </div>
      );
      i++;
      continue;
    }

    // Formula bullet: - **Label** = formula
    if (line.match(/^[-*]\s+\*\*.+\*\*/)) {
      const match = line.match(/^[-*]\s+\*\*(.+?)\*\*\s*[=:]\s*(.+)/);
      if (match) {
        const [, label, formula] = match;
        elements.push(
          <div key={i} className="flex items-start gap-3 py-2.5 px-4 my-1.5 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border-l-2 border-primary/40 group hover:border-primary/70 hover:from-primary/8 transition-all">
            <div className="flex-shrink-0 mt-0.5">
              <div className="size-5 rounded-md bg-primary/15 flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary">f</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-primary/80 uppercase tracking-wide block mb-0.5">{label}</span>
              <span className="text-sm font-mono text-foreground/90 break-all">{renderInline(formula)}</span>
            </div>
          </div>
        );
        i++;
        continue;
      }
    }

    // Regular bullet
    if (line.match(/^[-*]\s+/)) {
      const text = line.replace(/^[-*]\s+/, "");
      elements.push(
        <div key={i} className="flex items-start gap-2.5 py-1.5 pl-2">
          <div className="size-1.5 rounded-full bg-primary/50 flex-shrink-0 mt-2" />
          <p className="text-sm text-foreground/80 leading-relaxed">{renderInline(text)}</p>
        </div>
      );
      i++;
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s+/)) {
      const num = line.match(/^(\d+)\.\s+(.+)/);
      if (num) {
        elements.push(
          <div key={i} className="flex items-start gap-3 py-1.5 pl-2">
            <span className="size-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{num[1]}</span>
            <p className="text-sm text-foreground/80 leading-relaxed">{renderInline(num[2])}</p>
          </div>
        );
        i++;
        continue;
      }
    }

    // Code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={i} className="my-4 rounded-xl bg-sidebar border border-sidebar-border overflow-x-auto">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-sidebar-border">
            <div className="size-2.5 rounded-full bg-destructive/60" />
            <div className="size-2.5 rounded-full bg-gold/60" />
            <div className="size-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <pre className="px-4 py-3 text-xs text-sidebar-foreground/90 font-mono leading-relaxed whitespace-pre-wrap">{codeLines.join("\n")}</pre>
        </div>
      );
      i++;
      continue;
    }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Plain text
    elements.push(<p key={i} className="text-sm text-foreground/80 leading-relaxed py-0.5">{renderInline(line)}</p>);
    i++;
  }

  flushTable();
  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Split on $...$ for inline math
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      try {
        return <InlineMath key={i} math={part.slice(1, -1)} />;
      } catch {
        return <code key={i} className="text-primary font-mono text-xs bg-primary/10 px-1 rounded">{part}</code>;
      }
    }
    // Bold
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, bi) => {
      if (bp.startsWith("**") && bp.endsWith("**")) {
        return <strong key={bi} className="font-semibold text-foreground">{bp.slice(2, -2)}</strong>;
      }
      return bp;
    });
  });
}

// ── Main Page ──
function FormulaSheetsPage() {
  const { isTeacher } = useAuth();
  const qc = useQueryClient();
  const [levelFilter, setLevelFilter] = useState("all");

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("level").order("name")).data ?? [],
  });

  const { data: sheets, isLoading } = useQuery({
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
  })).filter((g) => (levelFilter === "all" || g.level === levelFilter) && g.items.length > 0);

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
            <SelectTrigger className="w-48 h-10 bg-background/50 border-border/60 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{totalSheets} sheet{totalSheets !== 1 ? "s" : ""}</span>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin mr-3" />Loading…
          </div>
        ) : totalSheets === 0 ? (
          <Card className="glass-card p-16 text-center border-dashed">
            <FileText className="mx-auto size-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No formula sheets yet</p>
            {isTeacher
              ? <p className="text-sm text-muted-foreground mt-1">Add the first sheet using the button above.</p>
              : <p className="text-sm text-muted-foreground mt-1">Formula sheets will appear here once added by your teacher.</p>}
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-8">
            {grouped.map((group, gi) => (
              <div key={group.level}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Layers className="size-4 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl">{group.level}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{group.items.length} sheets</Badge>
                </div>

                <Accordion type="multiple" className="space-y-3">
                  {group.items.map((sheet: any, i: number) => (
                    <motion.div key={sheet.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 + i * 0.04 }}>
                      <AccordionItem value={sheet.id} className="glass-card rounded-2xl border border-border/60 overflow-hidden">
                        <AccordionTrigger className="hover:no-underline px-5 py-4 group">
                          <div className="flex items-center gap-3 text-left flex-1 pr-2">
                            <div className="size-10 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
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
                        <AccordionContent className="px-5 pb-6 pt-1">
                          <div className="rounded-2xl border border-border/40 bg-gradient-to-b from-muted/20 to-transparent p-5">
                            <FormulaContent content={sheet.content} />
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
      <div className="rounded-xl bg-muted/30 border border-border/40 p-3 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5"><AlertCircle className="size-3.5" /><span className="font-medium">Formatting guide</span></div>
        <p>Use <code className="bg-muted px-1 rounded">## Heading</code> for sections · <code className="bg-muted px-1 rounded">- **Label** = formula</code> for formula cards · <code className="bg-muted px-1 rounded">$x = \frac{"{a}{b}"}$</code> for math · <code className="bg-muted px-1 rounded">{">"} tip</code> for exam tips</p>
      </div>
      <Textarea placeholder={"## Key Formulas\n- **NPV** = $\\sum \\frac{CF_t}{(1+r)^t}$ - Initial Investment\n\n> Exam tip: Always show working notes."} value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[220px] rounded-xl bg-muted/50 resize-none font-mono text-sm" />
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
    setBusy(true);
    try {
      await supabase.from("formula_sheets").insert({ title: data.title, subject_id: data.subjectId !== "none" ? data.subjectId : null, content: data.content });
      toast.success("Sheet added"); setOpen(false); onAdded();
    } catch { toast.error("Failed to save"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-xl shadow-md"><Plus className="mr-2 size-4" /> Add Sheet</Button></DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl"><DialogHeader><DialogTitle className="font-display text-2xl">Add Formula Sheet</DialogTitle></DialogHeader><SheetForm subjects={subjects} busy={busy} onSubmit={submit} /></DialogContent>
    </Dialog>
  );
}

function EditSheetDialog({ sheet, subjects, onSaved }: { sheet: any; subjects: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(data: { title: string; subjectId: string; content: string }) {
    setBusy(true);
    try {
      await supabase.from("formula_sheets").update({ title: data.title, subject_id: data.subjectId !== "none" ? data.subjectId : null, content: data.content, updated_at: new Date().toISOString() }).eq("id", sheet.id);
      toast.success("Sheet updated"); setOpen(false); onSaved();
    } catch { toast.error("Failed to update"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"><Pencil className="size-3.5" /></button></DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl"><DialogHeader><DialogTitle className="font-display text-2xl">Edit Formula Sheet</DialogTitle></DialogHeader>
        <SheetForm subjects={subjects} busy={busy} initial={{ title: sheet.title, subjectId: sheet.subject_id ?? "none", content: sheet.content }} onSubmit={submit} />
      </DialogContent>
    </Dialog>
  );
}
