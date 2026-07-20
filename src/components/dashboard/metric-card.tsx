import { StatusDot, type StatusTone } from "@/components/ui/status-dot";
import { Card, CardBody } from "@/components/ui/card";

export function MetricCard({
  title,
  value,
  subtitle,
  tone = "green",
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: StatusTone;
}) {
  return (
    <Card>
      <CardBody className="pt-6">
        <div className="flex items-center gap-2">
          <StatusDot tone={tone} />
          <h2 className="text-[var(--ds-gray-1000)]">{title}</h2>
        </div>
        <p className="mt-4 text-[32px] font-semibold leading-10 tracking-[-1.28px] text-[var(--ds-gray-1000)]">
          {value}
        </p>
        {subtitle ? (
          <p className="mt-2 text-xs leading-4 text-[var(--ds-gray-900)]">{subtitle}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}
