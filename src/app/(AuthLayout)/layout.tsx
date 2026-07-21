/**
 * Auth route group layout — public pages (sign in, sign up, reset password, etc.)
 * Routes are NOT prefixed: /signin, /signup, …
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
