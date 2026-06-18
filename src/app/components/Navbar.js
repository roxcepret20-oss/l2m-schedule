"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const navOptions = [
    { value: "all", label: "All Bosses", href: "/" },
    { value: "ffa", label: "FFA", href: "/?view=ffa" },
    { value: "digimon", label: "Digimon", href: "/?view=digimon" },
    { value: "pokemon", label: "Pokemon Boss", href: "/?view=pokemon" }
  ];

  const currentView = searchParams.get("view");
  const selectedValue = currentView === "ffa"
    ? "ffa"
    : currentView === "digimon"
      ? "digimon"
      : currentView === "pokemon"
        ? "pokemon"
        : "all";

  const selectedOption = navOptions.find((option) => option.value === selectedValue) || navOptions[0];

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) setIsOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="logo">Shatter Company</div>
      <div className="nav-items">
        <div className="nav-dropdown" ref={menuRef}>
          <button
            type="button"
            className="nav-dropdown-trigger"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span>{selectedOption.label}</span>
            <span className={`nav-dropdown-caret ${isOpen ? "open" : ""}`} aria-hidden="true">▾</span>
          </button>

          {isOpen && (
            <div className="nav-dropdown-menu" role="menu" aria-label="Navigate to boss list">
              {navOptions.map((option) => {
                const active = option.value === selectedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`nav-dropdown-item ${active ? "active" : ""}`}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(option.href);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
       <ThemeToggle />
    </nav>
  );
}