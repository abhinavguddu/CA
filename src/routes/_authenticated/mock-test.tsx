import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Target, ChevronRight, RotateCcw, BookOpen, CheckCircle2, XCircle, AlertCircle, Flame, Play } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/mock-test")({ component: MockTestPage });

interface Question {
  id: string;
  question_text: string;
  marks: number | null;
  exam_month: string;
  exam_year: number;
  subjects?: { name: string } | null;
}

interface SessionResult {
  total: number;
  attempted: number;
  correct: number;
  timeTaken: number;
  answers: Record<string, "correct" | "skipped">;
}

const QUESTIONS_OPTIONS = [5, 10, 15, 20];
const TIME_PER_Q = 90; // seconds per question

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function MockTestPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("setup");
  const [level, setLevel] = useState("all");
  const [subjectId, setSubjectId] = useState("all");
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "correct" | "skipped">>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("level").order("name")).data ?? [],
  });

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const finishTest = useCallback(
    async (finalAnswers: Record<string, "correct" | "skipped">, forced = false) => {
      stopTimer();
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
      const attempted = Object.values(finalAnswers).filter((v) => v === "correct" || v === "skipped").length;
      const correct = Object.values(finalAnswers).filter((v) => v === "correct").length;
      const total = questions.length;
      const score_pct = total > 0 ? Math.round((correct / total) * 100 * 100) / 100 : 0;

      const sessionResult: SessionResult = { total, attempted, correct, timeTaken, answers: finalAnswers };
      setResult(sessionResult);
      setPhase("results");
      logActivity("Finished a mock test", `Score ${score_pct}% (${correct}/${total} correct)`, "/mock-test");

      if (user) {
        try {
          await supabase.from("mock_test_sessions").insert({
            user_id: user.id,
            subject_id: subjectId !== "all" ? subjectId : null,
            level: level !== "all" ? level : null,
            total_questions: total,
            attempted,
            correct,
            score_pct,
            time_taken_seconds: timeTaken,
            question_ids: questions.map((q) => q.id),
            answers: finalAnswers,
          });
        } catch {
          // silent — don't block results screen
        }
      }

      if (forced) toast.info("Time's up! Test submitted.");
    },
    [questions, user, subjectId, level, stopTimer],
  );

  useEffect(() => {
    if (phase !== "test") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          finishTest(answers, true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return stopTimer;
  }, [phase, finishTest, answers, stopTimer]);

  async function startTest() {
    let q = supabase
      .from("past_questions")
      .select("id, question_text, marks, exam_month, exam_year, subjects(name)")
      .limit(questionCount * 3);
    if (level !== "all") q = q.eq("level", level as any);
    if (subjectId !== "all") q = q.eq("subject_id", subjectId);
    const { data, error } = await q;
    if (error || !data?.length) {
      toast.error("No questions found for selected filters. Try different options.");
      return;
    }
    const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, questionCount);
    setQuestions(shuffled as Question[]);
    setAnswers({});
    setCurrent(0);
    setTimeLeft(shuffled.length * TIME_PER_Q);
    startTimeRef.current = Date.now();
    setPhase("test");
    logActivity("Started a mock test", `${shuffled.length} questions`, "/mock-test");
  }

  function markAnswer(qId: string, val: "correct" | "skipped") {
    const updated = { ...answers, [qId]: val };
    setAnswers(updated);
    logActivity(val === "correct" ? "Answered a mock test question" : "Skipped a mock test question", undefined, "/mock-test");
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      finishTest(updated);
    }
  }

  function restart() {
    stopTimer();
    setPhase("setup");
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setCurrent(0);
    logActivity("Restarted mock test setup", undefined, "/mock-test");
  }

  return (
    <div className="min-h-full mesh-bg">
      <div className="mx-auto max-w-3xl px-6 py-10 md:px-10 md:py-12">
        <AnimatePresence mode="wait">
          {phase === "setup" && (
            <SetupScreen
              key="setup"
              level={level}
              setLevel={setLevel}
              subjectId={subjectId}
              setSubjectId={setSubjectId}
              questionCount={questionCount}
              setQuestionCount={setQuestionCount}
              subjects={subjects ?? []}
              onStart={startTest}
            />
          )}
          {phase === "test" && questions.length > 0 && (
            <TestScreen
              key="test"
              questions={questions}
              current={current}
              timeLeft={timeLeft}
              onAnswer={markAnswer}
              onFinish={() => finishTest(answers)}
            />
          )}
          {phase === "results" && result && (
            <ResultsScreen key="results" result={result} questions={questions} onRestart={restart} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SetupScreen({
  level, setLevel, subjectId, setSubjectId, questionCount, setQuestionCount, subjects, onStart,
}: {
  level: string; setLevel: (v: string) => void;
  subjectId: string; setSubjectId: (v: string) => void;
  questionCount: number; setQuestionCount: (v: number) => void;
  subjects: any[]; onStart: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px w-6 bg-gradient-to-r from-primary to-gold rounded-full" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Practice</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight">Mock Test</h1>
        <p className="text-muted-foreground mt-2">Test yourself with real ICAI past exam questions. Self-assess each answer honestly.</p>
      </div>

      <Card className="glass-card p-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Level</label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-11 bg-background/50 border-border/60"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Foundation">Foundation</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Final">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Subject</label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="h-11 bg-background/50 border-border/60"><SelectValue placeholder="All Subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.level} · {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Number of Questions</label>
          <div className="flex gap-3 flex-wrap">
            {QUESTIONS_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                  questionCount === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {n} Qs
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/40">
          <Clock className="size-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Time Limit: {formatTime(questionCount * TIME_PER_Q)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{TIME_PER_Q} seconds per question · Self-assessed</p>
          </div>
        </div>

        <Button onClick={onStart} size="lg" className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20">
          <Play className="mr-2 size-5" /> Start Test
        </Button>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Target, label: "Real Questions", sub: "From ICAI past papers" },
          { icon: Clock, label: "Timed Practice", sub: "Exam-like pressure" },
          { icon: Trophy, label: "Instant Score", sub: "Track your progress" },
        ].map((item) => (
          <div key={item.label} className="premium-card rounded-2xl p-4 text-center space-y-2">
            <div className="mx-auto size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <item.icon className="size-5 text-primary" />
            </div>
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TestScreen({
  questions, current, timeLeft, onAnswer, onFinish,
}: {
  questions: Question[]; current: number; timeLeft: number;
  onAnswer: (id: string, val: "correct" | "skipped") => void;
  onFinish: () => void;
}) {
  const q = questions[current];
  const progress = ((current) / questions.length) * 100;
  const isLow = timeLeft < 60;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Question <span className="text-foreground font-bold">{current + 1}</span> of {questions.length}
          </p>
          <Progress value={progress} className="w-48 h-1.5" />
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg border-2 transition-colors ${
          isLow ? "border-destructive/60 bg-destructive/10 text-destructive" : "border-border/60 bg-background/50 text-foreground"
        }`}>
          <Clock className={`size-4 ${isLow ? "animate-pulse" : ""}`} />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="glass-card p-8 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {q.subjects?.name && <Badge variant="secondary" className="bg-primary/8 text-primary border-primary/20">{q.subjects.name}</Badge>}
              <Badge variant="outline" className="bg-background/50">{q.exam_month} {q.exam_year}</Badge>
              {q.marks && <Badge className="bg-gold/15 text-gold border-gold/30 ml-auto">{q.marks} marks</Badge>}
            </div>

            <div className="relative pl-4">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-gold rounded-full" />
              <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">{q.question_text}</p>
            </div>

            <div className="pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">How did you do on this question?</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => onAnswer(q.id, "correct")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/60 transition-all duration-200 group"
                >
                  <CheckCircle2 className="size-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-emerald-600">Got it right</span>
                </button>
                <button
                  onClick={() => onAnswer(q.id, "skipped")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/60 transition-all duration-200 group"
                >
                  <AlertCircle className="size-6 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-amber-600">Partially right</span>
                </button>
                <button
                  onClick={() => onAnswer(q.id, "skipped")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-destructive/30 bg-destructive/5 hover:bg-destructive/15 hover:border-destructive/60 transition-all duration-200 group"
                >
                  <XCircle className="size-6 text-destructive group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-destructive">Didn't know</span>
                </button>
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">{questions.length - current - 1} questions remaining</p>
        <Button variant="outline" size="sm" onClick={onFinish} className="rounded-xl text-xs">
          End Test Early <ChevronRight className="ml-1 size-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

function ResultsScreen({ result, questions, onRestart }: { result: SessionResult; questions: Question[]; onRestart: () => void }) {
  const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
  const grade = pct >= 75 ? { label: "Excellent", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" }
    : pct >= 50 ? { label: "Good", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" }
    : { label: "Needs Work", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" };

  const circleR = 42;
  const circleC = 2 * Math.PI * circleR;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px w-6 bg-gradient-to-r from-primary to-gold rounded-full" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Results</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight">Test Complete</h1>
      </div>

      {/* Score Card */}
      <Card className="glass-card p-8">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Circle */}
          <div className="relative size-[120px] flex-shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-muted/60 stroke-current" strokeWidth="7" cx="50" cy="50" r={circleR} fill="transparent" />
              <motion.circle
                className="text-primary stroke-current"
                strokeWidth="7"
                strokeLinecap="round"
                cx="50" cy="50" r={circleR}
                fill="transparent"
                initial={{ strokeDashoffset: circleC }}
                animate={{ strokeDashoffset: circleC - (pct / 100) * circleC }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                style={{ strokeDasharray: circleC }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums">{pct}%</span>
            </div>
          </div>

          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${grade.bg} ${grade.color}`}>
                <Flame className="size-4" /> {grade.label}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-display tabular-nums text-emerald-500">{result.correct}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-display tabular-nums text-destructive">{result.total - result.correct}</p>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-display tabular-nums">{formatTime(result.timeTaken)}</p>
                <p className="text-xs text-muted-foreground">Time taken</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Question breakdown */}
      <div className="space-y-3">
        <h2 className="font-display text-xl">Question Breakdown</h2>
        <div className="space-y-2">
          {questions.map((q, i) => {
            const ans = result.answers[q.id];
            const isCorrect = ans === "correct";
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card/50"
              >
                <div className={`mt-0.5 flex-shrink-0 size-6 rounded-full flex items-center justify-center ${isCorrect ? "bg-emerald-500/15" : "bg-destructive/15"}`}>
                  {isCorrect
                    ? <CheckCircle2 className="size-4 text-emerald-500" />
                    : <XCircle className="size-4 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 line-clamp-2">{q.question_text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{q.subjects?.name} · {q.exam_month} {q.exam_year}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onRestart} className="flex-1 h-12 rounded-xl font-semibold shadow-lg shadow-primary/20">
          <RotateCcw className="mr-2 size-4" /> Try Another Test
        </Button>
        <Button variant="outline" asChild className="h-12 rounded-xl px-6">
          <a href="/past-questions">
            <BookOpen className="mr-2 size-4" /> Review Questions
          </a>
        </Button>
      </div>
    </motion.div>
  );
}
