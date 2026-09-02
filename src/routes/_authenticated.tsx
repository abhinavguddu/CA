import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Upload,
  LogOut,
  FileQuestion,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ClipboardList,
  Bookmark,
  Zap,
  CalendarDays,
  Layers,
  BarChart3,
  ShieldCheck,
  FileClock,
  LibraryBig,
  MessageCircleQuestion,
  Sigma,
  BookMarked,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Footer } from "@/components/Footer";
import { useActivityTracker } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

function Layout() {
  const { user, loading, signOut, isTeacher, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const nav = useNavigate();
  const loc = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [loc.pathname]);

  useActivityTracker(loc.pathname, user?.id);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gold/30 blur-2xl animate-pulse" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sidebar-accent to-sidebar border border-sidebar-border shadow-2xl">
              <GraduationCap className="size-10 text-gold" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl text-sidebar-foreground">CA Mentor</p>
            <p className="text-sm text-sidebar-foreground/50 mt-1 animate-pulse">Loading your workspace…</p>
          </div>
        </div>
      </div>
    );
  }

  const links = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", color: "text-emerald-400" },
    { to: "/past-questions", icon: FileClock, label: "Past Questions", color: "text-amber-400" },
    { to: "/books", icon: LibraryBig, label: "Books", color: "text-yellow-400" },
    { to: "/doubts", icon: MessageCircleQuestion, label: "Ask Doubts", color: "text-green-400" },
    { to: "/revision", icon: Zap, label: "Quick Revision", color: "text-rose-400" },
    { to: "/formula-sheets", icon: Sigma, label: "Formula Sheets", color: "text-cyan-400" },
    { to: "/mock-test", icon: ClipboardList, label: "Mock Test", color: "text-purple-400" },
    { to: "/planner", icon: CalendarDays, label: "Study Planner", color: "text-indigo-400" },
    { to: "/flashcards", icon: Layers, label: "Flash Cards", color: "text-amber-400" },
    { to: "/analytics", icon: BarChart3, label: "Analytics", color: "text-blue-400" },
    { to: "/syllabus", icon: BookMarked, label: "Syllabus", color: "text-violet-400" },
    { to: "/bookmarks", icon: Bookmark, label: "Bookmarks", color: "text-pink-400" },
    { to: "/streaks", icon: Zap, label: "Study Streak", color: "text-orange-400" },
    ...(isTeacher ? [{ to: "/teacher", icon: Upload, label: "Knowledge Base", color: "text-rose-400" }] : []),
    ...(isAdmin ? [{ to: "/admin", icon: ShieldCheck, label: "Live Activity", color: "text-gold" }] : []),
  ] as const;

  const initials = user.email?.substring(0, 2).toUpperCase() || "CA";

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo & Collapse */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gold/25 blur-md" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/90 to-gold/60 shadow-lg">
              <GraduationCap className="size-5 text-sidebar" />
            </div>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden transition-opacity duration-200">
              <span className="font-display text-[22px] tracking-tight text-sidebar-foreground leading-none block">CA Mentor</span>
              <span className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest font-medium">AI-Powered Study</span>
            </div>
          )}
        </div>
        {!mobile && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="group flex items-center justify-center gap-1 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/60 p-1.5 transition-colors text-sidebar-foreground/60 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground flex-shrink-0 cursor-pointer active:scale-95"
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarOpen ? (
                  <motion.span
                    key="desk-collapse"
                    initial={{ x: 0 }}
                    animate={{ x: [0, -4, 4, -4, 4, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
                    className="flex"
                  >
                    <ChevronsLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="desk-expand"
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
            <TooltipContent side={sidebarOpen ? "bottom" : "right"}>
              {sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Divider */}
      {sidebarOpen && <div className="mx-5 mb-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />}

      {/* Nav label */}
      {sidebarOpen && (
        <div className="px-6 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/30">Navigation</span>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent pb-4">
        {links.map((l, idx) => {
          const active = loc.pathname === l.to || loc.pathname.startsWith(l.to + "/");
          return (
            <motion.div
              key={l.to}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(0.05 * idx, 0.5), type: "spring", stiffness: 300, damping: 24 }}
              whileHover={{ x: 3 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={l.to} className="block">
                    <div className="relative">
                      {active && (
                        <motion.div
                          layoutId="active-nav-bg"
                          className="absolute inset-0 rounded-xl bg-sidebar-accent border border-sidebar-border/80"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ type: "spring", stiffness: 350, damping: 35 }}
                        />
                      )}
                      <div
                        className={`relative z-10 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                          active ? "text-sidebar-foreground" : "text-sidebar-foreground/50 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent/40"
                        }`}
                      >
                        <motion.div
                          whileHover={{ scale: 1.35, rotate: active ? 0 : [-8, 8, 0] }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className={`flex items-center justify-center size-7 rounded-lg transition-colors duration-200 ${active ? "bg-sidebar-border/80" : "bg-sidebar-border/20"}`}
                        >
                          <motion.span
                            animate={active ? { scale: [1, 1.25, 1] } : {}}
                            transition={{ duration: 0.4 }}
                          >
                            <l.icon className={`size-3.5 ${active ? l.color : ""}`} />
                          </motion.span>
                        </motion.div>
                        {sidebarOpen && <span className="flex-1">{l.label}</span>}
                        {active && sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <ChevronRight className="size-3.5 text-sidebar-foreground/30" />
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </Link>
                </TooltipTrigger>
                {!sidebarOpen && <TooltipContent side="right">{l.label}</TooltipContent>}
              </Tooltip>
            </motion.div>
          );
        })}
      </nav>

      {/* Glow decoration */}
      {sidebarOpen && <div className="mx-5 my-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />}

      {/* Bottom collapse button (clearly visible) */}
      {sidebarOpen && !mobile && (
        <div className="px-3 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center gap-2 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2 text-[12px] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                <ChevronsLeft className="size-3.5" />
                <span className="flex-1 text-left">Collapse sidebar</span>
                <span className="text-[10px] opacity-40">‹</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Hide sidebar to focus</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* User Profile */}
      {sidebarOpen && (
        <div className="p-3 pb-5">
          <div className="rounded-xl bg-sidebar-accent/60 border border-sidebar-border/50 p-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold/80 to-gold/50 text-sidebar font-bold text-sm shadow-inner shadow-black/20">
                  {initials}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 border-2 border-sidebar" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-[13px] font-semibold text-sidebar-foreground">{user.email}</p>
                <p className="text-[11px] text-sidebar-foreground/45">{isTeacher ? "Teacher" : "Student"}</p>
              </div>
            </div>
            <button
              onClick={async () => { await signOut(); nav({ to: "/" }); }}
              className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-border/40 transition-all duration-200 font-medium"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 hidden flex-col bg-sidebar overflow-hidden transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-[56px]"
          } md:flex`}
        >
          {/* Background glow orbs */}
          <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-primary/8 to-transparent pointer-events-none" />
          {/* Subtle right border glow */}
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-sidebar-border/0 via-sidebar-border to-sidebar-border/0" />
          <SidebarContent />
        </aside>

        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-xl px-4 md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-gold/80 to-gold/50 shadow-md">
              <GraduationCap className="size-4 text-sidebar" />
            </div>
            <span className="font-display text-xl text-foreground">CA Mentor</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="rounded-xl">
            <Menu className="size-5" />
          </Button>
        </header>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.38 }}
className="fixed inset-y-0 left-0 z-50 w-[260px] flex-col bg-sidebar md:hidden flex overflow-hidden"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 text-sidebar-foreground/50 hover:text-sidebar-foreground rounded-xl z-10"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X className="size-5" />
                  </Button>
                  <SidebarContent mobile />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={`min-h-screen flex flex-col transition-all duration-300 ${sidebarOpen ? "md:pl-64" : "md:pl-[56px]"}`}>
          <Outlet />
          <Footer />
        </main>
      </div>
    </TooltipProvider>
  );
}
