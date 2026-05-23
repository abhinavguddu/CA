import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, pw);
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success("Welcome back!");
    nav({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Panel - Branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-muted lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-primary-foreground/10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        
        {/* Animated Orbs */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-gold/20 blur-[80px] animate-blob" />
        <div className="absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-background/20 blur-[80px] animate-blob" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 p-12">
          <Link to="/" className="flex w-fit items-center gap-2 rounded-2xl glass px-4 py-2 text-primary-foreground transition-transform hover:scale-105">
            <GraduationCap className="size-6" />
            <span className="font-display text-2xl tracking-tight">CA Mentor</span>
          </Link>
        </div>

        <div className="relative z-10 p-12">
          <motion.blockquote 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <p className="font-display text-4xl leading-tight text-primary-foreground md:text-5xl">
              "Success in CA is the sum of small efforts, repeated day in and day out."
            </p>
            <footer className="text-primary-foreground/70 text-lg">Your AI Study Partner</footer>
          </motion.blockquote>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full items-center justify-center lg:w-1/2 p-6 mesh-bg relative">
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="space-y-2 text-center lg:text-left">
            <Link to="/" className="inline-flex lg:hidden items-center gap-2 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                <GraduationCap className="size-5 text-primary-foreground" />
              </div>
              <span className="font-display text-2xl tracking-tight">CA Mentor</span>
            </Link>
            <h1 className="font-display text-4xl tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Enter your details to sign in to your account</p>
          </div>

          <form onSubmit={submit} className="space-y-5 rounded-3xl glass-card p-8">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email address</Label>
              <Input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="h-12 bg-background/50 focus:bg-background transition-colors focus-visible:ring-primary/50" 
                placeholder="you@example.com" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Password</Label>
                {/* Forgot password link could go here */}
              </div>
              <Input 
                type="password" 
                required 
                value={pw} 
                onChange={(e) => setPw(e.target.value)} 
                className="h-12 bg-background/50 focus:bg-background transition-colors focus-visible:ring-primary/50" 
                placeholder="••••••••" 
              />
            </div>
            
            <Button type="submit" className="w-full h-12 text-base rounded-xl mt-4 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all group" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 size-5 animate-spin" /> Signing in…</>
              ) : (
                <>Sign in <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-colors">
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
