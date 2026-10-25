import { Component, type ReactNode } from "react";

/** Last line of defence: a render error shows a recoverable message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto mt-24 max-w-md p-6 text-center">
        <h1 className="text-2xl font-extrabold">Something went wrong.</h1>
        <p className="mt-2 text-muted">The page hit an unexpected error. Your data is safe.</p>
        <button className="btn mt-5" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}
