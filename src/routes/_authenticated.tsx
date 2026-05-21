import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, MessageSquare, BookOpen, Upload, LogOut, FileQuestion } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

function Layout() {
  const { user, loading, signOut, isTeacher } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const links = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/doubts", icon: MessageSquare, label: "Ask Doubts" },
    { to: "/syllabus", icon: BookOpen, label: "Syllabus" },
    { to: "/past-questions", icon: FileQuestion, label: "Past Questions" },
    ...(isTeacher ? [{ to: "/teacher", icon: Upload, label: "Knowledge" }] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <GraduationCap className="size-5 text-[var(--gold)]" />
          <span className="font-display text-xl">CA Mentor</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {links.map((l) => {
            const active = loc.pathname === l.to || loc.pathname.startsWith(l.to + "/");
            return (
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-sidebar-accent text-[var(--gold)]" : "hover:bg-sidebar-accent/60"
                }`}>
                <l.icon className="size-4" />{l.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/70 truncate">{user.email}</div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
            <LogOut className="mr-2 size-4" />Sign out
          </Button>
        </div>
      </aside>
      <main className="md:pl-60"><Outlet /></main>
    </div>
  );
}
