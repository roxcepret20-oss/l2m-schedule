"use client";

import { useEffect, useRef, useState } from "react";

const THEMES = [
  { value: "simple", label: "Simple" },
  { value: "noka",   label: "Noka"   },
];

export default function ThemeSelector({ theme, onThemeChange }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!mounted) return null;

  const selected = THEMES.find(t => t.value === theme) || THEMES[0];

  return (
    <div className="nav-dropdown" ref={menuRef}>
      <button
        type="button"
        className="nav-dropdown-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <span>{selected.label}</span>
        <span className={`nav-dropdown-caret ${isOpen ? "open" : ""}`} aria-hidden="true">▾</span>
      </button>
      {isOpen && (
        <div className="nav-dropdown-menu" role="menu" aria-label="Select theme">
          {THEMES.map(t => (
            <button
              key={t.value}
              type="button"
              role="menuitemradio"
              aria-checked={t.value === theme}
              className={`nav-dropdown-item ${t.value === theme ? "active" : ""}`}
              onClick={() => { onThemeChange(t.value); setIsOpen(false); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

