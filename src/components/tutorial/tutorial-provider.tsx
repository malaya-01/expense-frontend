"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isNativeClient } from "@/lib/runtime-platform";
import {
  getTutorial,
  recordTutorialProgress,
  restartTutorial,
  type TutorialLayout,
  type TutorialPayload,
  type TutorialProgress,
  type TutorialStep,
} from "@/lib/api/tutorial";
import {
  onTutorialSignal,
  type TutorialTaskKind,
} from "@/lib/tutorial/signals";
import { toast } from "@/components/ui/toast";
import { TutorialTour } from "@/components/tutorial/tutorial-tour";

/**
 * Guided tutorial, driven by GET /tutorial:
 * - Opens automatically after sign-in (or app launch) until the backend says
 *   it is completed. Existing accounts have no progress row, so they get it
 *   too.
 * - "Skip for now" hides it for this session only. Logout wipes
 *   sessionStorage (offline/clear-session.ts), so it returns on next sign-in;
 *   on the phone app a cold start is a new session as well.
 * - Settings → Help & tutorial and the command palette replay it.
 */

const POSTPONED_KEY = "finos:tutorial-postponed";
/** Completion that could not reach the server (offline); retried on load. */
const PENDING_COMPLETE_KEY = "finos:tutorial-pending-complete";
/** Let the app shell paint before the tour takes over. */
const AUTO_OPEN_DELAY_MS = 900;
/** Routes that are mid-flow; the tour waits until the user leaves them. */
const AUTO_OPEN_BLOCKED = [
  "/spaces/invites",
  "/expenses/new",
  "/expenses/edit",
  "/admin",
];

type StartOptions = { restart?: boolean };

type TutorialContextValue = {
  payload: TutorialPayload | null;
  loading: boolean;
  error: string | null;
  open: boolean;
  /** Steps that apply to this device and screen size. */
  steps: TutorialStep[];
  /** Hands-on tasks already satisfied (existing data or done this session). */
  doneTasks: ReadonlySet<TutorialTaskKind>;
  start: (options?: StartOptions) => Promise<void>;
  refresh: () => Promise<void>;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Matches the app shell: sidebar at md (768px) and up, bottom bar below. */
function useTutorialLayout(): TutorialLayout {
  const [layout, setLayout] = useState<TutorialLayout>("desktop");
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setLayout(query.matches ? "desktop" : "mobile");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return layout;
}

export function filterTutorialSteps(
  steps: TutorialStep[],
  layout: TutorialLayout,
  surface: "web" | "native",
): TutorialStep[] {
  return steps.filter(
    (step) =>
      (!step.layouts?.length || step.layouts.includes(layout)) &&
      (!step.surfaces?.length || step.surfaces.includes(surface)),
  );
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const userId = user?.id ?? null;
  const layout = useTutorialLayout();

  const [payload, setPayload] = useState<TutorialPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [startStepId, setStartStepId] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
  const autoOpenedFor = useRef<string | null>(null);
  const [signaled, setSignaled] = useState<ReadonlySet<TutorialTaskKind>>(
    () => new Set(),
  );

  // Creates made while signed in (in or outside the tour) count as done.
  useEffect(
    () =>
      onTutorialSignal((kind) =>
        setSignaled((current) =>
          current.has(kind) ? current : new Set([...current, kind]),
        ),
      ),
    [],
  );

  const doneTasks = useMemo<ReadonlySet<TutorialTaskKind>>(() => {
    const done = new Set(signaled);
    const facts = payload?.facts;
    if (facts?.accounts) done.add("create-account");
    if (facts?.transactions) done.add("create-transaction");
    if (facts?.budgets) done.add("create-budget");
    return done;
  }, [payload?.facts, signaled]);

  const steps = useMemo(
    () =>
      payload
        ? filterTutorialSteps(
            payload.steps,
            layout,
            isNativeClient() ? "native" : "web",
          )
        : [],
    [payload, layout],
  );

  const applyProgress = useCallback((progress: TutorialProgress) => {
    setPayload((current) =>
      current
        ? {
            ...current,
            progress,
            should_show: progress.status !== "completed",
          }
        : current,
    );
  }, []);

  const flushPendingCompletion = useCallback(async (uid: string) => {
    if (readLocal(PENDING_COMPLETE_KEY) !== uid) return;
    try {
      await recordTutorialProgress("complete");
      writeLocal(PENDING_COMPLETE_KEY, null);
    } catch {
      /* still offline; try again next load */
    }
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await flushPendingCompletion(userId);
      const data = await getTutorial();
      setPayload(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tutorial unavailable");
    } finally {
      setLoading(false);
    }
  }, [flushPendingCompletion, userId]);

  // Fetch once per signed-in user; retry when the device comes back online.
  useEffect(() => {
    if (!ready || !userId) {
      setPayload(null);
      setSignaled(new Set());
      setOpen(false);
      autoOpenedFor.current = null;
      return;
    }
    void load();
    const onOnline = () => {
      void load();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [ready, userId, load]);

  // Auto-open on sign-in / app launch until completed.
  useEffect(() => {
    if (!userId || !payload || open) return;
    if (!payload.should_show || !steps.length) return;
    if (autoOpenedFor.current === userId) return;
    if (readSession(`${POSTPONED_KEY}:${userId}`)) return;
    if (readLocal(PENDING_COMPLETE_KEY) === userId) return;
    if (AUTO_OPEN_BLOCKED.some((route) => pathname.startsWith(route))) return;
    const timer = window.setTimeout(() => {
      autoOpenedFor.current = userId;
      const resume = payload.progress.current_step;
      setStartStepId(
        resume && steps.some((step) => step.id === resume) ? resume : null,
      );
      setRunKey((key) => key + 1);
      setOpen(true);
    }, AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [open, pathname, payload, steps, userId]);

  const start = useCallback(
    async (options?: StartOptions) => {
      if (!userId) return;
      let data = payload;
      if (!data) {
        try {
          data = await getTutorial();
          setPayload(data);
        } catch {
          toast.error(
            "Tutorial unavailable",
            "Connect to the internet and try again.",
          );
          return;
        }
      }
      if (options?.restart) {
        try {
          applyProgress(await restartTutorial());
        } catch {
          /* replay still works locally; progress catches up on next view */
        }
      }
      autoOpenedFor.current = userId;
      setStartStepId(null);
      setRunKey((key) => key + 1);
      setOpen(true);
    },
    [applyProgress, payload, userId],
  );

  const handleView = useCallback(
    (step: TutorialStep) => {
      void recordTutorialProgress("view", step.id)
        .then(applyProgress)
        .catch(() => {
          /* best effort */
        });
    },
    [applyProgress],
  );

  const handlePostpone = useCallback(
    (step: TutorialStep | null) => {
      setOpen(false);
      if (userId) writeSession(`${POSTPONED_KEY}:${userId}`, "1");
      // A replay of a finished tutorial needs no reminder.
      if (payload?.progress.status === "completed") return;
      void recordTutorialProgress("dismiss", step?.id)
        .then(applyProgress)
        .catch(() => {
          /* best effort */
        });
      toast.info(
        "Tutorial paused",
        "It will open again next time you sign in. Replay it anytime from Settings → Help & tutorial.",
      );
    },
    [applyProgress, payload?.progress.status, userId],
  );

  const handleComplete = useCallback(
    (step: TutorialStep | null, options?: { quiet?: boolean }) => {
      setOpen(false);
      const wasCompleted = payload?.progress.status === "completed";
      if (payload) {
        applyProgress({
          ...payload.progress,
          status: "completed",
          completed_at:
            payload.progress.completed_at ?? new Date().toISOString(),
        });
      }
      void recordTutorialProgress("complete", step?.id)
        .then(applyProgress)
        .catch(() => {
          // Offline: remember it so the tour does not reopen, and retry later.
          if (userId) writeLocal(PENDING_COMPLETE_KEY, userId);
        });
      if (!options?.quiet && !wasCompleted) {
        toast.success(
          "Tutorial complete",
          "Replay it anytime from Settings → Help & tutorial.",
        );
      }
    },
    [applyProgress, payload, userId],
  );

  const value = useMemo<TutorialContextValue>(
    () => ({
      payload,
      loading,
      error,
      open,
      steps,
      doneTasks,
      start,
      refresh: load,
    }),
    [payload, loading, error, open, steps, doneTasks, start, load],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {open && steps.length ? (
        <TutorialTour
          key={runKey}
          steps={steps}
          layout={layout}
          startStepId={startStepId}
          doneTasks={doneTasks}
          onView={handleView}
          onPostpone={handlePostpone}
          onComplete={handleComplete}
        />
      ) : null}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used inside TutorialProvider");
  }
  return context;
}
