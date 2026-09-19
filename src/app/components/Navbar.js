"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import VolumeSlider from "./VolumeSlider";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const navOptions = [
    { value: "card", label: "Card", href: "/" },
    { value: "pipeline", label: "Pipeline", href: "/pipeline" },
  ];

  const selectedValue = pathname === "/pipeline" ? "pipeline" : "card";
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
            <div className="nav-dropdown-menu" role="menu" aria-label="Switch page">
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
       <VolumeSlider />
       <ThemeToggle />
    </nav>
  );
}