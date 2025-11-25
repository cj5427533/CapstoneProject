import React from "react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const label = theme.toUpperCase();
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm shadow-sm hover:bg-muted"
      aria-label={`Switch theme (current: ${theme})`}
      title={`Theme: ${label} (click to change)`}
    >
      Theme: {label}
    </button>
  );
}
