import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        cursor: "pointer",
        borderRadius: "8px",
        padding: "0.5rem 1rem",
        border: "1px solid currentColor",
        background: "transparent",
        fontSize: "0.9rem",
      }}
      aria-label="Toggle theme"
    >
      {theme === "light" ? "🌙 Dark mode" : "☀️ Light mode"}
    </button>
  );
}
