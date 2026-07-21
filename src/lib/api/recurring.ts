import type {
  CreateRecurringScheduleInput,
  RecurringSchedule,
} from "@/types";
import { api, unwrap } from "./client";

export async function listRecurringSchedules(): Promise<RecurringSchedule[]> {
  const response = await api.get("/recurring");
  const data = unwrap<RecurringSchedule[] | RecurringSchedule>(response);
  return Array.isArray(data) ? data : data ? [data] : [];
}

export async function createRecurringSchedule(
  input: CreateRecurringScheduleInput,
): Promise<RecurringSchedule> {
  const response = await api.post("/recurring", input);
  return unwrap<RecurringSchedule>(response);
}

export async function updateRecurringSchedule(
  id: string,
  input: Partial<CreateRecurringScheduleInput> & {
    status?: RecurringSchedule["status"];
  },
): Promise<RecurringSchedule> {
  const response = await api.patch(`/recurring/${id}`, input);
  return unwrap<RecurringSchedule>(response);
}

export async function executeRecurringSchedule(id: string): Promise<void> {
  await api.post(`/recurring/${id}/execute`);
}

export async function archiveRecurringSchedule(id: string): Promise<void> {
  await api.delete(`/recurring/${id}`);
}
