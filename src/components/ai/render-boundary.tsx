"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  /** Rendered instead of children after a render error. */
  fallback: (error: Error, reset: () => void) => ReactNode;
  /** When this changes, a failed boundary retries rendering its children. */
  resetKey?: unknown;
  /** Label used in the console report. */
  label?: string;
  children: ReactNode;
};

type State = { error: Error | null };

/**
 * Local error boundary for AI chat content. A bad markdown block, diagram or
 * proposal card degrades to its fallback instead of unmounting the whole
 * conversation (React 19 unmounts the root on uncaught render errors). Errors
 * here never reach the streaming fetch loop — that runs outside React render.
 */
export class RenderBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(
      `[ai] ${this.props.label || "content"} failed to render`,
      error,
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.state.error &&
      !Object.is(prevProps.resetKey, this.props.resetKey)
    ) {
      this.setState({ error: null });
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}
