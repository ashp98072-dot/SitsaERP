import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { logSupabaseEnvValidation } from "@/lib/supabase-config";
import { isAuthDebugEnabled } from "@/lib/auth-errors";
import { getRouter } from "./router";
import "./styles/styles.css";

if (isAuthDebugEnabled()) {
  logSupabaseEnvValidation();
}

const router = getRouter();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
