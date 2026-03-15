"use client";

import { Component, ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">
            {this.props.fallbackTitle || "Something went wrong"}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            An error occurred while loading this section. The issue has been
            reported automatically.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
