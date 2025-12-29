import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                {this.props.componentName ? `Error en ${this.props.componentName}` : 'Error de Renderizado'}
              </h3>
              <p className="text-amber-800 mb-3">
                Este componente encontró un error y no pudo renderizarse correctamente. 
                El resto del dashboard sigue funcionando normalmente.
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer text-amber-700 font-medium mb-2">
                  Ver detalles técnicos
                </summary>
                <div className="bg-white rounded p-3 mt-2 font-mono text-xs overflow-auto max-h-40">
                  <p className="text-red-600 font-semibold mb-1">Error:</p>
                  <p className="text-slate-700 mb-3">{this.state.error?.toString()}</p>
                  {this.state.errorInfo && (
                    <>
                      <p className="text-red-600 font-semibold mb-1">Stack:</p>
                      <pre className="text-slate-600 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
              >
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
