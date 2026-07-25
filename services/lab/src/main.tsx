import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/base.css";
import LabApp from "./lab/LabApp.tsx";

// Standalone three.js lab: the whole app IS the experiment index. No dev
// gating, no routing tricks — mount LabApp and let it own the page.
createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <LabApp />
    </StrictMode>,
);
