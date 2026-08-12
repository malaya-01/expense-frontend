import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";

export function ComingSoon({
  title,
  description,
  question,
}: {
  title: string;
  description: string;
  question: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <CardBody className="flex flex-col items-start gap-4 py-12 sm:flex-row sm:items-center">
          <StatusDot tone="blue" className="mt-0.5 size-3" />
          <div>
            <p className="text-sm font-medium text-[var(--ds-gray-1000)]">
              {question}
            </p>
            <p className="mt-2 max-w-xl text-xs leading-4 text-[var(--ds-gray-900)]">
              This Opal module is on the Phase 1 roadmap. The dashboard shell
              and navigation are live so the product feels like an operating
              system—not a marketing site—while the ledger and containers are
              built out.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
