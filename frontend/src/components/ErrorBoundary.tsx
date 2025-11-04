import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; info?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // Muestra algo en pantalla y en consola
    console.error("ErrorBoundary catch:", error, info);
    this.setState({ info: String(error?.message || error) });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h2>Se produjo un error en la UI</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.info}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
