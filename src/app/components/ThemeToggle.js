"use client";

import { useEffect, useState } from "react";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      className="theme-toggle"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      style={{ padding: 8, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer" }}
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}