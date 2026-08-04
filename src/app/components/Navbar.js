"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { MULTI_CLAN_MODE, CLAN_PRIMARY, CLAN_SECONDARY } from "../../lib/featureFlags";

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const navOptions = [
    { value: "all", label: "All Bosses", href: "/" },
    { value: "ffa", label: "FFA", href: "/?view=ffa" },
    ...(MULTI_CLAN_MODE ? [
      { value: CLAN_SECONDARY, label: CLAN_SECONDARY[0].toUpperCase() + CLAN_SECONDARY.slice(1), href: `/?view=${CLAN_SECONDARY}` },
      { value: CLAN_PRIMARY,   label: CLAN_PRIMARY[0].toUpperCase()   + CLAN_PRIMARY.slice(1),   href: `/?view=${CLAN_PRIMARY}` },
    ] : []),
  ];

  const currentView = searchParams.get("view");
  const selectedValue = currentView === "ffa"
    ? "ffa"
    : MULTI_CLAN_MODE && currentView === CLAN_SECONDARY
      ? CLAN_SECONDARY
      : MULTI_CLAN_MODE && currentView === CLAN_PRIMARY
        ? CLAN_PRIMARY
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