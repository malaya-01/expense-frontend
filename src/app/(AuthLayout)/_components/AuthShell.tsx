import Link from "next/link";
import { AuthMotion } from "./AuthMotion";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type AuthShellProps = {
  title: string;
  subtitle: string;
  panelTitle: string;
  panelDescription: string;
  panelBullets?: string[];
  /** Sign-up has more fields — tighter vertical rhythm */
  compact?: boolean;
  children: React.ReactNode;
  footer: React.ReactNode;
};

function HeroTitle({ text }: { text: string }) {
  return (
    <h1 className="overflow-hidden text-2xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-[1.65rem]">
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} className="mr-[0.2em] inline-block overflow-hidden pb-0.5">
          <span data-auth-hero-word className="auth-hero-word">
            {word}
          </span>
        </span>
      ))}
    </h1>
  );
}

export function AuthShell({
  title,
  subtitle,
  panelTitle,
  panelDescription,
  panelBullets = [],
  compact = false,
  children,
  footer,
}: AuthShellProps) {
  const gap = compact ? "space-y-3" : "space-y-3.5";

  return (
    <AuthMotion>
      <div className="auth-page auth-mesh" data-auth-mesh>
        <header
          data-auth-header
          className="relative z-20 flex shrink-0 items-center justify-between px-5 py-3 sm:px-8"
        >
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 font-mono text-xs font-bold text-white shadow-md shadow-emerald-500/30">
              $
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Expense<span className="text-emerald-600 dark:text-emerald-400">Tracker</span>
            </span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="relative z-10 flex min-h-0 flex-1 items-stretch justify-center px-4 pb-3 sm:px-6 sm:pb-4">
          <div className="auth-card" data-auth-card>
            <div className="auth-form-col">
              <div className={`my-auto w-full ${gap}`}>
                <div>
                  <HeroTitle text={title} />
                  <p className="auth-muted mt-1 max-w-sm leading-snug">{subtitle}</p>
                </div>

                {children}

                <p className="auth-muted text-center">{footer}</p>
              </div>
            </div>

            <aside className="auth-panel auth-panel-grid">
              <div
                className="pointer-events-none absolute -left-20 -top-20 size-56 rounded-full bg-emerald-600/10 blur-3xl"
                data-auth-orb
              />
              <div
                className="pointer-events-none absolute -bottom-16 -right-8 size-64 rounded-full bg-teal-500/10 blur-3xl"
                data-auth-orb
              />
              <div
                className="pointer-events-none absolute left-1/3 top-1/2 size-40 rounded-full bg-indigo-500/10 blur-2xl"
                data-auth-orb
              />

              <div className="relative flex h-full flex-col justify-between p-7 xl:p-8">
                <div data-auth-panel-block>
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-400">
                    Smart finance
                  </p>
                  <h2 className="mt-3 max-w-[14rem] text-xl font-bold leading-snug text-white xl:text-2xl">
                    {panelTitle}
                  </h2>
                  <p className="mt-2 max-w-[14rem] text-xs leading-relaxed text-slate-400 xl:text-sm">
                    {panelDescription}
                  </p>
                </div>

                <div
                  className="grid grid-cols-3 gap-2 rounded-lg border border-white/15 bg-black/25 p-3"
                  data-auth-panel-block
                >
                  <div className="text-center">
                    <p
                      className="auth-stat-value"
                      data-auth-stat="2.4"
                      data-auth-stat-decimals="1"
                      data-auth-stat-prefix="$"
                      data-auth-stat-suffix="k"
                    >
                      $0k
                    </p>
                    <p className="auth-stat-label">Avg. saved</p>
                  </div>
                  <div className="border-x border-white/15 text-center">
                    <p className="auth-stat-value" data-auth-stat="12">
                      0
                    </p>
                    <p className="auth-stat-label">Categories</p>
                  </div>
                  <div className="text-center">
                    <p className="auth-stat-value" data-auth-stat="98" data-auth-stat-suffix="%">
                      0%
                    </p>
                    <p className="auth-stat-label">On budget</p>
                  </div>
                </div>

                {panelBullets.length > 0 && (
                  <ul className="space-y-2" data-auth-panel-block>
                    {panelBullets.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-slate-200">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <svg className="size-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="font-mono text-[10px] tracking-wider text-slate-500" data-auth-panel-block>
                  TRACK · BUDGET · EXPORT
                </p>
              </div>

              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0"
                data-auth-shimmer
              />
            </aside>
          </div>
        </main>
      </div>
    </AuthMotion>
  );
}
