import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; title?: string };
type State = { hasError: boolean; message?: string };

export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[FeatureErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="industrial-card p-8 text-center max-w-lg mx-auto my-8">
          <h2 className="text-lg font-semibold">{this.props.title ?? "Error en el módulo"}</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {this.state.message ?? "No se pudo cargar esta sección. Intenta de nuevo."}
          </p>
          <Button className="mt-4" onClick={() => this.setState({ hasError: false, message: undefined })}>
            Reintentar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
