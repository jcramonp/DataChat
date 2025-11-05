// frontend/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import "./i18n";
import { router } from "./routes";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext";
import SessionGuard from "./components/SessionGuard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        {/* 👇 Guard como hermano, no envuelve al router */}
        <SessionGuard />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
