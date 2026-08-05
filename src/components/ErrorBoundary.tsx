import React from 'react';
import { EmptyState } from './EmptyState';
import { ScreenWrapper } from './ScreenWrapper';
import { reportError } from '@/lib/errorReporting';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level render-time error boundary (§15). Wraps each stack navigator
 * root; feature-critical screens (e.g. the Hifz session) should nest their
 * own instance so one feature crashing doesn't take down the whole tab shell.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  reset = () => this.setState({ hasError: false });

  override render() {
    if (this.state.hasError) {
      return (
        <ScreenWrapper>
          <EmptyState
            variant="error"
            title={this.props.fallbackTitle ?? 'This screen ran into a problem'}
            description="You can try again, or go back and come back later."
            actionLabel="Try again"
            onAction={this.reset}
          />
        </ScreenWrapper>
      );
    }
    return this.props.children;
  }
}
