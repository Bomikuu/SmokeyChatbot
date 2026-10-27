import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Dashboard root element is missing.");

createRoot(rootElement).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
