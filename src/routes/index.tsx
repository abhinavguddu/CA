import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, MessageSquare, Target, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-6 text-primary" />
          <span className="font-display text-2xl">CA Mentor</span>
        </div>
        <nav className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard"><Button>Dashboard</Button></Link>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
              <Link to="/signup"><Button>Get started</Button></Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-12 pb-20 text-center md:pt-20">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3 text-[var(--gold)]" /> Built for ICAI Foundation, Inter & Final
          </div>
          <h1 className="font-display text-5xl leading-tight md:text-7xl">
            Your personal <em className="text-primary">CA</em> teacher,<br/>powered by AI.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Ask doubts in plain English. Get exam-grade answers grounded in your study material with cited references — Companies Act, Income Tax, GST, Ind AS and SA standards included.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={user ? "/dashboard" : "/signup"}>
              <Button size="lg" className="bg-primary text-primary-foreground">Start learning free</Button>
            </Link>
            <Link to={user ? "/doubts" : "/login"}>
              <Button size="lg" variant="outline">Ask a doubt</Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: MessageSquare, title: "AI Doubt Engine", desc: "Conversational, citation-backed answers from a model trained for CA-level rigor." },
          { icon: BookOpen, title: "Syllabus Tracker", desc: "Every topic of every paper. Mark progress, set confidence, never lose your place." },
          { icon: Target, title: "Exam-grade output", desc: "Section references, worked examples, exam tips — written the way ICAI expects." },
        ].map((f, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-card p-6">
            <f.icon className="size-6 text-primary" />
            <h3 className="mt-4 font-display text-2xl">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CA Mentor · Not affiliated with ICAI
      </footer>
    </div>
  );
}
