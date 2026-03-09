import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Workspace } from "./pages/Workspace";
import { MemoryHub } from "./pages/MemoryHub";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Workspace />} />
          <Route path="memory" element={<MemoryHub />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
