import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import "./App.css";
import "./styles/design-system.css";

import { ThemeProvider } from "./context/ThemeContext.jsx";
import App from "./App.jsx";
import { seedDefaultCandidatesIfEmpty } from "./utils/candidateRegistry.js";

// Ensure national candidate registry has baseline cohort in browser storage
seedDefaultCandidatesIfEmpty();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <Analytics />
    </ThemeProvider>
  </StrictMode>
);
