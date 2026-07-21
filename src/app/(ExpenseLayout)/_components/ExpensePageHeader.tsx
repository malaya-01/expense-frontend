import Link from "next/link";

/** Reusable page heading with optional action buttons */
type ExpensePageHeaderProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export function ExpensePageHeader({ title, subtitle, children }: ExpensePageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="dash-page-title">{title}</h1>
        {subtitle && <p className="dash-page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Stat summary card — pass real values from API later */
type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "up" | "down";
};

export function StatCard({ label, value, delta, deltaType = "up" }: StatCardProps) {
  return (
    <article className="dash-stat-card">
      <p className="dash-stat-label">{label}</p>
      {/* TODO: Replace static value with data from GET /dashboard/stats */}
      <p className="dash-stat-value">{value}</p>
      {delta && (
        <p className={`dash-stat-delta ${deltaType === "up" ? "dash-stat-delta-up" : "dash-stat-delta-down"}`}>
          {deltaType === "up" ? "↑" : "↓"} {delta}
        </p>
      )}
    </article>
  );
}

/** Placeholder link styled as action chip */
export function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="dash-btn-secondary text-xs sm:text-sm">
      {icon}
      {label}
    </Link>
  );
}
