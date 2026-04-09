import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  info: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Mission Control render error:", error, info)
    this.setState({ info })
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            background: "#111827",
            color: "#f9fafb",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Mission Control couldn&apos;t load</h1>
          <p style={{ color: "#9ca3af", marginBottom: "1rem" }}>
            Something threw in the React tree. Open the browser devtools console (F12 → Console) for the full stack.
          </p>
          <pre
            style={{
              padding: "1rem",
              background: "#1f2937",
              borderRadius: "8px",
              overflow: "auto",
              fontSize: "0.8rem",
              color: "#fca5a5",
            }}
          >
            {this.state.error.message}
            {this.state.info?.componentStack ? `\n\n${this.state.info.componentStack}` : ""}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
