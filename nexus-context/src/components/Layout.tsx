import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-950 text-zinc-50 font-sans antialiased selection:bg-sky-500/30 lg:flex-row">
            <Sidebar />
            <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                <div className="relative z-10 h-full w-full overflow-hidden">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
