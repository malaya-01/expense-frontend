import { ReactNode } from "react";

type AuthFieldProps = {
  children: ReactNode;
  className?: string;
};

/** Wrapper for staggered field entrance animations */
export function AuthField({ children, className = "" }: AuthFieldProps) {
  return (
    <div data-auth-field className={className}>
      {children}
    </div>
  );
}
