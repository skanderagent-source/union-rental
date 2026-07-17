import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportClientError } from '@/lib/clientMonitoring';

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Catch render errors without exposing stacks, routes, or API payloads to visitors. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    reportClientError('react_render_error', error.message);
    if (import.meta.env.DEV) {
      console.error('Unhandled render error', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state notfound-page" role="alert">
          <h1>Une erreur est survenue</h1>
          <p>Veuillez recharger la page.</p>
          <button type="button" className="btn-hero-p" onClick={() => window.location.reload()}>
            Recharger
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
