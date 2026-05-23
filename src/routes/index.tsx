import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, MessageSquare, Target, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground mesh-bg overflow-x-hidden">
      {/* Decorative floating blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px] pointer-events-none animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-gold/10 blur-[100px] pointer-events-none animate-blob" style={{ animationDelay: '2s' }} />

      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 glass border-b-0 border-white/5">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
            <GraduationCap className="size-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl tracking-tight text-foreground/90">CA Mentor</span>
        </div>
        <nav className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard">
              <Button className="rounded-full px-6 shadow-md hover:shadow-primary/20 transition-all duration-300">
                Dashboard
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" className="rounded-full hover:bg-white/10 dark:hover:bg-black/10">Sign in</Button></Link>
              <Link to="/signup">
                <Button className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 bg-gradient-to-r from-primary to-primary/90">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-5xl px-6 pt-20 pb-24 text-center md:pt-32">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full glass border border-white/10 px-4 py-1.5 text-xs font-medium text-foreground/80 shadow-sm"
            >
              <Sparkles className="size-3.5 text-[var(--gold)]" />
              <span>Built for ICAI Foundation, Inter & Final</span>
            </motion.div>
            
            <h1 className="font-display text-6xl leading-[1.1] md:text-8xl tracking-tight">
              Your personal <br className="hidden md:block" />
              <span className="text-gradient font-style-italic relative inline-block">
                CA teacher
                <div className="absolute -bottom-2 left-0 w-full h-[6px] bg-gradient-to-r from-primary/40 to-transparent rounded-full blur-[2px]" />
              </span>,
              <br className="md:hidden" /> powered by AI.
            </h1>
            
            <p className="mx-auto mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed font-light">
              Ask doubts in plain English. Get exam-grade answers grounded in your study material with cited references — Companies Act, Income Tax, GST, Ind AS and SA standards included.
            </p>
            
            <motion.div 
              className="mt-12 flex flex-col sm:flex-row justify-center gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Link to={user ? "/dashboard" : "/signup"} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-full h-14 px-8 text-base shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300">
                  Start learning free
                  <ArrowRight className="ml-2 size-5" />
                </Button>
              </Link>
              <Link to={user ? "/doubts" : "/login"} className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full h-14 px-8 text-base glass hover:bg-white/5 border-border/50">
                  Ask a doubt
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-32 md:grid-cols-3 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-gradient-to-b from-transparent via-primary/5 to-transparent blur-[100px] pointer-events-none" />
          
          {[
            { icon: MessageSquare, title: "AI Doubt Engine", desc: "Conversational, citation-backed answers from a model trained for CA-level rigor." },
            { icon: BookOpen, title: "Syllabus Tracker", desc: "Every topic of every paper. Mark progress, set confidence, never lose your place." },
            { icon: Target, title: "Exam-grade output", desc: "Section references, worked examples, exam tips — written the way ICAI expects." },
          ].map((f, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: "-100px" }} 
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="group relative rounded-3xl glass-card p-8 hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 group-hover:scale-110 transition-transform duration-500">
                  <f.icon className="size-6 text-primary" />
                </div>
                <h3 className="font-display text-2xl mb-3 tracking-tight">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </section>
      </main>

      <footer className="relative border-t border-border/30 bg-background/50 backdrop-blur-md py-10 text-center text-sm text-muted-foreground z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="flex items-center justify-center gap-2 mb-2">
          <GraduationCap className="size-4 opacity-50" />
          <span className="font-display text-lg opacity-80">CA Mentor</span>
        </div>
        <p>© {new Date().getFullYear()} CA Mentor · Not affiliated with ICAI</p>
      </footer>
    </div>
  );
}
