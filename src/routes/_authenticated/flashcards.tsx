import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brain, ChevronLeft, ChevronRight, RotateCw, Shuffle, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/flashcards")({ component: FlashCards });

const CARD_COLORS = [
  "from-violet-600 via-purple-600 to-indigo-700",
  "from-emerald-500 via-teal-600 to-cyan-700",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-600 via-blue-700 to-indigo-800",
  "from-rose-500 via-pink-600 to-fuchsia-700",
  "from-teal-500 via-cyan-600 to-sky-700",
];

const GLOW = [
  "shadow-violet-500/25",
  "shadow-emerald-500/25",
  "shadow-amber-500/25",
  "shadow-blue-500/25",
  "shadow-rose-500/25",
  "shadow-teal-500/25",
];

type FlashcardSubject = {
  name?: string | null;
  level?: string | null;
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  subject_id?: string | null;
  subjects?: FlashcardSubject | null;
};

type SubjectOption = {
  id: string;
  name: string;
  level: string | null;
};

const FALLBACK_CARDS: Flashcard[] = [
  {
    id: "f1",
    front: "What is the Accounting Equation?",
    back: "Assets = Liabilities + Capital",
    subjects: null,
  },
  {
    id: "f2",
    front: "Formula for BEP (Break Even Point) in units?",
    back: "Fixed Cost ÷ Contribution per unit",
    subjects: null,
  },
  {
    id: "f3",
    front: "What is CAPM formula?",
    back: "Ke = Rf + β(Rm − Rf)\nRf = Risk-free rate, β = Beta, Rm = Market return",
    subjects: null,
  },
  {
    id: "f4",
    front: "What does AS-1 deal with?",
    back: "Disclosure of Accounting Policies",
    subjects: null,
  },
  {
    id: "f5",
    front: "HRA Exemption — least of which 3 amounts?",
    back: "1. Actual HRA received\n2. 50%/40% of Basic+DA (Metro/Non-metro)\n3. Rent paid − 10% of Basic+DA",
    subjects: null,
  },
  {
    id: "f6",
    front: "What is EOQ formula?",
    back: "EOQ = √(2 × Annual Demand × Ordering Cost ÷ Carrying Cost per unit)",
    subjects: null,
  },
  { id: "f7", front: "What is Operating Leverage?", back: "Contribution ÷ EBIT", subjects: null },
  { id: "f8", front: "What is Financial Leverage?", back: "EBIT ÷ EBT", subjects: null },
  {
    id: "f9",
    front: "What does Section 139 of Companies Act 2013 state?",
    back: "Appointment of Auditors.\nFirst auditor appointed by BOD within 30 days of incorporation.",
    subjects: null,
  },
  {
    id: "f10",
    front: "What is NPV decision rule?",
    back: "Accept project if NPV > 0\nReject if NPV < 0\nIndifferent if NPV = 0",
    subjects: null,
  },
  {
    id: "f11",
    front: "What does AS-2 deal with?",
    back: "Valuation of Inventories\nMeasurement: Lower of Cost and NRV",
    subjects: null,
  },
  {
    id: "f12",
    front: "What is Margin of Safety formula?",
    back: "MOS = Actual Sales − BEP Sales\nMOS % = (MOS ÷ Actual Sales) × 100",
    subjects: null,
  },
  {
    id: "f13",
    front: "What is WACC?",
    back: "Weighted Average Cost of Capital\nWACC = Σ (Weight × Cost of each component)",
    subjects: null,
  },
  {
    id: "f14",
    front: "What does Section 16 of CGST Act deal with?",
    back: "Conditions for claiming Input Tax Credit (ITC):\n1. Registered person\n2. Tax invoice available\n3. Goods/services received\n4. Tax paid by supplier\n5. Return filed (GSTR-3B)",
    subjects: null,
  },
  {
    id: "f15",
    front: "What is Audit Risk formula?",
    back: "Audit Risk = Inherent Risk × Control Risk × Detection Risk",
    subjects: null,
  },
  {
    id: "f16",
    front: "What is the Going Concern concept?",
    back: "Assumption that the entity will continue in business for the foreseeable future — no intention to liquidate.",
    subjects: null,
  },
  {
    id: "f17",
    front: "What does Ind AS 115 deal with?",
    back: "Revenue from Contracts with Customers\n5-Step Model: Identify contract → POs → Transaction price → Allocate → Recognise",
    subjects: null,
  },
  {
    id: "f18",
    front: "What is Super Profit?",
    back: "Super Profit = Actual Profit − Normal Profit\nNormal Profit = Capital Employed × Normal Rate ÷ 100",
    subjects: null,
  },
  {
    id: "f19",
    front: "What is Sharpe Ratio?",
    back: "Sharpe Ratio = (Rp − Rf) ÷ σp\nMeasures excess return per unit of total risk",
    subjects: null,
  },
  {
    id: "f20",
    front: "What does Section 80C of Income Tax Act deal with?",
    back: "Deductions for LIC premium, PPF, ELSS, home loan principal etc.\nMaximum deduction: ₹1,50,000",
    subjects: null,
  },
];

function FlashCards() {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [shuffled, setShuffled] = useState(false);

  const { data: rawCards = [], isLoading } = useQuery<Flashcard[]>({
    queryKey: ["flashcards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flashcards").select("*, subjects(name, level)");
      if (error || !data?.length) return FALLBACK_CARDS;
      return data as Flashcard[];
    },
  });

  const flashcards = rawCards.length ? rawCards : FALLBACK_CARDS;

  const { data: subjects = [] } = useQuery<SubjectOption[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, name, level")
        .order("level")
        .order("name");
      return (data ?? []) as SubjectOption[];
    },
  });

  const filtered = flashcards.filter(
    (c) => subjectFilter === "all" || c.subject_id === subjectFilter,
  );

  const cards = shuffled ? [...filtered].sort(() => Math.random() - 0.5) : filtered;

  function go(newDir: 1 | -1) {
    setDir(newDir);
    setIsFlipped(false);
    logActivity(newDir === 1 ? "Flipped to next flashcard" : "Flipped to previous flashcard", undefined, "/flashcards");
    setTimeout(() => setIndex((i) => (i + newDir + cards.length) % cards.length), 80);
  }

  function handleShuffle() {
    setShuffled((s) => !s);
    setIndex(0);
    setIsFlipped(false);
    logActivity("Shuffled flashcards", undefined, "/flashcards");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen mesh-bg">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen mesh-bg">
        <div className="text-center space-y-3">
          <Brain className="size-12 mx-auto text-muted-foreground/40" />
          <p className="text-lg font-medium">No flashcards found</p>
          <p className="text-sm text-muted-foreground">Try a different subject filter</p>
        </div>
      </div>
    );
  }

  const card = cards[index];
  const colorIdx = index % CARD_COLORS.length;
  const progress = Math.round(((index + 1) / cards.length) * 100);

  return (
    <div className="min-h-full mesh-bg">
      <div className="mx-auto max-w-lg px-4 py-8 md:py-12 flex flex-col gap-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-gold rounded-full" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold/70">
              Active Recall
            </span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-gold rounded-full" />
          </div>
          <h1 className="font-display text-4xl">Flashcards</h1>
          <p className="text-muted-foreground text-sm">Flip to reveal the answer</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Select
            value={subjectFilter}
            onValueChange={(v) => {
              setSubjectFilter(v);
              setIndex(0);
              setIsFlipped(false);
            }}
          >
            <SelectTrigger className="flex-1 h-10 bg-background/50 border-border/60 rounded-xl text-sm">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.level} · {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={handleShuffle}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              shuffled
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-background/50 border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shuffle className="size-3.5" /> Shuffle
          </button>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {index + 1} of {cards.length}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Card */}
        <div style={{ perspective: "1200px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: dir * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -dir * 50 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                onClick={() => {
                  setIsFlipped((f) => !f);
                  logActivity("Flipped flashcard to reveal answer", undefined, "/flashcards");
                }}
                className="relative w-full cursor-pointer select-none"
                style={{ perspective: "1200px", minHeight: 360 }}
              >
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformStyle: "preserve-3d", position: "relative", minHeight: 360 }}
                  className="relative w-full"
                >
                  {/* FRONT FACE */}
                  <div
                    className={`absolute inset-0 w-full rounded-3xl overflow-hidden shadow-2xl ${GLOW[colorIdx]} bg-gradient-to-br ${CARD_COLORS[colorIdx]}`}
                    style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", minHeight: 360 }}
                  >
                    {/* Decorative orbs */}
                    <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-white/8 blur-2xl pointer-events-none" />

                    {/* Top label */}
                    <div className="relative z-10 flex items-center justify-between px-6 pt-5">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                        Question
                      </span>
                      <div className="flex items-center gap-2">
                        {card.subjects?.name && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/15 text-white/70">
                            {card.subjects.name}
                          </span>
                        )}
                        <span className="text-xs font-mono text-white/25">#{index + 1}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center justify-center px-8 py-10 text-center" style={{ minHeight: 280 }}>
                      <p className="text-white font-semibold text-xl md:text-2xl leading-relaxed">
                        {card.front}
                      </p>
                      <div className="mt-8 flex items-center gap-2 text-white/40 text-xs animate-pulse">
                        <RotateCw className="size-3.5" />
                        <span>Tap to flip</span>
                      </div>
                    </div>
                  </div>

                  {/* BACK FACE */}
                  <div
                    className="absolute inset-0 w-full rounded-3xl overflow-hidden shadow-2xl bg-card border border-border/60"
                    style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", minHeight: 360 }}
                  >
                    {/* Decorative */}
                    <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-gold/5 blur-2xl pointer-events-none" />

                    {/* Top label */}
                    <div className="relative z-10 flex items-center justify-between px-6 pt-5">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/50">
                        Answer
                      </span>
                      <div className="flex items-center gap-2">
                        {card.subjects?.name && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary/70">
                            {card.subjects.name}
                          </span>
                        )}
                        <span className="text-xs font-mono text-muted-foreground/30">#{index + 1}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center justify-center px-8 py-10 text-center" style={{ minHeight: 280 }}>
                      <div className="w-8 h-0.5 bg-primary/30 rounded-full mb-5" />
                      <p className="text-foreground font-medium text-lg md:text-xl leading-relaxed whitespace-pre-line">
                        {card.back}
                      </p>
                      <div className="mt-6 flex items-center gap-2 text-muted-foreground/40 text-xs">
                        <RotateCw className="size-3.5" />
                        <span>Tap to flip back</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => go(-1)}
            className="flex-1 h-12 rounded-2xl gap-2 border-border/60 hover:bg-muted/60"
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <button
            onClick={() => {
              setIsFlipped(false);
              setIndex(Math.floor(Math.random() * cards.length));
            }}
            className="size-12 rounded-2xl border border-border/60 bg-background/50 hover:bg-muted/60 flex items-center justify-center transition-colors"
          >
            <Zap className="size-4 text-gold" />
          </button>
          <Button onClick={() => go(1)} className="flex-1 h-12 rounded-2xl gap-2">
            Next <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total Cards",
              value: cards.length,
              icon: Brain,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Current",
              value: index + 1,
              icon: Sparkles,
              color: "text-gold",
              bg: "bg-gold/10",
            },
            {
              label: "Remaining",
              value: cards.length - index - 1,
              icon: Zap,
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
            },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3.5 text-center`}>
              <s.icon className={`size-4 ${s.color} mx-auto mb-1.5`} />
              <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
