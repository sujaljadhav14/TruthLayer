"use client";

import React from "react";

interface State {
  hasError: boolean;
  error?: string;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">
            Component failed to load: {this.state.error}
          </div>
        )
      );
    }
    return this.props.children;
  }
}
