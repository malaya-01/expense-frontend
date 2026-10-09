import type {
  CreateRecurringScheduleInput,
  RecurringSchedule,
} from "@/types";
import { api, isRetryableWriteError, unwrap } from "./client";
import {
  recurringExecuteLocal,
  recurringRepo,
  refreshRecurringFromServer,
} from "@/lib/offline/repos";
import { isOnline } from "@/lib/offline/network";

export async function listRecurringSchedules(): Promise<RecurringSchedule[]> {
  return (await recurringRepo.list()) as RecurringSchedule[];
}

export async function createRecurringSchedule(
  input: CreateRecurringScheduleInput,
): Promise<RecurringSchedule> {
  return (await recurringRepo.create(input as any)) as RecurringSchedule;
}

export async function updateRecurringSchedule(
  id: string,
  input: Partial<CreateRecurringScheduleInput> & {
    status?: RecurringSchedule["status"];
  },
): Promise<RecurringSchedule> {
  return (await recurringRepo.update(id, input as any)) as RecurringSchedule;
}

/** `queued`: no connection, so the run waits in the offline outbox. */
export async function executeRecurringSchedule(
  id: string,
): Promise<{ queued: boolean }> {
  if (isOnline()) {
    let posted = false;
    try {
      await api.post(`/recurring/${id}/execute`);
      posted = true;
    } catch (error) {
      // Queue only when the server never got it; real errors go to the UI.
      if (!isRetryableWriteError(error)) throw error;
    }
    if (posted) {
      await refreshRecurringFromServer(id).catch(() => undefined);
      return { queued: false };
    }
  }
  await recurringExecuteLocal(id);
  return { queued: true };
}

export async function archiveRecurringSchedule(id: string): Promise<void> {
  await recurringRepo.remove(id);
}

/**
 * Jump an overdue schedule to its next date on or after today without
 * posting the missed runs. Needs a connection.
 */
export async function skipMissedRecurringRuns(
  id: string,
): Promise<{ skipped: number; next_execution: string }> {
  const res = await api.post(`/recurring/${id}/skip-missed`);
  const data = unwrap<{ skipped: number; next_execution: string }>(res);
  await refreshRecurringFromServer(id).catch(() => undefined);
  return data;
}
