"use client";

import Link from "next/link";
import { AuthField } from "../_components/AuthField";
import { AuthOAuth } from "../_components/AuthOAuth";
import { AuthShell } from "../_components/AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell
      compact
      title="Create account"
      subtitle="Start tracking in minutes — free to begin."
      panelTitle="Build better money habits"
      panelDescription="Smart categorization and insights to help you spend with intention."
      panelBullets={[
        "Unlimited entries on free plan",
        "Auto category breakdowns",
        "AI insights coming soon",
      ]}
      footer={
        <>
          <span className="auth-muted">Have an account? </span>
          <Link href="/signin" className="auth-link">
            Sign in
          </Link>
        </>
      }
    >
      {/* TODO: onSubmit → POST /auth/register, validate passwords, redirect('/choose-app') */}
      <form
        className="space-y-2.5"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <AuthField>
            <label htmlFor="signup-name" className="auth-label">
              Full name
            </label>
            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              className="auth-input mt-1"
              required
            />
          </AuthField>

          <AuthField>
            <label htmlFor="signup-email" className="auth-label">
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="auth-input mt-1"
              suppressHydrationWarning
              required
            />
          </AuthField>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <AuthField>
            <label htmlFor="signup-password" className="auth-label">
              Password
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="8+ characters"
              className="auth-input mt-1"
              minLength={8}
              required
            />
          </AuthField>

          <AuthField>
            <label htmlFor="signup-confirm" className="auth-label">
              Confirm
            </label>
            <input
              id="signup-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat"
              className="auth-input mt-1"
              minLength={8}
              required
            />
          </AuthField>
        </div>

        <AuthField>
          <label className="flex cursor-pointer items-start gap-2 auth-muted leading-snug">
            <input
              type="checkbox"
              name="terms"
              className="mt-0.5 size-3.5 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
              required
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="auth-link font-normal">
                Terms
              </Link>{" "}
              &{" "}
              <Link href="/privacy" className="auth-link font-normal">
                Privacy
              </Link>
            </span>
          </label>
        </AuthField>

        <AuthField>
          <button type="submit" className="auth-btn-primary">
            Create account
          </button>
        </AuthField>
      </form>

      <AuthOAuth label="or sign up with" />
    </AuthShell>
  );
}
