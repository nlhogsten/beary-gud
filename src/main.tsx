import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StudioShell } from "./studio/StudioShell";
import "./global.css";

const root = document.getElementById("root");

if (!root) throw new Error("VOXL Studio could not find its application root.");

createRoot(root).render(
  <StrictMode>
    <StudioShell />
  </StrictMode>,
);
