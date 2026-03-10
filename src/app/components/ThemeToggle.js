"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");

    const initial =
      saved ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    setTheme(initial);
  }, []);

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