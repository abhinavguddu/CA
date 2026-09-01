import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Fire-and-forget activity / presence logging. Errors are swallowed on purpose.

const HEARTBEAT_MS = 45_000;

function localDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function rpc(name: string, args: Record<string, unknown>) {
  try {
    // @ts-expect-error supabase typed client doesn't know these RPCs
    await supabase.rpc(name, args);
  } catch {
    /* ignore */
  }
}

export function logActivity(activity: string, detail?: string | null, path?: string | null) {
  void rpc("log_activity", { p_activity: activity, p_detail: detail ?? null, p_path: path ?? null });
}

// Also record a daily streak point so the heatmap fills in on any page visit.
async function touchStreak(userId: string) {
  try {
    await supabase
      .from("study_streaks")
      .upsert({ user_id: userId, date: localDateStr(), minutes: 1 }, { onConflict: "user_id,date" });
  } catch {
    /* ignore */
  }
}

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Viewing Dashboard",
  "/planner": "Viewing Study Planner",
  "/flashcards": "Reviewing Flashcards",
  "/analytics": "Viewing Analytics",
  "/doubts": "Using Ask Doubts",
  "/mock-test": "Taking Mock Test",
  "/revision": "Studying Quick Revision",
  "/syllabus": "Browsing Syllabus",
  "/past-questions": "Practising Past Questions",
  "/formula-sheets": "Viewing Formula Sheets",
  "/streaks": "Checking Study Streak",
  "/teacher": "Managing Knowledge Base",
  "/admin": "Viewing Admin Panel",
};

let lastPath = "";

/**
 * Global activity tracker. Call once inside the authenticated layout.
 *  - Logs a page-visit activity whenever the path changes.
 *  - Touches today's streak row (heatmap data source).
 *  - Heartbeats presence so admins can see who is online.
 */
export function useActivityTracker(path: string, userId?: string | null) {
  const uid = userId ?? null;

  useEffect(() => {
    if (uid && path !== lastPath) {
      lastPath = path;
      void touchStreak(uid);
      logActivity(PAGE_LABELS[path] ?? "Browsing", undefined, path);
      void rpc("heartbeat", { p_path: path });
    }
  }, [path, uid]);

  useEffect(() => {
    if (!uid) return;
    let lastBeat = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - lastBeat >= HEARTBEAT_MS) {
        lastBeat = Date.now();
        void rpc("heartbeat", { p_path: window.location.pathname });
      }
    }, HEARTBEAT_MS / 2);
    return () => window.clearInterval(id);
  }, [uid]);
}

