import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalSettingsPage() {
  return (
    <JournalShell activeNav="settings" headerTitle="Settings">
      <JournalPageHeader title="Journal settings" subtitle="Workspace preferences" />
      <section className="jrn-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-[10px] text-slate-500">Light, dark, or system</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/[0.06]">
          <div>
            <p className="text-sm font-medium">Default home</p>
            <p className="text-[10px] text-slate-500">Page opened after login to journal</p>
          </div>
          <select className="jrn-input w-auto">
            <option>Home</option>
            <option>Daily journal</option>
            <option>Last edited</option>
          </select>
        </div>
        <Link href="/choose-app" className="jrn-btn-secondary inline-flex">
          Switch to Expense Tracker
        </Link>
      </section>
    </JournalShell>
  );
}
