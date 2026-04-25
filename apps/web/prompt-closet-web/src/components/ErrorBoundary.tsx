"use client";
import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 text-center">
            <p
              className="text-lg font-semibold mb-2"
              style={{ color: "#2B2B2B" }}
            >
              Something went wrong
            </p>
            <p className="text-sm mb-4" style={{ color: "#7A6F68" }}>
              We encountered an unexpected error. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#C9847A" }}
            >
              Reload Page
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
