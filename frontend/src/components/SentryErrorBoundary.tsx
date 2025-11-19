import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Error } from './Error';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component with Sentry integration
 * Catches React component errors and sends them to Sentry
 */
export class SentryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Send error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Error
          message={
            this.state.error?.message ||
            'Сталася неочікувана помилка. Будь ласка, оновіть сторінку.'
          }
          onRetry={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        />
      );
    }

    return this.props.children;
  }
}


