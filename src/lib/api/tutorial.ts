import { api, unwrap } from "./client";
import { getClientPlatform } from "@/lib/runtime-platform";
import type { TutorialTaskKind } from "@/lib/tutorial/signals";

export type { TutorialTaskKind };

export type TutorialLayout = "desktop" | "mobile";
export type TutorialSurface = "web" | "native";
export type TutorialPlacement = "auto" | "top" | "bottom" | "left" | "right";

export type TutorialAction =
  | { kind: "navigate"; label: string; href: string }
  | { kind: "new-transaction"; label: string };

/** A hands-on step the user completes in the app's real form. */
export type TutorialTask = {
  kind: TutorialTaskKind;
  label: string;
  hint: string;
  done_title: string;
  done_body: string;
  already_done: string;
  requires?: TutorialTaskKind;
  checklist_label: string;
};

/** One step as served by GET /tutorial (content is backend-owned). */
export type TutorialStep = {
  id: string;
  title: string;
  body: string;
  tips?: string[];
  icon?: string;
  target?: Partial<Record<TutorialLayout, string>>;
  placement?: TutorialPlacement;
  route?: string;
  surfaces?: TutorialSurface[];
  layouts?: TutorialLayout[];
  actions?: TutorialAction[];
  task?: TutorialTask;
  checklist?: boolean;
};

export type TutorialStatus = "not_started" | "in_progress" | "completed";

export type TutorialProgress = {
  status: TutorialStatus;
  current_step: string | null;
  viewed_steps: string[];
  tutorial_version: number;
  started_at: string | null;
  completed_at: string | null;
  completed_platform: string | null;
  last_seen_at: string | null;
  dismiss_count: number;
  restart_count: number;
};

/** Counts of what the user has set up (marks task steps as done). */
export type TutorialFacts = {
  accounts: number;
  transactions: number;
  budgets: number;
};

export type TutorialPayload = {
  key: string;
  version: number;
  steps: TutorialStep[];
  progress: TutorialProgress;
  facts?: TutorialFacts;
  should_show: boolean;
};

export type TutorialEvent = "view" | "dismiss" | "complete";

export async function getTutorial(): Promise<TutorialPayload> {
  const res = await api.get("/tutorial");
  return unwrap<TutorialPayload>(res);
}

export async function recordTutorialProgress(
  event: TutorialEvent,
  stepId?: string,
): Promise<TutorialProgress> {
  const res = await api.patch("/tutorial/progress", {
    event,
    ...(stepId ? { step_id: stepId } : {}),
    platform: getClientPlatform().code,
  });
  return unwrap<TutorialProgress>(res);
}

export async function restartTutorial(): Promise<TutorialProgress> {
  const res = await api.post("/tutorial/restart");
  return unwrap<TutorialProgress>(res);
}
