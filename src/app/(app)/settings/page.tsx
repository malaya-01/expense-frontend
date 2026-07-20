"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { ThemeSettings } from "@/components/settings/theme-settings";
import { useAuth } from "@/lib/auth-context";
import { getCountry } from "@/lib/currency/currency.data";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Appearance, account, and FinOS session."
      />

      <div className="grid max-w-3xl gap-4">
        <ThemeSettings />

        <Card>
          <CardHeader>
            <h2>Profile</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[var(--ds-gray-900)]">Name</span>
              <span className="text-sm text-[var(--ds-gray-1000)]">
                {user?.full_name || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[var(--ds-gray-900)]">Email</span>
              <span className="text-sm text-[var(--ds-gray-1000)]">
                {user?.email || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[var(--ds-gray-900)]">User ID</span>
              <span className="max-w-[60%] truncate font-mono text-[13px] font-medium text-[var(--ds-gray-700)]">
                {user?.id || "—"}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2>Defaults</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[var(--ds-gray-900)]">Country</span>
              <span className="text-sm text-[var(--ds-gray-1000)]">
                {user?.country
                  ? getCountry(user.country)?.name || user.country
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[var(--ds-gray-900)]">
                Base currency
              </span>
              <span className="inline-flex items-center gap-2 text-sm">
                <StatusDot tone="green" />
                {user?.currency || "USD"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[var(--ds-gray-900)]">Timezone</span>
              <span className="text-sm text-[var(--ds-gray-1000)]">
                {user?.timezone || "UTC"}
              </span>
            </div>
            <p className="pt-2 text-xs leading-4 text-[var(--ds-gray-700)]">
              Net worth and cash-flow totals convert into your base currency.
              Each account keeps its own currency; cross-currency transfers use
              an exchange rate.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2>Session</h2>
          </CardHeader>
          <CardBody>
            <Button
              variant="danger"
              onClick={() => {
                logout();
                router.replace("/signin");
              }}
            >
              Log out
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
