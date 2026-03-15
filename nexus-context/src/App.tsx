import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";

const Workspace = lazy(() => import("./pages/Workspace").then((module) => ({ default: module.Workspace })));
const MemoryHub = lazy(() => import("./pages/MemoryHub").then((module) => ({ default: module.MemoryHub })));
const ControlCenter = lazy(() => import("./pages/ControlCenter").then((module) => ({ default: module.ControlCenter })));
const ProjectSelector = lazy(() => import("./pages/ProjectSelector").then((module) => ({ default: module.ProjectSelector })));
const CommandPalette = lazy(() => import("./components/CommandPalette").then((module) => ({ default: module.CommandPalette })));

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

function AppPageSkeleton() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-400">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-zinc-800 border-t-sky-400" />
        </div>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <ToastProvider>
                <BrowserRouter>
                    <GlobalShortcuts />
                    <Suspense fallback={<AppPageSkeleton />}>
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
                    </Suspense>
                </BrowserRouter>
            </ToastProvider>
        </ErrorBoundary>
    );
}
