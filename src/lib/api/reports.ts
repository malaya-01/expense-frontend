import { api, unwrap } from "./client";
import type { ReportOverview } from "@/types";

export async function getReportOverview(
  months = 6,
): Promise<ReportOverview> {
  const res = await api.get("/reports/overview", { params: { months } });
  return unwrap<ReportOverview>(res);
}
