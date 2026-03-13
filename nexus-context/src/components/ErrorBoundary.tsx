import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-6">
                    <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/80 p-8 text-center animate-fade-up">
                        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10">
                            <AlertTriangle size={28} className="text-rose-400" />
                        </div>
                        <h2 className="mb-2 text-xl font-bold text-white">Something went wrong</h2>
                        <p className="mb-6 text-sm leading-relaxed text-zinc-400">
                            An unexpected error occurred while rendering this page. You can try again or refresh your browser.
                        </p>
                        {this.state.error && (
                            <div className="mb-6 border border-zinc-800 bg-zinc-950 p-3 text-left">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1">Error Details</div>
                                <pre className="overflow-auto text-xs text-rose-300 whitespace-pre-wrap break-words">
                                    {this.state.error.message}
                                </pre>
                            </div>
                        )}
                        <button
                            onClick={this.handleRetry}
                            className="inline-flex items-center gap-2 bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
                        >
                            <RotateCcw size={14} /> Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
