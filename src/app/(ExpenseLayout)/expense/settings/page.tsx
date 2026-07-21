import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ExpensePageHeader } from "../../_components/ExpensePageHeader";
import { ExpenseShell } from "../../_components/ExpenseShell";

export default function SettingsPage() {
  return (
    <ExpenseShell activeNav="settings" headerTitle="Settings">
      <ExpensePageHeader
        title="Settings"
        subtitle="Manage your account and preferences"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings nav — sidebar tabs on desktop */}
        <nav className="dash-card h-fit p-2 lg:col-span-1">
          {/* TODO: Switch active tab with state or nested routes (/settings/profile, etc.) */}
          <ul className="space-y-0.5">
            {["Profile", "Preferences", "Notifications", "Security", "Billing"].map((tab, i) => (
              <li key={tab}>
                <button
                  type="button"
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    i === 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Profile settings panel */}
        <div className="space-y-6 lg:col-span-2">
          <section className="dash-card">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Profile</h2>
            <p className="mb-4 text-xs text-slate-500">Update your personal information</p>

            {/* TODO: onSubmit → PATCH /users/me with form data */}
            <form className="space-y-4">
              <div className="flex items-center gap-4">
                {/* TODO: Avatar upload → POST /users/me/avatar (multipart) */}
                <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  JD
                </span>
                <button type="button" className="dash-btn-secondary text-xs">Change photo</button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="settings-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Full name
                  </label>
                  <input id="settings-name" type="text" defaultValue="Jane Doe" className="dash-input" />
                </div>
                <div>
                  <label htmlFor="settings-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    defaultValue="jane@example.com"
                    className="dash-input"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div>
                <label htmlFor="settings-currency" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Default currency
                </label>
                {/* TODO: Save to user preferences — affects how amounts are formatted app-wide */}
                <select id="settings-currency" className="dash-select max-w-xs" defaultValue="USD">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>

              <button type="button" className="dash-btn-primary">Save changes</button>
            </form>
          </section>

          <section className="dash-card">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Appearance</h2>
            <p className="mb-4 text-xs text-slate-500">Theme and display preferences</p>

            <div className="dash-setting-row">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Color theme</p>
                <p className="text-xs text-slate-500">Light, dark, or match system</p>
              </div>
              <ThemeToggle />
            </div>
          </section>

          <section className="dash-card">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h2>
            <p className="mb-2 text-xs text-slate-500">Choose what you want to be notified about</p>

            {/* TODO: Each toggle → PATCH /users/me/preferences { key: boolean } */}
            {[
              { label: "Budget alerts", desc: "When you approach or exceed a budget limit" },
              { label: "Weekly summary", desc: "Email digest of your spending every Monday" },
              { label: "Large transactions", desc: "Alert for expenses over $100" },
              { label: "AI insights", desc: "New recommendations from the AI assistant" },
            ].map((item, i) => (
              <div key={item.label} className={`dash-setting-row ${i > 0 ? "border-t border-slate-200 dark:border-slate-800" : ""}`}>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                {/* TODO: Wire toggle — add/remove dash-toggle-on class based on state */}
                <button
                  type="button"
                  className={`dash-toggle ${i === 0 || i === 2 ? "dash-toggle-on" : ""}`}
                  aria-label={`Toggle ${item.label}`}
                >
                  <span className="dash-toggle-knob" />
                </button>
              </div>
            ))}
          </section>

          <section className="dash-card border-rose-200 dark:border-rose-900/50">
            <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400">Danger zone</h2>
            <p className="mb-4 text-xs text-slate-500">Irreversible account actions</p>
            <div className="flex flex-wrap gap-3">
              {/* TODO: Change password modal → POST /auth/change-password */}
              <button type="button" className="dash-btn-secondary">Change password</button>
              {/* TODO: Confirm dialog → DELETE /users/me */}
              <button type="button" className="dash-btn-secondary border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950">
                Delete account
              </button>
            </div>
          </section>
        </div>
      </div>
    </ExpenseShell>
  );
}
