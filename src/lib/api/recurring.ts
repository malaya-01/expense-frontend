import type {
  CreateRecurringScheduleInput,
  RecurringSchedule,
} from "@/types";
import { api } from "./client";
import { recurringExecuteLocal, recurringRepo } from "@/lib/offline/repos";
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

export async function executeRecurringSchedule(id: string): Promise<void> {
  if (isOnline()) {
    try {
      await api.post(`/recurring/${id}/execute`);
      return;
    } catch {
      /* queue */
    }
  }
  await recurringExecuteLocal(id);
}

export async function archiveRecurringSchedule(id: string): Promise<void> {
  await recurringRepo.remove(id);
}
