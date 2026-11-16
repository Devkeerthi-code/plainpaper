"use client";

import { useEffect, useState } from "react";
import { applyTheme, currentTheme, restoreSavedTheme } from "@/lib/client/theme";

export function ThemeToggle() {
  const [label, setLabel] = useState("Switch colour theme");

  useEffect(() => {
    restoreSavedTheme();
    setLabel(currentTheme() === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }, []);

  const toggle = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    setLabel(next === "dark" ? "Switch to light mode" : "Switch to dark mode");
  };

  return (
    <button type="button" className="icon-btn theme-toggle" aria-label={label} title={label} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="i-moon">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="i-sun">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
