"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./member-menu.module.css";

// Everything a clan member can open. Add a feature here and it shows up in every page's menu.
export const MEMBER_FEATURES = [
  { label: "Schedule", href: "/" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Attendance", href: "/users/attendance" },
];

export default function MemberMenu({ label = "Menu" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function go(href) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button type="button" className={styles.trigger} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {label} <span className={styles.caret} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          {MEMBER_FEATURES.map((feature) => (
            <button key={feature.href} type="button" role="menuitem" className={styles.item} onClick={() => go(feature.href)}>
              {feature.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
