import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import { Workspace } from "./pages/Workspace";
import { MemoryHub } from "./pages/MemoryHub";
import { ControlCenter } from "./pages/ControlCenter";
import { ProjectSelector } from "./pages/ProjectSelector";
import { CommandPalette } from "./components/CommandPalette";

function GlobalShortcuts() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (
                    document.activeElement instanceof HTMLInputElement ||
                    document.activeElement instanceof HTMLTextAreaElement
                ) {
                    document.activeElement.blur();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
    return null;
}

export default function App() {
    return (
        <ErrorBoundary>
            <ToastProvider>
                <BrowserRouter>
                    <GlobalShortcuts />
                    <CommandPalette />
                    <Routes>
                        <Route path="/" element={<Navigate to="/projects" replace />} />
                        <Route path="/projects" element={<ProjectSelector />} />
                        <Route path="/projects/:projectId" element={<Layout />}>
                            <Route index element={<Navigate to="control-center" replace />} />
                            <Route path="control-center" element={<ControlCenter />} />
                            <Route path="workspace" element={<Workspace />} />
                            <Route path="memory" element={<MemoryHub />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </ErrorBoundary>
    );
}
