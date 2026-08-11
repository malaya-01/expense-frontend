import {
  createAsyncThunk,
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { listBudgets } from "@/lib/api/budgets";
import { listGoals } from "@/lib/api/goals";
import { listRecurringSchedules } from "@/lib/api/recurring";
import {
  listSpaceNotifications,
  markSpaceNotificationsRead,
} from "@/lib/api/spaces";
import {
  getNotificationPreferences,
  patchNotificationPreferences,
} from "@/lib/api/user";
import { saveNotificationPreferences } from "@/lib/offline/repos";

export const DISMISSED_NOTIFICATIONS_KEY = "finos:dismissed-notifications";

export type NoticeTone = "warning" | "danger" | "success";
export type NoticeKind = "budget" | "goal" | "recurring" | "space";

export type Notice = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: NoticeTone;
  kind: NoticeKind;
};

export type NotificationsState = {
  notices: Notice[];
  dismissed: string[];
  loading: boolean;
  loaded: boolean;
  dismissedHydrated: boolean;
};

const initialState: NotificationsState = {
  notices: [],
  dismissed: [],
  loading: false,
  loaded: false,
  dismissedHydrated: false,
};

function todayKey() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function readLocalDismissed(): string[] {
  try {
    const raw = JSON.parse(
      localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || "[]",
    );
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

function spaceNotificationUuid(id: string): string | null {
  const raw = id.startsWith("space-") ? id.slice("space-".length) : id;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw,
    )
  ) {
    return raw;
  }
  return null;
}

async function loadRemoteDismissed(userId?: string | null): Promise<string[]> {
  const ids: string[] = [];
  try {
    const data = await getNotificationPreferences();
    const remote = data.preferences?.dismissed_ids;
    if (Array.isArray(remote)) ids.push(...remote.map(String));
  } catch {
    /* offline or older API */
  }
  if (userId) {
    try {
      const { offlineDb } = await import("@/lib/offline/db");
      const row = await offlineDb.notification_preferences.get(userId);
      const local = (row?.preferences as { dismissed_ids?: unknown } | undefined)
        ?.dismissed_ids;
      if (Array.isArray(local)) ids.push(...local.map(String));
    } catch {
      /* ignore */
    }
  }
  return [...new Set(ids)];
}

export const fetchNotifications = createAsyncThunk<
  { notices: Notice[]; dismissed: string[] },
  void,
  {
    state: {
      notifications: NotificationsState;
      auth: { user?: { id?: string } | null };
    };
  }
>(
  "notifications/fetch",
  async (_argument, { getState }) => {
    const [budgets, goals, schedules, spaceNotices] = await Promise.all([
      listBudgets().catch(() => []),
      listGoals().catch(() => []),
      listRecurringSchedules().catch(() => []),
      listSpaceNotifications().catch(() => []),
    ]);

    const next: Notice[] = [];

    for (const budget of budgets) {
      if (budget.status === "over") {
        next.push({
          id: `budget-over-${budget.id}`,
          title: `${budget.name} is over budget`,
          description: `Spending reached ${budget.percent.toFixed(0)}% of the planned amount.`,
          href: "/budgets",
          tone: "danger",
          kind: "budget",
        });
      } else if (budget.status === "warning") {
        next.push({
          id: `budget-warning-${budget.id}`,
          title: `${budget.name} is near its limit`,
          description: `${budget.percent.toFixed(0)}% used — review spending before the period ends.`,
          href: "/budgets",
          tone: "warning",
          kind: "budget",
        });
      }
    }

    for (const goal of goals) {
      if (goal.status === "behind" || goal.status === "at_risk") {
        next.push({
          id: `goal-risk-${goal.id}`,
          title: `${goal.name} needs attention`,
          description: `Progress is ${goal.percent.toFixed(0)}%. Review the forecast and contribution plan.`,
          href: "/goals",
          tone: "warning",
          kind: "goal",
        });
      } else if (goal.status === "achieved") {
        next.push({
          id: `goal-achieved-${goal.id}`,
          title: `${goal.name} achieved`,
          description: "Your target has been reached.",
          href: "/goals",
          tone: "success",
          kind: "goal",
        });
      }
    }

    const today = todayKey();
    for (const schedule of schedules) {
      if (schedule.last_error) {
        next.push({
          id: `recurring-failed-${schedule.id}-${schedule.updated_at}`,
          title: `${schedule.name} was paused`,
          description: schedule.last_error,
          href: "/recurring",
          tone: "danger",
          kind: "recurring",
        });
      } else if (
        schedule.status === "active" &&
        schedule.execution_mode === "review" &&
        schedule.next_execution <= today
      ) {
        next.push({
          id: `recurring-due-${schedule.id}-${schedule.next_execution}`,
          title: `${schedule.name} is ready to post`,
          description:
            "Review and post this scheduled transaction from Recurring.",
          href: "/recurring",
          tone: "warning",
          kind: "recurring",
        });
      }
    }

    for (const notice of spaceNotices as any[]) {
      if (notice.read_at) continue;
      const isInvite = notice.kind === "invite" || notice.type === "invite";
      next.push({
        id: `space-${notice.id}`,
        title: notice.title || (isInvite ? "Space invite" : "Space update"),
        description:
          notice.body ||
          notice.message ||
          (isInvite
            ? "Open to accept this Collaborative Space invite."
            : "Open Collaborative Spaces"),
        href: notice.href || "/spaces",
        tone: isInvite ? "success" : "warning",
        kind: "space",
      });
    }

    const userId = getState().auth.user?.id;
    const dismissed = [
      ...new Set([
        ...readLocalDismissed(),
        ...(await loadRemoteDismissed(userId)),
      ]),
    ];
    if (typeof window !== "undefined") {
      localStorage.setItem(
        DISMISSED_NOTIFICATIONS_KEY,
        JSON.stringify(dismissed),
      );
    }

    return { notices: next, dismissed };
  },
  {
    condition: (_argument, { getState }) => {
      return !getState().notifications.loading;
    },
  },
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    hydrateDismissed(state, action: PayloadAction<string[]>) {
      state.dismissed = action.payload;
      state.dismissedHydrated = true;
    },
    dismissAllNotifications(state) {
      state.dismissed = [
        ...new Set([...state.dismissed, ...state.notices.map((item) => item.id)]),
      ];
    },
    markNoticeRead(state, action: PayloadAction<string>) {
      if (!state.dismissed.includes(action.payload)) {
        state.dismissed.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notices = action.payload.notices;
        state.dismissed = [
          ...new Set([...state.dismissed, ...action.payload.dismissed]),
        ];
        state.loading = false;
        state.loaded = true;
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loading = false;
        state.loaded = true;
      });
  },
});

export const {
  hydrateDismissed,
  dismissAllNotifications,
  markNoticeRead,
} = notificationsSlice.actions;

export async function persistDismissedNotifications(
  dismissed: string[],
  userId?: string | null,
) {
  if (typeof window !== "undefined") {
    localStorage.setItem(
      DISMISSED_NOTIFICATIONS_KEY,
      JSON.stringify(dismissed),
    );
  }
  const spaceIds = dismissed
    .map(spaceNotificationUuid)
    .filter((id): id is string => Boolean(id));
  const writes: Promise<unknown>[] = [markSpaceNotificationsRead(spaceIds)];
  if (userId) {
    writes.push(
      saveNotificationPreferences(userId, { dismissed_ids: dismissed }),
    );
    writes.push(patchNotificationPreferences({ dismissed_ids: dismissed }));
  }
  await Promise.allSettled(writes);
}
export default notificationsSlice.reducer;

export const selectVisibleNotifications = createSelector(
  [
    (state: { notifications: NotificationsState }) =>
      state.notifications.notices,
    (state: { notifications: NotificationsState }) =>
      state.notifications.dismissed,
  ],
  (notices, dismissed) =>
    notices.filter((notice) => !dismissed.includes(notice.id)),
);
