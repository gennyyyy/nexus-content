import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import { Workspace } from "./pages/Workspace";
import { MemoryHub } from "./pages/MemoryHub";

export default function App() {
    return (
        <ErrorBoundary>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Workspace />} />
                            <Route path="memory" element={<MemoryHub />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </ErrorBoundary>
    );
}
