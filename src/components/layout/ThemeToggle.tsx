"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  iconOnly?: boolean;
}

export function ThemeToggle({ iconOnly = false }: ThemeToggleProps) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.getAttribute("data-theme") === "light");
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.setAttribute("data-theme", next ? "light" : "dark");
    try { localStorage.setItem("theme", next ? "light" : "dark"); } catch {}
  }

  if (iconOnly) {
    return (
      <button
        onClick={toggle}
        title={light ? "Switch to dark mode" : "Switch to light mode"}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "36px", height: "36px", borderRadius: "0.5rem",
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-muted)",
          cursor: "pointer", transition: "all 0.15s",
        }}
      >
        {light ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.625rem 0.875rem", borderRadius: "0.625rem",
        fontSize: "0.875rem", fontWeight: 500,
        color: "var(--color-muted)",
        backgroundColor: "transparent",
        border: "none", cursor: "pointer", width: "100%",
        transition: "all 0.15s",
      }}
    >
      {light ? <Moon size={18} /> : <Sun size={18} />}
      {light ? "Dark Mode" : "Light Mode"}
    </button>
  );
}
