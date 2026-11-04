import { Component } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

// If a page crashes while drawing, show a friendly message instead of a blank screen.
// Also catches a page's code failing to download (for example right after a new version is deployed).
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card">
        <div className="empty">
          <span className="empty-icon"><TriangleAlert size={26} /></span>
          <b>Something went wrong on this page</b>
          <p className="muted small">Your data is safe. Try again, or reload the page if the problem continues.</p>
          <div className="page-actions">
            <button type="button" className="btn btn-ghost" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              <RefreshCw size={16} /> Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
