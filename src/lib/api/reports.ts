import { api, unwrap } from "./client";
import type { ReportOverview } from "@/types";

export async function getReportOverview(
  months = 6,
): Promise<ReportOverview> {
  const res = await api.get("/reports/overview", { params: { months } });
  return unwrap<ReportOverview>(res);
}

export type ReportSchedule = {
  enabled: boolean;
  frequency: "weekly" | "monthly" | "custom";
  weekday: number;
  monthly_mode: "last_day" | "day_of_month";
  day_of_month: number;
  custom_mode: "interval" | "dates";
  interval_days: number;
  custom_dates: string[];
  send_time: string;
  include_excel: boolean;
  include_ai: boolean;
  timezone?: string;
  summary?: string;
  next_send_at?: string | null;
  current_period?: { start: string; end: string; label: string };
  last_sent_at?: string | null;
  last_error?: string | null;
  default_note?: string;
};

export async function getReportSchedule(): Promise<ReportSchedule> {
  const res = await api.get("/reports/schedule");
  return unwrap<ReportSchedule>(res);
}

export async function saveReportSchedule(
  payload: Partial<ReportSchedule>,
): Promise<ReportSchedule> {
  const res = await api.patch("/reports/schedule", payload);
  return unwrap<ReportSchedule>(res);
}

export async function sendReportNow(): Promise<{
  sent: boolean;
  period: { start: string; end: string };
}> {
  const res = await api.post("/reports/schedule/send-now");
  return unwrap(res);
}
